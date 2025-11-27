import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import { ViewMode } from '../../stores/useOnCallPlanningStore';
import { getCalendarWeek, formatMonthYear } from '../../utils/oncall/dateUtils';

interface DatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  currentDate: Date;
  onSelectDate: (date: Date) => void;
}

export const DatePickerDialog: React.FC<DatePickerDialogProps> = ({
  open,
  onClose,
  viewMode,
  currentDate,
  onSelectDate,
}) => {
  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentKW = getCalendarWeek(currentDate);

  // Generate months for the current year
  const months = useMemo(() => {
    const monthNames = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];
    return monthNames.map((name, index) => ({
      name,
      index,
      date: new Date(currentYear, index, 1),
    }));
  }, [currentYear]);

  // Generate calendar weeks for the current year
  const calendarWeeks = useMemo(() => {
    const weeks: Array<{ week: number; startDate: Date; endDate: Date }> = [];
    const seenWeeks = new Set<number>();
    
    // Start from January 1st and find the first Monday
    const firstDay = new Date(currentYear, 0, 1);
    const dayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
    const firstMonday = new Date(firstDay);
    firstMonday.setDate(firstDay.getDate() - dayOfWeek);
    
    // Generate weeks starting from the first Monday
    for (let i = 0; i < 54; i++) {
      const startDate = new Date(firstMonday);
      startDate.setDate(firstMonday.getDate() + i * 7);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      const week = getCalendarWeek(startDate);
      
      // Only include weeks that belong to the current year and haven't been seen
      if (!seenWeeks.has(week) && (startDate.getFullYear() === currentYear || endDate.getFullYear() === currentYear)) {
        seenWeeks.add(week);
        weeks.push({ week, startDate, endDate });
      }
      
      // Stop if we have 52 weeks
      if (weeks.length >= 52) break;
    }
    
    return weeks.sort((a, b) => a.week - b.week);
  }, [currentYear]);

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(currentYear, monthIndex, 1);
    onSelectDate(newDate);
    onClose();
  };

  const handleWeekSelect = (week: number, startDate: Date) => {
    onSelectDate(startDate);
    onClose();
  };

  const isCurrentMonth = (monthIndex: number) => {
    return (
      monthIndex === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isCurrentWeek = (week: number) => {
    return week === getCalendarWeek(today) && currentYear === today.getFullYear();
  };

  const isSelectedMonth = (monthIndex: number) => {
    return monthIndex === currentMonth;
  };

  const isSelectedWeek = (week: number) => {
    return week === currentKW;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {viewMode === 'month' ? 'Monat auswählen' : 'Kalenderwoche auswählen'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Jahr: {currentYear}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {viewMode === 'month' ? (
          <Grid container spacing={1}>
            {months.map(({ name, index, date }) => {
              const isCurrent = isCurrentMonth(index);
              const isSelected = isSelectedMonth(index);
              
              return (
                <Grid size={{ xs: 4 }} key={index}>
                  <Button
                    fullWidth
                    onClick={() => handleMonthSelect(index)}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: isSelected ? 600 : 500,
                      backgroundColor: isSelected
                        ? 'primary.main'
                        : isCurrent
                        ? 'rgba(76, 175, 80, 0.15)'
                        : 'transparent',
                      color: isSelected
                        ? 'primary.contrastText'
                        : isCurrent
                        ? '#2e7d32'
                        : 'text.primary',
                      border: isSelected
                        ? '2px solid'
                        : isCurrent
                        ? '2px solid'
                        : '1px solid',
                      borderColor: isSelected
                        ? 'primary.main'
                        : isCurrent
                        ? '#4caf50'
                        : 'divider',
                      '&:hover': {
                        backgroundColor: isSelected
                          ? 'primary.dark'
                          : isCurrent
                          ? 'rgba(76, 175, 80, 0.25)'
                          : 'action.hover',
                        color: isSelected
                          ? 'primary.contrastText'
                          : isCurrent
                          ? '#1b5e20'
                          : 'text.primary',
                      },
                    }}
                  >
                    {name}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box
            sx={{
              maxHeight: '400px',
              overflow: 'auto',
            }}
          >
            <Grid container spacing={1}>
              {calendarWeeks.map(({ week, startDate, endDate }) => {
                const isCurrent = isCurrentWeek(week);
                const isSelected = isSelectedWeek(week);
                
                return (
                  <Grid size={{ xs: 6, sm: 4 }} key={week}>
                    <Button
                      fullWidth
                      onClick={() => handleWeekSelect(week, startDate)}
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: isSelected ? 600 : 500,
                        backgroundColor: isSelected
                          ? 'primary.main'
                          : isCurrent
                          ? 'rgba(76, 175, 80, 0.15)'
                          : 'transparent',
                        color: isSelected
                          ? 'primary.contrastText'
                          : isCurrent
                          ? '#2e7d32'
                          : 'text.primary',
                        border: isSelected
                          ? '2px solid'
                          : isCurrent
                          ? '2px solid'
                          : '1px solid',
                        borderColor: isSelected
                          ? 'primary.main'
                          : isCurrent
                          ? '#4caf50'
                          : 'divider',
                        '&:hover': {
                          backgroundColor: isSelected
                            ? 'primary.dark'
                            : isCurrent
                            ? 'rgba(76, 175, 80, 0.25)'
                            : 'action.hover',
                          color: isSelected
                            ? 'primary.contrastText'
                            : isCurrent
                            ? '#1b5e20'
                            : 'text.primary',
                        },
                      }}
                    >
                      <Box sx={{ textAlign: 'center', width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'inherit' }}>
                          KW {week}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontSize: '0.7rem',
                            opacity: 0.8,
                          }}
                        >
                          {startDate.toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                          })}{' '}
                          -{' '}
                          {endDate.toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </Typography>
                      </Box>
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

