import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeePlanningApi, EmployeePlanningData } from '../api/employeePlanning';
import { usePlanningWeekStore } from '../../stores/usePlanningWeekStore';
import api from '../api/api';
import { routeKeys } from './useRoutes';
import { appointmentKeys } from './useAppointments';

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

// Hook to update planning status
export const useUpdateEmployeePlanning = () => {
  const queryClient = useQueryClient();
  const { selectedPlanningWeek, getCurrentPlanningWeek } = usePlanningWeekStore();
  
  return useMutation({
    mutationFn: ({ employeeId, weekday, data }: {
      employeeId: number;
      weekday: string;
      data: {
        status: 'available' | 'vacation' | 'sick' | 'custom';
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
    },
  });
};

export const useMoveAllPatients = () => {
  const queryClient = useQueryClient();
  const { selectedPlanningWeek, getCurrentPlanningWeek } = usePlanningWeekStore();
  
  // Map German weekday names to English
  const mapWeekdayToEnglish = (weekday: string): string => {
    const mapping: Record<string, string> = {
      'montag': 'monday',
      'dienstag': 'tuesday',
      'mittwoch': 'wednesday',
      'donnerstag': 'thursday',
      'freitag': 'friday',
      'samstag': 'saturday',
      'sonntag': 'sunday'
    };
    return mapping[weekday.toLowerCase()] || weekday.toLowerCase();
  };
  
  return useMutation({
    mutationFn: ({ sourceEmployeeId, weekday, targetEmployeeId }: {
      sourceEmployeeId: number;
      weekday: string;
      targetEmployeeId: number;
    }) => {
      const currentWeek = selectedPlanningWeek || getCurrentPlanningWeek();
      return api.post('/appointments/batchmove', {
        source_employee_id: sourceEmployeeId,
        target_employee_id: targetEmployeeId,
        weekday: mapWeekdayToEnglish(weekday),
        calendar_week: currentWeek,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: employeePlanningKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
    },
  });
};
