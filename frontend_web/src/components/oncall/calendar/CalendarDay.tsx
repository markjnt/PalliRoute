import React, { useMemo } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { OnCallAssignment, DutyType, OnCallArea } from '../../../types/models';
import { isToday, isWeekend } from '../../../utils/oncall/dateUtils';
import { DutyChip } from './DutyChip';

interface CalendarDayProps {
  date: Date;
  assignments: Array<{ duty: { type: DutyType; label: string; area?: OnCallArea; shortLabel: string }; assignment?: OnCallAssignment }>;
  onDutyClick: (date: Date, duty: { type: DutyType; area?: OnCallArea }) => void;
}

export const CalendarDay: React.FC<CalendarDayProps> = ({ date, assignments, onDutyClick }) => {
  const isWeekendDay = isWeekend(date);
  const isTodayDate = isToday(date);

  // Separate AW and RB duties for weekend
  const { awDuties, rbDuties } = useMemo(() => {
    if (!isWeekendDay) {
      return { awDuties: [], rbDuties: assignments };
    }
    
    const aw = assignments.filter(({ duty }) => duty.type.includes('aw_nursing'));
    const rb = assignments.filter(({ duty }) => !duty.type.includes('aw_nursing'));
    
    return { awDuties: aw, rbDuties: rb };
  }, [assignments, isWeekendDay]);

  return (
    <Box
      sx={{
        minHeight: '200px',
        width: '100%',
        border: isTodayDate ? '2px solid' : '1px solid',
        borderColor: isTodayDate ? 'primary.main' : 'divider',
        borderRadius: 2,
        backgroundColor: isWeekendDay ? 'action.hover' : 'background.paper',
        p: 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.light',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: isTodayDate ? 700 : 500,
            color: isTodayDate ? 'primary.main' : 'text.primary',
            fontSize: '0.875rem',
          }}
        >
          {date.getDate()}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {isWeekendDay ? (
          <>
            {/* AW Duties Section */}
            {awDuties.length > 0 && (
              <>
                {awDuties.map(({ duty, assignment }, idx) => (
                  <DutyChip
                    key={`aw-${idx}`}
                    duty={duty}
                    assignment={assignment}
                    onClick={() => onDutyClick(date, duty)}
                  />
                ))}
                {rbDuties.length > 0 && (
                  <Divider
                    sx={{
                      my: 0.5,
                      borderColor: 'divider',
                      opacity: 0.5,
                    }}
                  />
                )}
              </>
            )}
            {/* RB Duties Section */}
            {rbDuties.map(({ duty, assignment }, idx) => (
              <DutyChip
                key={`rb-${idx}`}
                duty={duty}
                assignment={assignment}
                onClick={() => onDutyClick(date, duty)}
              />
            ))}
          </>
        ) : (
          // Weekday: show all duties without separation
          assignments.map(({ duty, assignment }, idx) => (
            <DutyChip
              key={idx}
              duty={duty}
              assignment={assignment}
              onClick={() => onDutyClick(date, duty)}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

