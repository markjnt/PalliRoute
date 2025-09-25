import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeePlanningApi, EmployeePlanningData } from '../api/employeePlanning';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';

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
  const { selectedCalendarWeek, getCurrentCalendarWeek } = useCalendarWeekStore();
  const currentWeek = selectedCalendarWeek || getCurrentCalendarWeek();
  
  return useQuery({
    queryKey: employeePlanningKeys.list(currentWeek),
    queryFn: () => employeePlanningApi.getAll(currentWeek),
  });
};

// Hook to update planning status
export const useUpdateEmployeePlanning = () => {
  const queryClient = useQueryClient();
  const { selectedCalendarWeek, getCurrentCalendarWeek } = useCalendarWeekStore();
  
  return useMutation({
    mutationFn: ({ employeeId, weekday, data }: {
      employeeId: number;
      weekday: string;
      data: {
        status: 'available' | 'vacation' | 'sick' | 'custom';
        custom_text?: string;
      };
    }) => {
      const currentWeek = selectedCalendarWeek || getCurrentCalendarWeek();
      return employeePlanningApi.update(employeeId, weekday, {
        ...data,
        calendar_week: currentWeek,
      });
    },
    onSuccess: (_, variables) => {
      const currentWeek = selectedCalendarWeek || getCurrentCalendarWeek();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: employeePlanningKeys.all });
    },
  });
};


// Hook to check for conflicts
export const useCheckPlanningConflicts = (employeeId: number, weekday: string) => {
  const { selectedCalendarWeek, getCurrentCalendarWeek } = useCalendarWeekStore();
  const currentWeek = selectedCalendarWeek || getCurrentCalendarWeek();
  
  return useQuery({
    queryKey: employeePlanningKeys.conflicts(employeeId, weekday, currentWeek),
    queryFn: () => employeePlanningApi.checkConflicts(employeeId, weekday, currentWeek),
    enabled: !!employeeId && !!weekday,
  });
};
