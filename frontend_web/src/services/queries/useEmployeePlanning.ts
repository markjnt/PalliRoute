import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeePlanningApi, EmployeePlanningData } from '../api/employeePlanning';
import { usePlanningWeekStore } from '../../stores/usePlanningWeekStore';
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
  const currentWeek = selectedPlanningWeek || getCurrentPlanningWeek();
  
  return useQuery({
    queryKey: employeePlanningKeys.list(currentWeek),
    queryFn: () => employeePlanningApi.getAll(currentWeek),
  });
};

// Hook to update planning availability
export const useUpdateEmployeePlanning = () => {
  const queryClient = useQueryClient();
  const { selectedPlanningWeek, getCurrentPlanningWeek } = usePlanningWeekStore();
  
  return useMutation({
    mutationFn: ({ employeeId, weekday, data }: {
      employeeId: number;
      weekday: string;
      data: {
        available: boolean;
        custom_text?: string;
        replacement_id?: number;
      };
    }) => {
      const currentWeek = selectedPlanningWeek || getCurrentPlanningWeek();
      return employeePlanningApi.update(employeeId, weekday, {
        ...data,
        calendar_week: currentWeek,
      });
    },
    onSuccess: (_, variables) => {
      const currentWeek = selectedPlanningWeek || getCurrentPlanningWeek();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: employeePlanningKeys.all });
    },
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

 

