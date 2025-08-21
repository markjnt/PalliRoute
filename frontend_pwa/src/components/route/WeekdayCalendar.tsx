import React from 'react';
import { Box, Typography } from '@mui/material';
import { useWeekdayStore, Weekday } from '../../stores/useWeekdayStore';

/**
 * Apple-style weekday calendar component
 */
export const WeekdayCalendar: React.FC = () => {
  const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();

  const weekdays: { day: Weekday; shortLabel: string }[] = [
    { day: 'monday', shortLabel: 'Mo' },
    { day: 'tuesday', shortLabel: 'Di' },
    { day: 'wednesday', shortLabel: 'Mi' },
    { day: 'thursday', shortLabel: 'Do' },
    { day: 'friday', shortLabel: 'Fr' },
  ];

  const handleDaySelect = (day: Weekday) => {
    setSelectedWeekday(day);
  };

  // Get current weekday and check if it's a weekday
  const getCurrentWeekday = () => {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekdayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = weekdayMap[today] as Weekday;
    
    // Only return if it's a weekday (Monday-Friday)
    if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(currentDay)) {
      return currentDay;
    }
    return null;
  };

  const currentWeekday = getCurrentWeekday();

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
      }}
    >
      {weekdays.map((weekday) => (
        <Box
          key={weekday.day}
          onClick={() => handleDaySelect(weekday.day)}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: 48,
            borderRadius: '12px',
            backgroundColor: selectedWeekday === weekday.day 
              ? '#007AFF' 
              : 'rgba(0, 0, 0, 0.04)',
            color: selectedWeekday === weekday.day ? 'white' : '#1d1d1f',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            position: 'relative',
            mx: 0.5,
            '&:hover': {
              backgroundColor: selectedWeekday === weekday.day 
                ? '#0056CC' 
                : 'rgba(0, 0, 0, 0.08)',
              transform: 'scale(1.02)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: currentWeekday === weekday.day ? 700 : 600,
              fontSize: currentWeekday === weekday.day ? '0.8rem' : '0.75rem',
              lineHeight: 1,
              color: currentWeekday === weekday.day && selectedWeekday !== weekday.day ? '#007AFF' : 'inherit',
            }}
          >
            {weekday.shortLabel}
          </Typography>
          
          {/* Current day indicator */}
          {currentWeekday === weekday.day && (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: selectedWeekday === weekday.day ? 'white' : '#007AFF',
                position: 'absolute',
                bottom: 4,
                border: selectedWeekday !== weekday.day ? '1px solid rgba(0, 122, 255, 0.2)' : 'none',
                boxShadow: selectedWeekday !== weekday.day ? '0 2px 4px rgba(0, 122, 255, 0.3)' : 'none',
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}; 