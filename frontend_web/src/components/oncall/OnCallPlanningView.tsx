import React, { useMemo, useState, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useOnCallPlanningStore } from '../../stores/useOnCallPlanningStore';
import {
  useOnCallAssignments,
  useCreateOnCallAssignment,
  useUpdateOnCallAssignment,
  useDeleteOnCallAssignment,
  useAllEmployeesCapacity,
} from '../../services/queries/useOnCallAssignments';
import { useEmployees } from '../../services/queries/useEmployees';
import { OnCallAssignment, DutyType, OnCallArea, Employee } from '../../types/models';
import { OnCallAssignmentsQueryParams } from '../../services/api/oncallAssignments';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { AssignmentDialog } from './dialogs/AssignmentDialog';
import { CapacityOverview } from './capacity/CapacityOverview';
import { formatDate, getCalendarDays, getWeekDays } from '../../utils/oncall/dateUtils';
import { isWeekend } from '../../utils/oncall/dateUtils';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../utils/oncall/constants';
import type { AutoPlanningSettings } from './dialogs/AutoPlanningDialog';

export const OnCallPlanningView: React.FC = () => {
  const { viewMode, currentDate } = useOnCallPlanningStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDuty, setSelectedDuty] = useState<{ type: DutyType; area?: OnCallArea } | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  // Get dates to display
  const displayDates = useMemo(() => {
    if (viewMode === 'month') {
      return getCalendarDays(currentDate);
    } else {
      return getWeekDays(currentDate);
    }
  }, [viewMode, currentDate]);

  // Get actual dates (filter out nulls)
  const actualDates = useMemo(() => {
    const dates = displayDates.filter((d): d is Date => d !== null);
    if (dates.length === 0) return [];
    return dates;
  }, [displayDates]);

  // Build query params
  const queryParams: OnCallAssignmentsQueryParams = useMemo(() => {
    if (actualDates.length === 0) return {};
    const startDate = formatDate(actualDates[0]);
    const endDate = formatDate(actualDates[actualDates.length - 1]);
    return { start_date: startDate, end_date: endDate };
  }, [actualDates]);

  // Fetch data
  const { data: assignments = [], isLoading: assignmentsLoading } = useOnCallAssignments(queryParams);
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: allEmployeesCapacity } = useAllEmployeesCapacity(currentDate.getMonth() + 1, currentDate.getFullYear());
  const createAssignment = useCreateOnCallAssignment();
  const updateAssignment = useUpdateOnCallAssignment();
  const deleteAssignment = useDeleteOnCallAssignment();

  // Create a map of assignments by date and duty
  const assignmentsMap = useMemo(() => {
    const map = new Map<string, OnCallAssignment>();
    assignments.forEach((assignment) => {
      const key = `${assignment.date}_${assignment.duty_type}_${assignment.area || ''}`;
      map.set(key, assignment);
    });
    return map;
  }, [assignments]);

  // Get assignment for a specific date, duty type, and area
  const getAssignment = useCallback(
    (date: Date, dutyType: DutyType, area?: OnCallArea): OnCallAssignment | undefined => {
      const key = `${formatDate(date)}_${dutyType}_${area || ''}`;
      return assignmentsMap.get(key);
    },
    [assignmentsMap]
  );

  // Filter employees by function only (no area filter)
  const getAvailableEmployees = useCallback(
    (dutyType: DutyType, area?: OnCallArea): Employee[] => {
      return employees.filter((emp) => {
        // Check function only (no area filter)
        if (dutyType.includes('doctors')) {
          return emp.function === 'Arzt' || emp.function === 'Honorararzt';
        } else {
          return emp.function === 'Pflegekraft' || emp.function === 'PDL';
        }
      });
    },
    [employees]
  );

  // Handle duty click
  const handleDutyClick = useCallback(
    (date: Date, duty: { type: DutyType; area?: OnCallArea }) => {
      setSelectedDate(date);
      setSelectedDuty(duty);
      setAssignmentDialogOpen(true);
    },
    []
  );

  // Handle employee selection
  const handleEmployeeChange = useCallback(
    async (employeeId: number | '') => {
      if (!selectedDate || !selectedDuty) return;

      const dateStr = formatDate(selectedDate);
      const existing = getAssignment(selectedDate, selectedDuty.type, selectedDuty.area);

      if (employeeId === '') {
        // Delete assignment
        if (existing?.id) {
          await deleteAssignment.mutateAsync(existing.id);
        }
      } else {
        if (existing?.id) {
          // Update existing
          await updateAssignment.mutateAsync({
            id: existing.id,
            assignmentData: { employee_id: employeeId as number },
          });
        } else {
          // Create new
          await createAssignment.mutateAsync({
            employee_id: employeeId as number,
            date: dateStr,
            duty_type: selectedDuty.type,
            area: selectedDuty.area,
          });
        }
      }

      setAssignmentDialogOpen(false);
      setSelectedDate(null);
      setSelectedDuty(null);
    },
    [selectedDate, selectedDuty, getAssignment, createAssignment, updateAssignment, deleteAssignment]
  );

  const handleDialogClose = useCallback(() => {
    setAssignmentDialogOpen(false);
    setSelectedDate(null);
    setSelectedDuty(null);
  }, []);

  const handleAutoPlanningStart = useCallback((settings: AutoPlanningSettings) => {
    // TODO: Implement auto planning logic
    console.log('Auto planning started with settings:', settings);
    // This will be implemented when backend API is ready
  }, []);

  if (assignmentsLoading || employeesLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const currentAssignment = selectedDate && selectedDuty
    ? getAssignment(selectedDate, selectedDuty.type, selectedDuty.area)
    : undefined;

  const availableEmployees = selectedDuty
    ? getAvailableEmployees(selectedDuty.type, selectedDuty.area)
    : [];

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        backgroundColor: 'background.default',
      }}
    >
      <Box
        sx={{
          width: '100%',
          p: 4,
        }}
      >
        <CalendarHeader actualDates={actualDates} onAutoPlanningStart={handleAutoPlanningStart} />

        <Box
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 3,
            p: 3,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CalendarGrid
            viewMode={viewMode}
            currentDate={currentDate}
            assignmentsMap={assignmentsMap}
            onDutyClick={handleDutyClick}
          />
        </Box>

        <CapacityOverview employees={employees} currentDate={currentDate} />
      </Box>

            <AssignmentDialog
              open={assignmentDialogOpen}
              selectedDate={selectedDate}
              selectedDuty={selectedDuty}
              assignment={currentAssignment}
              availableEmployees={availableEmployees}
              allEmployeesCapacity={allEmployeesCapacity}
              onClose={handleDialogClose}
              onEmployeeChange={handleEmployeeChange}
            />
    </Box>
  );
};
