import React, { useMemo } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Assignment, DutyType, OnCallArea } from '../../../types/models';
import { getDutyColor } from '../../../utils/oncall/colorUtils';
import { isWeekend, isToday, formatDate } from '../../../utils/oncall/dateUtils';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../../utils/oncall/constants';
import { shiftDefinitionToDutyType } from '../../../utils/oncall/shiftMapping';

interface EmployeeTableCellProps {
  date: Date;
  employeeId: number;
  assignments: Assignment[];
  onClick: () => void;
}

export const EmployeeTableCell: React.FC<EmployeeTableCellProps> = ({
  date,
  employeeId,
  assignments,
  onClick,
}) => {
  const isWeekendDay = isWeekend(date);
  const isTodayDate = isToday(date);
  const availableDuties = isWeekendDay ? WEEKEND_DUTIES : WEEKDAY_DUTIES;

  // Filter assignments for this employee and date
  const employeeAssignments = useMemo(() => {
    const dateStr = formatDate(date);
    return assignments.filter((assignment) => {
      if (!assignment.shift_instance || assignment.employee_id !== employeeId) {
        return false;
      }
      return assignment.shift_instance.date === dateStr;
    });
  }, [assignments, employeeId, date]);

  // Group assignments by duty
  const dutyAssignments = useMemo(() => {
    const map = new Map<string, Assignment>();
    employeeAssignments.forEach((assignment) => {
      if (!assignment.shift_definition) return;
      const dutyMapping = shiftDefinitionToDutyType(assignment.shift_definition);
      if (!dutyMapping) return;
      const key = `${dutyMapping.dutyType}_${dutyMapping.area || ''}`;
      map.set(key, assignment);
    });
    return map;
  }, [employeeAssignments]);

  // Get chips for all duties (showing active ones)
  const dutyChips = availableDuties.map((duty) => {
    const key = `${duty.type}_${duty.area || ''}`;
    const assignment = dutyAssignments.get(key);
    const isSelected = !!assignment;
    const dutyColor = getDutyColor(duty.type, duty.area, isSelected);

    if (!isSelected) return null;

    return (
      <Chip
        key={key}
        label={duty.shortLabel}
        size="small"
        sx={{
          height: 16,
          fontSize: '0.55rem',
          fontWeight: 600,
          bgcolor: dutyColor,
          color: 'white',
          maxWidth: '100%',
          '& .MuiChip-label': {
            px: 0.4,
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      />
    );
  }).filter(Boolean);

  const hasAnyAssignment = dutyChips.length > 0;

  return (
    <Tooltip
      title={`${date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })} - Klicken zum Bearbeiten`}
      arrow
    >
      <Box
        onClick={onClick}
        sx={{
          minHeight: 45,
          width: '100%',
          maxWidth: '100%',
          p: 0.4,
          border: '1px solid',
          borderColor: isTodayDate ? 'primary.main' : 'divider',
          backgroundColor: isTodayDate
            ? 'action.selected'
            : isWeekendDay
            ? 'action.hover'
            : hasAnyAssignment
            ? 'background.paper'
            : 'action.hover',
          borderRadius: 0.75,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.15,
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box',
          '&:hover': {
            backgroundColor: isWeekendDay ? 'action.selected' : 'action.hover',
            borderColor: 'primary.main',
            boxShadow: 1,
            '& .add-icon': {
              opacity: 1,
            },
          },
        }}
      >
        {hasAnyAssignment && (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              width: '100%',
              maxWidth: '100%',
              gap: 0.25,
              overflow: 'hidden',
            }}
          >
            {dutyChips}
          </Box>
        )}
        <AddIcon
          className="add-icon"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '1.2rem',
            color: 'text.disabled',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      </Box>
    </Tooltip>
  );
};

