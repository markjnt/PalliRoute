import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../api/patients';
import { appointmentKeys } from './useAppointments';
import { routeKeys } from './useRoutes';
import { employeeKeys } from './useEmployees';

// Keys für React Query Cache
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: string) => [...patientKeys.lists(), { filters }] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: number) => [...patientKeys.details(), id] as const,
};

// Hook zum Laden aller Patienten
export const usePatients = () => {
  return useQuery({
    queryKey: patientKeys.lists(),
    queryFn: () => patientsApi.getAll(),
  });
};

// Hook zum Laden eines einzelnen Patienten
export const usePatient = (id: number) => {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientsApi.getById(id),
    enabled: !!id, // Nur ausführen, wenn eine ID vorhanden ist
  });
};

// Hook für Excel-Import von Patienten
export const usePatientImport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => patientsApi.import(),
    onSuccess: () => {
      // Patienten-Daten im Cache invalidieren
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all});
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
};