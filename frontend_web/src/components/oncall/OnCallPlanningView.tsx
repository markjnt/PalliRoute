import React, { useMemo, useState, useCallback } from 'react';
import { Box, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useOnCallPlanningStore } from '../../stores/useOnCallPlanningStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import {
  useOnCallAssignments,
  useCreateOnCallAssignment,
  useUpdateOnCallAssignment,
  useDeleteOnCallAssignment,
  useAllEmployeesCapacity,
  useAutoPlan,
  useResetPlanning,
} from '../../services/queries/useOnCallAssignments';
import { useEmployees } from '../../services/queries/useEmployees';
import { OnCallAssignment, DutyType, OnCallArea, Employee } from '../../types/models';
import { OnCallAssignmentsQueryParams } from '../../services/api/oncallAssignments';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { AssignmentDialog } from './dialogs/AssignmentDialog';
import { CapacityOverviewDialog } from './dialogs/CapacityOverviewDialog';
import { AutoPlanningDialog } from './dialogs/AutoPlanningDialog';
import { EmployeeTable } from './table/EmployeeTable';
import { formatDate, getCalendarDays, getWeekDays } from '../../utils/oncall/dateUtils';
import { isWeekend } from '../../utils/oncall/dateUtils';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../utils/oncall/constants';
import type { AutoPlanningSettings } from './dialogs/AutoPlanningDialog';

export const OnCallPlanningView: React.FC = () => {
  const { viewMode, displayType, currentDate } = useOnCallPlanningStore();
  const { notification, closeNotification, setNotification } = useNotificationStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDuty, setSelectedDuty] = useState<{ type: DutyType; area?: OnCallArea } | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
  const [autoPlanningDialogOpen, setAutoPlanningDialogOpen] = useState(false);

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
  const autoPlan = useAutoPlan();
  const resetPlanning = useResetPlanning();

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

  const handleAutoPlanningStart = useCallback(async (settings: AutoPlanningSettings) => {
    try {
      // Always use the entire month of currentDate, regardless of view mode
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startDate = formatDate(firstDayOfMonth);
      const endDate = formatDate(lastDayOfMonth);
      
      await autoPlan.mutateAsync({
        existing_assignments_handling: settings.existingAssignmentsHandling,
        allow_overplanning: settings.allowOverplanning,
        include_aplano: settings.includeAplano,
        start_date: startDate,
        end_date: endDate,
      });
      
      // Show success notification
      setNotification('Automatische Planung erfolgreich abgeschlossen', 'success');
      
      // Close dialog only after successful completion
      setAutoPlanningDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to start auto planning:', error);
      
      // Show error notification
      const errorMessage = error?.response?.data?.error || error?.message || 'Fehler bei der automatischen Planung';
      setNotification(errorMessage, 'error');
      
      // Dialog stays open on error so user can retry
    }
  }, [currentDate, autoPlan, setNotification]);

  const handleResetPlanning = useCallback(async () => {
    try {
      // Calculate month range (same as planning)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startDate = formatDate(firstDayOfMonth);
      const endDate = formatDate(lastDayOfMonth);
      
      await resetPlanning.mutateAsync({
        start_date: startDate,
        end_date: endDate,
      });
      
      // Show success notification
      setNotification('Planung erfolgreich zurückgesetzt', 'success');
      
      // Close dialog after successful reset
      setAutoPlanningDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to reset planning:', error);
      
      // Show error notification
      const errorMessage = error?.response?.data?.error || error?.message || 'Fehler beim Zurücksetzen der Planung';
      setNotification(errorMessage, 'error');
    }
  }, [currentDate, resetPlanning, setNotification]);

  // Wrapper functions for table view
  const handleCreateAssignment = useCallback(
    async (data: {
      employee_id: number;
      date: string;
      duty_type: DutyType;
      area?: OnCallArea;
    }) => {
      await createAssignment.mutateAsync(data);
    },
    [createAssignment]
  );

  const handleUpdateAssignment = useCallback(
    async (data: {
      id: number;
      assignmentData: { employee_id: number };
    }) => {
      await updateAssignment.mutateAsync(data);
    },
    [updateAssignment]
  );

  const handleDeleteAssignment = useCallback(
    async (id: number) => {
      await deleteAssignment.mutateAsync(id);
    },
    [deleteAssignment]
  );

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
        <CalendarHeader 
          actualDates={actualDates} 
          onAutoPlanningOpen={() => setAutoPlanningDialogOpen(true)}
          onCapacityOverviewOpen={() => setCapacityDialogOpen(true)}
        />

        {displayType === 'calendar' ? (
          <>
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
          </>
        ) : (
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
            <EmployeeTable
              employees={employees}
              dates={actualDates}
              assignments={assignments}
              viewMode={viewMode}
              allEmployeesCapacity={allEmployeesCapacity}
              onCreateAssignment={handleCreateAssignment}
              onUpdateAssignment={handleUpdateAssignment}
              onDeleteAssignment={handleDeleteAssignment}
            />
          </Box>
        )}

        <CapacityOverviewDialog
          open={capacityDialogOpen}
          employees={employees}
          currentDate={currentDate}
          onClose={() => setCapacityDialogOpen(false)}
        />

        <AutoPlanningDialog
          open={autoPlanningDialogOpen}
          onClose={() => setAutoPlanningDialogOpen(false)}
          onStart={handleAutoPlanningStart}
          onReset={handleResetPlanning}
          currentDate={currentDate}
          isLoading={autoPlan.isPending}
          isResetting={resetPlanning.isPending}
          viewMode={viewMode}
        />

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={closeNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={closeNotification} 
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};
