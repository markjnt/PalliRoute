import React, { useMemo, useState, useCallback } from 'react';
import { Box, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useOnCallPlanningStore } from '../../stores/useOnCallPlanningStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import {
  useAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useEmployeeCapacities,
  useAutoPlan,
  useResetPlanning,
  useShiftDefinitions,
  useGenerateShiftInstances,
} from '../../services/queries/useScheduling';
import { useEmployees } from '../../services/queries/useEmployees';
import { Assignment, DutyType, OnCallArea, Employee, ShiftDefinition, AssignmentSource } from '../../types/models';
import { AssignmentsQueryParams, CreateAssignmentData, schedulingApi } from '../../services/api/scheduling';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { AssignmentDialog } from './dialogs/AssignmentDialog';
import { CapacityOverviewDialog } from './dialogs/CapacityOverviewDialog';
import { AutoPlanningDialog } from './dialogs/AutoPlanningDialog';
import { EmployeeTable } from './table/EmployeeTable';
import { formatDate, getCalendarDays, getWeekDays } from '../../utils/oncall/dateUtils';
import { findShiftDefinition, shiftDefinitionToDutyType } from '../../utils/oncall/shiftMapping';
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
  const queryParams: AssignmentsQueryParams = useMemo(() => {
    if (actualDates.length === 0) return {};
    const startDate = formatDate(actualDates[0]);
    const endDate = formatDate(actualDates[actualDates.length - 1]);
    return { start_date: startDate, end_date: endDate };
  }, [actualDates]);

  // Fetch shift definitions (needed for mapping)
  const { data: shiftDefinitions = [], isLoading: shiftDefinitionsLoading } = useShiftDefinitions();
  
  // Fetch data
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments(queryParams);
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  
  // Fetch employee capacities (month parameter is optional, used for calculating assigned/remaining)
  const monthString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const { data: employeeCapacities = [] } = useEmployeeCapacities({ month: monthString });
  
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const autoPlan = useAutoPlan();
  const generateShiftInstances = useGenerateShiftInstances();
  const resetPlanning = useResetPlanning();

  // Create a map of assignments by date, shift definition (via duty type + area)
  const assignmentsMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach((assignment) => {
      if (!assignment.shift_definition || !assignment.shift_instance) return;
      
      const dutyTypeMapping = shiftDefinitionToDutyType(assignment.shift_definition);
      if (!dutyTypeMapping) return;
      
      const key = `${assignment.shift_instance.date}_${dutyTypeMapping.dutyType}_${dutyTypeMapping.area || ''}`;
      map.set(key, assignment);
    });
    return map;
  }, [assignments]);

  // Get assignment for a specific date, duty type, and area
  const getAssignment = useCallback(
    (date: Date, dutyType: DutyType, area?: OnCallArea): Assignment | undefined => {
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
      if (!selectedDate || !selectedDuty || shiftDefinitions.length === 0) return;

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
            data: { employee_id: employeeId as number },
          });
        } else {
          // Create new - find shift definition first
          const shiftDef = findShiftDefinition(shiftDefinitions, selectedDuty.type, selectedDuty.area || 'Nord');
          if (!shiftDef) {
            setNotification('Schicht-Definition nicht gefunden', 'error');
            return;
          }
          
          // Use type assertion for union type (second option)
          await createAssignment.mutateAsync({
            shift_definition_id: shiftDef.id,
            date: dateStr,
            employee_id: employeeId as number,
            source: 'MANUAL',
          } as Extract<CreateAssignmentData, { shift_definition_id: number }>);
        }
      }

      setAssignmentDialogOpen(false);
      setSelectedDate(null);
      setSelectedDuty(null);
    },
    [selectedDate, selectedDuty, getAssignment, createAssignment, updateAssignment, deleteAssignment, shiftDefinitions, setNotification]
  );

  const handleDialogClose = useCallback(() => {
    setAssignmentDialogOpen(false);
    setSelectedDate(null);
    setSelectedDuty(null);
  }, []);

  const handleAutoPlanningStart = useCallback(async (settings: AutoPlanningSettings, timeAccountFile?: File | null) => {
    try {
      // Optional: Upload Stundenkonto Excel first (writes time_account + stand date)
      if (timeAccountFile) {
        await schedulingApi.uploadTimeAccounts(timeAccountFile);
      }

      // Always use the entire month of currentDate, regardless of view mode
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startDate = formatDate(firstDayOfMonth);
      const endDate = formatDate(lastDayOfMonth);
      const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`;
      // Vormonat für W2/W3 (Wochenend-Rotation, Tag/Nacht-Wechsel)
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const prevMonthParam = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

      // Zuerst Shift-Instanzen für Vormonat und Planungsmonat erzeugen (falls noch nicht vorhanden)
      await generateShiftInstances.mutateAsync({ month: prevMonthParam });
      await generateShiftInstances.mutateAsync({ month: monthParam });

      const result = await autoPlan.mutateAsync({
        start_date: startDate,
        end_date: endDate,
        existing_assignments_handling: settings.existingAssignmentsHandling,
        allow_overplanning: settings.allowOverplanning,
        include_aplano: settings.includeAplano,
      });

      // Backend returns 200 with solver_status/error for business errors (e.g. Aplano unavailable)
      const data = result as { solver_status?: string; error?: string; message?: string };
      if (data.solver_status === 'ERROR' && data.error === 'APLANO_UNAVAILABLE') {
        setNotification(data.message ?? 'Aplano ist nicht verfügbar.', 'error');
        return;
      }
      if (data.solver_status === 'ERROR') {
        setNotification(data.message ?? 'Fehler bei der automatischen Planung', 'error');
        return;
      }

      // Show success notification
      setNotification('Automatische Planung erfolgreich abgeschlossen', 'success');

      // Close dialog only after successful completion
      setAutoPlanningDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to start auto planning:', error);

      // Show error notification (network/server errors)
      const errorMessage = error?.response?.data?.error || error?.message || 'Fehler bei der automatischen Planung';
      setNotification(errorMessage, 'error');

      // Dialog stays open on error so user can retry
    }
  }, [currentDate, autoPlan, generateShiftInstances, setNotification]);

  // Reset planning for a date range
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
      const shiftDef = findShiftDefinition(shiftDefinitions, data.duty_type, data.area || 'Nord');
      if (!shiftDef) {
        setNotification('Schicht-Definition nicht gefunden', 'error');
        return;
      }
      
      // Use type assertion for union type (second option)
      await createAssignment.mutateAsync({
        shift_definition_id: shiftDef.id,
        date: data.date,
        employee_id: data.employee_id,
        source: 'MANUAL',
      } as Extract<CreateAssignmentData, { shift_definition_id: number }>);
    },
    [createAssignment, shiftDefinitions, setNotification]
  );

  const handleUpdateAssignment = useCallback(
    async (data: {
      id: number;
      assignmentData: { employee_id: number };
    }) => {
      await updateAssignment.mutateAsync({
        id: data.id,
        data: { employee_id: data.assignmentData.employee_id },
      });
    },
    [updateAssignment]
  );

  const handleDeleteAssignment = useCallback(
    async (id: number) => {
      await deleteAssignment.mutateAsync(id);
    },
    [deleteAssignment]
  );

  if (assignmentsLoading || employeesLoading || shiftDefinitionsLoading) {
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
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'background.default',
      }}
    >
      <Box
        sx={{
          width: '100%',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
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
                pt: 0,
                px: 3,
                pb: 3,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
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
              employeeCapacities={employeeCapacities}
              shiftDefinitions={shiftDefinitions}
              onClose={handleDialogClose}
              onEmployeeChange={handleEmployeeChange}
            />
          </>
        ) : (
          <Box
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 3,
              pt: 0,
              px: 3,
              pb: 3,
              boxShadow: 'none',
              border: '1px solid',
              borderColor: 'divider',
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
            }}
          >
            <EmployeeTable
              employees={employees}
              dates={actualDates}
              assignments={assignments}
              viewMode={viewMode}
              employeeCapacities={employeeCapacities}
              shiftDefinitions={shiftDefinitions}
              onCreateAssignment={handleCreateAssignment}
              onUpdateAssignment={handleUpdateAssignment}
              onDeleteAssignment={handleDeleteAssignment}
            />
          </Box>
        )}

        <CapacityOverviewDialog
          open={capacityDialogOpen}
          employees={employees}
          employeeCapacities={employeeCapacities}
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
