import React, { useState } from 'react';
import { Box, Typography, IconButton, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  EditCalendar as EditCalendarIcon,
  CalendarMonth as CalendarMonthIcon,
  DateRange as DateRangeIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOnCallPlanningStore } from '../../stores/useOnCallPlanningStore';
import { formatMonthYear, formatWeekWithKW } from '../../utils/oncall/dateUtils';
import { DatePickerDialog } from './DatePickerDialog';

interface CalendarHeaderProps {
  actualDates: Date[];
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ actualDates }) => {
  const { viewMode, currentDate, setViewMode, setCurrentDate, goToPrevious, goToNext, goToToday } = useOnCallPlanningStore();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 4,
        px: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          onClick={() => navigate('/')}
          size="small"
          sx={{
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          RB & AW Planung
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid',
              borderColor: 'divider',
              px: 1.5,
              py: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            },
          }}
        >
          <ToggleButton value="month">
            <CalendarMonthIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="week">
            <DateRangeIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            ml: 2,
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            backgroundColor: 'background.default',
          }}
        >
          <IconButton
            onClick={goToPrevious}
            size="small"
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          <IconButton
            onClick={() => setDatePickerOpen(true)}
            size="small"
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <EditCalendarIcon fontSize="small" />
          </IconButton>

          <IconButton
            onClick={goToNext}
            size="small"
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>

          <Typography
            variant="body1"
            sx={{
              minWidth: '220px',
              textAlign: 'center',
              fontWeight: 500,
              ml: 1,
            }}
          >
            {viewMode === 'month'
              ? formatMonthYear(currentDate)
              : formatWeekWithKW(actualDates)}
          </Typography>
        </Box>
      </Box>

      <DatePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        viewMode={viewMode}
        currentDate={currentDate}
        onSelectDate={setCurrentDate}
      />
    </Box>
  );
};

