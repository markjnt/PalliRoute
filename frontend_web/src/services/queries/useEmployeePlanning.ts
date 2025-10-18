import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeePlanningApi, EmployeePlanningData } from '../api/employeePlanning';
import { usePlanningWeekStore } from '../../stores/usePlanningWeekStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { routeKeys } from './useRoutes';
import { appointmentKeys } from './useAppointments';
import { patientKeys } from './usePatients';

// Keys for React Query cache
export const employeePlanningKeys = {
  all: ['employee-planning'] as const,
  lists: () => [...employeePlanningKeys.all, 'list'] as const,
  list: (calendarWeek?: number) => [...employeePlanningKeys.lists(), { calendarWeek }] as const,
  byEmployee: (employeeId: number, calendarWeek?: number) => [...employeePlanningKeys.all, 'employee', employeeId, { calendarWeek }] as const,
  conflicts: (employeeId: number, weekday: string, calendarWeek?: number) => [...employeePlanningKeys.all, 'conflicts', employeeId, weekday, { calendarWeek }] as const,
};

// Hook to get all planning entries
export const useEmployeePlanning = () => {
  const { selectedPlanningWeek, getCurrentPlanningWeek } = usePlanningWeekStore();
  const { setNotification, setLoading, resetLoading } = useNotificationStore();
  const currentWeek = selectedPlanningWeek || getCurrentPlanningWeek();
  
  return useQuery({
    queryKey: employeePlanningKeys.list(currentWeek),
    queryFn: async () => {
      try {
        setLoading('Synchronisiere mit Aplano...');
        const response = await employeePlanningApi.getAll(currentWeek);
        
        // Check for Aplano sync warnings
        if (response.data?.warning) {
          setNotification(`Aplano Sync Warnung: ${response.data.warning}`, 'error');
        }
        
        return response;
      } finally {
        resetLoading();
      }
    },
    refetchInterval: 60000, // Refetch every 60 seconds (1 minute)
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
  });
};


// Hook to update replacement
export const useUpdateReplacement = () => {
  const queryClient = useQueryClient();
  const { selectedPlanningWeek, getCurrentPlanningWeek } = usePlanningWeekStore();
  
  return useMutation({
    mutationFn: ({ employeeId, weekday, replacementId }: {
      employeeId: number;
      weekday: string;
      replacementId?: number;
    }) => {
      const currentWeek = selectedPlanningWeek || getCurrentPlanningWeek();
      return employeePlanningApi.updateReplacement(employeeId, weekday, {
        replacement_id: replacementId,
        calendar_week: currentWeek,
      });
    },
    onSuccess: (_, variables) => {
      const currentWeek = selectedPlanningWeek || getCurrentPlanningWeek();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: employeePlanningKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
};

 

