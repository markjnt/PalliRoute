import React, { useMemo, useState, useCallback } from 'react';
import { Box, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Assignment } from '../../../types/models';
import { getDutyColor } from '../../../utils/oncall/colorUtils';
import { isWeekend, isToday, formatDate } from '../../../utils/oncall/dateUtils';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../../utils/oncall/constants';
import { shiftDefinitionToDutyType } from '../../../utils/oncall/shiftMapping';
import {
  clearAssignmentDragPayload,
  getAssignmentDragPayload,
  setAssignmentDragPayload,
} from './assignmentDragPayload';

interface EmployeeTableCellProps {
  date: Date;
  employeeId: number;
  assignments: Assignment[];
  /** Mo–Fr-Feiertag: wie Wochenend-Zelle (Duties/Farben). */
  weekendLayout?: boolean;
  onClick: () => void;
  onMoveAssignment: (assignmentId: number, targetEmployeeId: number, sourceDate: string, targetDate: string) => Promise<void>;
}

export const EmployeeTableCell: React.FC<EmployeeTableCellProps> = ({
  date,
  employeeId,
  assignments,
  weekendLayout = false,
  onClick,
  onMoveAssignment,
}) => {
  const isWeekendDay = weekendLayout || isWeekend(date);
  const isTodayDate = isToday(date);
  const [isDragOver, setIsDragOver] = useState(false);
  const dateStr = useMemo(() => formatDate(date), [date]);
  const availableDuties = isWeekendDay ? WEEKEND_DUTIES : WEEKDAY_DUTIES;

  // Filter assignments for this employee and date
  const employeeAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (!assignment.shift_instance || assignment.employee_id !== employeeId) {
        return false;
      }
      return assignment.shift_instance.date === dateStr;
    });
  }, [assignments, employeeId, dateStr]);

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

  const handleDragStart = useCallback(
    (event: React.DragEvent, assignmentId: number) => {
      event.stopPropagation();
      setAssignmentDragPayload({ assignmentId, sourceDate: dateStr });
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          assignmentId,
          sourceDate: dateStr,
        })
      );
    },
    [dateStr]
  );

  const handleDragEnd = useCallback(() => {
    clearAssignmentDragPayload();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      // Browsers do not expose getData() during dragover; use module payload instead.
      const payload = getAssignmentDragPayload();
      if (!payload) return;

      if (payload.sourceDate !== dateStr) {
        setIsDragOver(false);
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    },
    [dateStr]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      const rawData = event.dataTransfer.getData('application/json');
      if (!rawData) {
        clearAssignmentDragPayload();
        return;
      }

      try {
        const parsed = JSON.parse(rawData) as { assignmentId?: number; sourceDate?: string };
        if (!parsed.assignmentId || !parsed.sourceDate) {
          return;
        }
        await onMoveAssignment(parsed.assignmentId, employeeId, parsed.sourceDate, dateStr);
      } catch {
        // Ignore malformed drag payloads.
      } finally {
        clearAssignmentDragPayload();
      }
    },
    [dateStr, employeeId, onMoveAssignment]
  );

  // Get chips for all duties (showing active ones)
  const dutyChips = availableDuties
    .map((duty) => {
      const key = `${duty.type}_${duty.area || ''}`;
      const assignment = dutyAssignments.get(key);
      const isSelected = !!assignment;
      const dutyColor = getDutyColor(duty.type, duty.area, isSelected);

      if (!isSelected || !assignment?.id) return null;

      return (
        <Chip
          key={key}
          label={duty.shortLabel}
          size="small"
          draggable
          onDragStart={(event) => handleDragStart(event, assignment.id as number)}
          onDragEnd={handleDragEnd}
          sx={{
            height: 16,
            fontSize: '0.55rem',
            fontWeight: 600,
            bgcolor: dutyColor,
            color: 'white',
            cursor: 'grab',
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
    })
    .filter(Boolean);

  const hasAnyAssignment = dutyChips.length > 0;

  return (
    <Box
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        minHeight: 45,
        width: '100%',
        maxWidth: '100%',
        p: 0.4,
        border: '1px solid',
        borderColor: isDragOver ? 'primary.main' : isTodayDate ? 'primary.main' : 'divider',
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
        ...(isDragOver && {
          borderColor: 'primary.main',
          backgroundColor: 'action.selected',
          boxShadow: 2,
          transform: 'scale(1.005)',
        }),
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
      {!hasAnyAssignment && (
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
      )}
    </Box>
  );
};

