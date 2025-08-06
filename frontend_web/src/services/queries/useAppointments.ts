import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Weekday } from '../../types/models';
import { appointmentsApi } from '../api/appointments';
import { routeKeys } from './useRoutes';
import { patientKeys } from './usePatients';

// Keys für React Query Cache
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: string) => [...appointmentKeys.lists(), { filters }] as const,
  byWeekday: (weekday: Weekday) => [...appointmentKeys.lists(), { weekday }] as const,
  byPatient: (patientId: number) => [...appointmentKeys.lists(), { patientId }] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: number) => [...appointmentKeys.details(), id] as const,
};

// Hook zum Laden aller Termine
export const useAppointments = () => {
  return useQuery({
    queryKey: appointmentKeys.lists(),
    queryFn: () => appointmentsApi.getAll(),
  });
};

// Hook zum Laden von Terminen für einen bestimmten Wochentag
export const useAppointmentsByWeekday = (weekday: Weekday) => {
  return useQuery({
    queryKey: appointmentKeys.byWeekday(weekday),
    queryFn: () => appointmentsApi.getByWeekday(weekday),
    enabled: !!weekday, // Nur ausführen, wenn ein Wochentag angegeben ist
  });
};

// Hook zum Laden von Terminen für einen bestimmten Patienten
export const useAppointmentsByPatient = (patientId: number) => {
  return useQuery({
    queryKey: appointmentKeys.byPatient(patientId),
    queryFn: () => appointmentsApi.getByPatientId(patientId),
    enabled: !!patientId, // Nur ausführen, wenn eine Patienten-ID angegeben ist
  });
};

// Hook zum Laden eines einzelnen Termins
export const useAppointment = (id: number) => {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentsApi.getById(id),
    enabled: !!id, // Nur ausführen, wenn eine ID angegeben ist
  });
};

// Hook zum Verschieben eines einzelnen Termins
export const useMoveAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ appointmentId, sourceEmployeeId, targetEmployeeId }: { 
      appointmentId: number; 
      sourceEmployeeId: number; 
      targetEmployeeId: number; 
    }) => appointmentsApi.moveAppointment(appointmentId, sourceEmployeeId, targetEmployeeId),
    onSuccess: () => {
      // Invalidate all appointment queries to refetch data
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    }
  });
};

// Hook zum Verschieben aller Termine eines Mitarbeiters
export const useBatchMoveAppointments = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceEmployeeId, targetEmployeeId, weekday }: { 
      sourceEmployeeId: number; 
      targetEmployeeId: number; 
      weekday: string;
    }) => appointmentsApi.batchMoveAppointments(sourceEmployeeId, targetEmployeeId, weekday),
    onSuccess: () => {
      // Invalidate all appointment queries to refetch data
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    }
  });
};

