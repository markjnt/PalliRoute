import React, { useState } from 'react';
import { Box, Typography, IconButton, ToggleButton, ToggleButtonGroup, Button } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  EditCalendar as EditCalendarIcon,
  CalendarMonth as CalendarMonthIcon,
  DateRange as DateRangeIcon,
  ArrowBack as ArrowBackIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOnCallPlanningStore } from '../../../stores/useOnCallPlanningStore';
import { formatMonthYear, formatWeekWithKW } from '../../../utils/oncall/dateUtils';
import { DatePickerDialog } from '../dialogs/DatePickerDialog';
import { AutoPlanningDialog } from '../dialogs/AutoPlanningDialog';
import type { AutoPlanningSettings } from '../dialogs/AutoPlanningDialog';

interface CalendarHeaderProps {
  actualDates: Date[];
  onAutoPlanningStart?: (settings: AutoPlanningSettings) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ actualDates, onAutoPlanningStart }) => {
  const { viewMode, currentDate, setViewMode, setCurrentDate, goToPrevious, goToNext, goToToday } = useOnCallPlanningStore();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [autoPlanningOpen, setAutoPlanningOpen] = useState(false);
  const navigate = useNavigate();

  const handleAutoPlanningStart = (settings: AutoPlanningSettings) => {
    if (onAutoPlanningStart) {
      onAutoPlanningStart(settings);
    }
  };

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton
          onClick={() => navigate('/')}
          size="small"
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            color: 'text.primary',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontSize: '1.5rem',
          }}
        >
          RB & AW Planung
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Button
          variant="contained"
          startIcon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
          onClick={() => setAutoPlanningOpen(true)}
          size="small"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
            py: 1,
            borderRadius: 2.5,
            backgroundColor: 'primary.main',
            color: 'white',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
            border: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'primary.dark',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.35)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 2px 6px rgba(25, 118, 210, 0.3)',
            },
          }}
        >
          Automatische Planung
        </Button>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
          sx={{
            ml: 0.5,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            borderRadius: 2.5,
            padding: 0.5,
            '& .MuiToggleButton-root': {
              border: 'none',
              borderRadius: 2,
              px: 1.5,
              py: 0.75,
              minWidth: 40,
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
              },
              '&.Mui-selected': {
                backgroundColor: 'white',
                color: 'primary.main',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  backgroundColor: 'white',
                },
              },
            },
          }}
        >
          <ToggleButton value="month">
            <CalendarMonthIcon sx={{ fontSize: 18 }} />
          </ToggleButton>
          <ToggleButton value="week">
            <DateRangeIcon sx={{ fontSize: 18 }} />
          </ToggleButton>
        </ToggleButtonGroup>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            ml: 1.5,
            px: 1.5,
            py: 0.75,
            borderRadius: 2.5,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.06)',
          }}
        >
          <IconButton
            onClick={goToPrevious}
            size="small"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              color: 'text.primary',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                transform: 'scale(1.1)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <IconButton
            onClick={() => setDatePickerOpen(true)}
            size="small"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              color: 'text.primary',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                transform: 'scale(1.1)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <EditCalendarIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <IconButton
            onClick={goToNext}
            size="small"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              color: 'text.primary',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                transform: 'scale(1.1)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <Typography
            variant="body1"
            sx={{
              minWidth: '220px',
              textAlign: 'center',
              fontWeight: 500,
              ml: 1.5,
              fontSize: '0.95rem',
              color: 'text.primary',
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

      <AutoPlanningDialog
        open={autoPlanningOpen}
        onClose={() => setAutoPlanningOpen(false)}
        onStart={handleAutoPlanningStart}
        currentDate={currentDate}
      />
    </Box>
  );
};

