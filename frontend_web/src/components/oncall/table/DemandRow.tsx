import React, { useCallback, useMemo } from 'react';
import { Box, Typography, Chip, Tooltip, Divider } from '@mui/material';
import { Assignment, DutyType, OnCallArea } from '../../../types/models';
import { formatDate, isWeekend } from '../../../utils/oncall/dateUtils';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../../utils/oncall/constants';
import { getDutyColor } from '../../../utils/oncall/colorUtils';
import { shiftDefinitionToDutyType } from '../../../utils/oncall/shiftMapping';

interface DemandRowProps {
  dates: Date[];
  assignments: Assignment[];
  viewMode: 'month' | 'week';
  gridTemplateColumns: string;
  employeeColumnWidth: number;
  stickyTop: number;
}

export const DemandRow: React.FC<DemandRowProps> = ({
  dates,
  assignments,
  viewMode,
  gridTemplateColumns,
  employeeColumnWidth,
  stickyTop,
}) => {
  // Check if a duty is assigned for a specific date
  const isDutyAssigned = useCallback((date: Date, dutyType: DutyType, area?: OnCallArea): boolean => {
    const dateStr = formatDate(date);
    return assignments.some((a) => {
      if (!a.shift_instance || !a.shift_definition) return false;
      if (a.shift_instance.date !== dateStr) return false;
      const dutyMapping = shiftDefinitionToDutyType(a.shift_definition);
      return dutyMapping?.dutyType === dutyType && dutyMapping?.area === area;
    });
  }, [assignments]);


  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns,
        position: 'sticky',
        top: stickyTop,
        backgroundColor: 'background.paper',
        zIndex: 1,
        minWidth: 'fit-content',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Employee column header for Bedarf */}
      <Box
        sx={{
          px: viewMode === 'month' ? 1 : 1.5,
          py: 1,
          position: 'sticky',
          left: 0,
          backgroundColor: 'background.paper',
          zIndex: 3,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            fontSize: viewMode === 'month' ? '0.7rem' : '0.75rem',
            letterSpacing: '0.05em',
          }}
        >
          Bedarf
        </Typography>
      </Box>

      {/* Bedarf für jeden Tag */}
      {dates.map((date, idx) => {
        const isWeekendDay = isWeekend(date);
        const availableDuties = isWeekendDay ? WEEKEND_DUTIES : WEEKDAY_DUTIES;
        
        // Separate AW and RB duties for weekend
        let awDuties: typeof availableDuties = [];
        let rbDuties: typeof availableDuties = [];
        
        if (isWeekendDay) {
          awDuties = availableDuties.filter((duty) => duty.type.includes('aw_nursing'));
          rbDuties = availableDuties.filter((duty) => !duty.type.includes('aw_nursing'));
        } else {
          rbDuties = availableDuties;
        }

        const renderDutyChip = (duty: typeof availableDuties[0]) => {
          const isAssigned = isDutyAssigned(date, duty.type, duty.area);
          const statusColor = isAssigned ? '#4caf50' : '#f44336'; // Grün wenn zugewiesen, Rot wenn nicht
          const chipColor = getDutyColor(duty.type, duty.area, isAssigned);
          
          return (
            <Tooltip
              key={`${duty.type}_${duty.area || ''}`}
              title={duty.label}
              arrow
              placement="top"
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  width: '100%',
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                {/* Status Punkt */}
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: statusColor,
                    flexShrink: 0,
                    mt: 0.5,
                  }}
                />
                {/* Chip */}
                <Chip
                  label={duty.label}
                  size="small"
                  sx={{
                    fontSize: viewMode === 'month' ? '0.6rem' : '0.65rem',
                    height: viewMode === 'month' ? 20 : 22,
                    fontWeight: 500,
                    cursor: 'help',
                    bgcolor: chipColor,
                    color: isAssigned ? 'white' : 'text.primary',
                    border: isAssigned ? 'none' : `1px solid ${chipColor}`,
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    '& .MuiChip-label': {
                      px: 0.75,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      display: 'block',
                    },
                  }}
                />
              </Box>
            </Tooltip>
          );
        };
        
        return (
          <Box
            key={date.toISOString()}
            sx={{
              px: viewMode === 'month' ? 0.25 : 0.5,
              py: viewMode === 'month' ? 0.5 : 0.75,
              backgroundColor: isWeekendDay ? 'rgba(255, 152, 0, 0.08)' : 'transparent',
              borderRight: idx < dates.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {isWeekendDay ? (
              <>
                {/* AW Duties Section */}
                {awDuties.map((duty) => renderDutyChip(duty))}
                {awDuties.length > 0 && rbDuties.length > 0 && (
                  <Divider
                    sx={{
                      my: 0.25,
                      width: '100%',
                      borderColor: 'divider',
                      opacity: 0.5,
                    }}
                  />
                )}
                {/* RB Duties Section */}
                {rbDuties.map((duty) => renderDutyChip(duty))}
              </>
            ) : (
              // Weekday: show all duties without separation
              availableDuties.map((duty) => renderDutyChip(duty))
            )}
          </Box>
        );
      })}
    </Box>
  );
};

