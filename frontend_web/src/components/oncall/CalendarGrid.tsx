import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { OnCallAssignment, DutyType, OnCallArea } from '../../types/models';
import { getCalendarDays, getWeekDays, isWeekend, formatDate, getCalendarWeek } from '../../utils/oncall/dateUtils';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES, WEEK_DAYS } from '../../utils/oncall/constants';
import { CalendarDay } from './CalendarDay';

interface CalendarGridProps {
  viewMode: 'month' | 'week';
  currentDate: Date;
  assignmentsMap: Map<string, OnCallAssignment>;
  onDutyClick: (date: Date, duty: { type: DutyType; area?: OnCallArea }) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  viewMode,
  currentDate,
  assignmentsMap,
  onDutyClick,
}) => {
  const displayDates = viewMode === 'month' ? getCalendarDays(currentDate) : getWeekDays(currentDate);

  // Group dates by week for month view
  const weeks = useMemo(() => {
    if (viewMode !== 'month') return [];
    
    const weeks: Array<Array<Date | null>> = [];
    let currentWeek: Array<Date | null> = [];
    
    displayDates.forEach((date, idx) => {
      currentWeek.push(date);
      
      // Every 7 days, start a new week
      if ((idx + 1) % 7 === 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Add remaining days if any
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [displayDates, viewMode]);

  const getDateAssignments = (date: Date) => {
    const dateStr = formatDate(date);
    const isWeekendDay = isWeekend(date);
    const duties = isWeekendDay ? WEEKEND_DUTIES : WEEKDAY_DUTIES;

    return duties.map((duty) => {
      const key = `${dateStr}_${duty.type}_${duty.area || ''}`;
      const assignment = assignmentsMap.get(key);
      return { duty, assignment };
    });
  };

  // Get calendar week for a date (use Monday of the week)
  const getWeekCalendarWeek = (week: Array<Date | null>): number | null => {
    const monday = week.find(d => d !== null && d.getDay() === 1); // Monday
    if (monday) {
      return getCalendarWeek(monday);
    }
    // If no Monday found, use first non-null date
    const firstDate = week.find(d => d !== null);
    if (firstDate) {
      return getCalendarWeek(firstDate);
    }
    return null;
  };

  if (viewMode === 'month') {
    return (
      <Box>
        {/* Weekday headers */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto repeat(7, 1fr)',
            gap: 1,
            mb: 1,
          }}
        >
          {/* Empty cell for KW column */}
          <Box />
          {WEEK_DAYS.map((day) => (
            <Box
              key={day}
              sx={{
                textAlign: 'center',
                fontWeight: 600,
                py: 1.5,
                fontSize: '0.75rem',
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {day}
            </Box>
          ))}
        </Box>

        {/* Calendar days grouped by week */}
        {weeks.map((week, weekIdx) => {
          const kw = getWeekCalendarWeek(week);
          
          return (
            <Box
              key={weekIdx}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto repeat(7, 1fr)',
                gap: 1,
                width: '100%',
                mb: 1,
                '&:last-child': {
                  mb: 0,
                },
              }}
            >
              {/* KW column */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 1,
                  minWidth: '40px',
                }}
              >
                {kw !== null && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}
                  >
                    KW {kw}
                  </Typography>
                )}
              </Box>
              
              {/* Days of the week */}
              {week.map((date, dayIdx) => {
                if (date === null) {
                  return <Box key={`empty-${weekIdx}-${dayIdx}`} />;
                }

                const dateAssignments = getDateAssignments(date);

                return (
                  <CalendarDay
                    key={formatDate(date)}
                    date={date}
                    assignments={dateAssignments}
                    onDutyClick={onDutyClick}
                  />
                );
              })}
            </Box>
          );
        })}
      </Box>
    );
  }

  // Week view (unchanged)
  return (
    <Box>
      {/* Weekday headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          mb: 1,
        }}
      >
        {WEEK_DAYS.map((day) => (
          <Box
            key={day}
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              py: 1.5,
              fontSize: '0.75rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {day}
          </Box>
        ))}
      </Box>

      {/* Calendar days */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          width: '100%',
        }}
      >
        {displayDates.map((date, idx) => {
          if (date === null) {
            return <Box key={`empty-${idx}`} />;
          }

          const dateAssignments = getDateAssignments(date);

          return (
            <CalendarDay
              key={formatDate(date)}
              date={date}
              assignments={dateAssignments}
              onDutyClick={onDutyClick}
            />
          );
        })}
      </Box>
    </Box>
  );
};

