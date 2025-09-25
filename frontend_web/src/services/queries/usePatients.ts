import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../api/patients';
import { appointmentKeys } from './useAppointments';
import { routeKeys } from './useRoutes';
import { employeeKeys } from './useEmployees';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';
import { employeePlanningKeys } from './useEmployeePlanning';

// Keys für React Query Cache
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: string) => [...patientKeys.lists(), { filters }] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: number) => [...patientKeys.details(), id] as const,
  calendarWeeks: () => [...patientKeys.all, 'calendar-weeks'] as const,
};

// Hook zum Laden aller Patienten
export const usePatients = (overrideCalendarWeek?: number) => {
  const { selectedCalendarWeek } = useCalendarWeekStore();
  
  // Verwende override oder den ausgewählten Wert aus dem Store
  const calendarWeek = overrideCalendarWeek !== undefined ? overrideCalendarWeek : selectedCalendarWeek;
  
  return useQuery({
    queryKey: [...patientKeys.lists(), { calendarWeek }],
    queryFn: () => patientsApi.getAll(calendarWeek || undefined),
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

// Hook zum Laden verfügbarer Kalenderwochen
export const useCalendarWeeks = () => {
  return useQuery({
    queryKey: patientKeys.calendarWeeks(),
    queryFn: () => patientsApi.getCalendarWeeks(),
    staleTime: 5 * 60 * 1000, // 5 Minuten - Kalenderwochen ändern sich selten
  });
};

// Hook für Excel-Import von Patienten
export const usePatientImport = () => {
  const queryClient = useQueryClient();
  const { setLastPatientImportTime } = useLastUpdateStore();
  const { setAvailableCalendarWeeks, getCurrentCalendarWeek } = useCalendarWeekStore();
  
  return useMutation({
    mutationFn: () => patientsApi.import(),
    onSuccess: async () => {
      // Patienten-Daten im Cache invalidieren
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all});
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeePlanningKeys.all });
      
      // Update last import time in store
      setLastPatientImportTime(new Date());
      
      // Lade verfügbare Kalenderwochen und setze sie im Store
      try {
        const calendarWeeks = await patientsApi.getCalendarWeeks();
        setAvailableCalendarWeeks(calendarWeeks);
      } catch (error) {
        console.error('Failed to load calendar weeks after import:', error);
      }
    },
  });
};
