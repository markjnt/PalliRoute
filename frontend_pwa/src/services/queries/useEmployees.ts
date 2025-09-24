import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Employee, EmployeeFormData, EmployeeImportResponse } from '../../types/models';
import { employeesApi } from '../api/employees';
import { patientKeys } from './usePatients';
import { appointmentKeys } from './useAppointments';
import { routeKeys } from './useRoutes';

// Keys for React Query cache
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: string) => [...employeeKeys.lists(), { filters }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: number) => [...employeeKeys.details(), id] as const,
};

// Hook to get all employees
export const useEmployees = () => {
  return useQuery({
    queryKey: employeeKeys.lists(),
    queryFn: () => employeesApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes für Mitarbeiter
    refetchOnWindowFocus: true, // Mitarbeiter beim Fenster-Fokus refetchen
    refetchOnReconnect: true, // Mitarbeiter bei Netzwerk-Wiederherstellung refetchen
    refetchOnMount: true, // Mitarbeiter beim Mount refetchen
  });
};

