import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Appointment, Weekday } from '../../types/models';
import { appointmentsApi } from '../api/appointments';

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

// Hook zum Erstellen eines Termins
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (appointmentData: Partial<Appointment>) => appointmentsApi.create(appointmentData),
    onSuccess: (newAppointment) => {
      // Cache invalidieren und neu laden
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      // Optional den Cache direkt aktualisieren
      queryClient.setQueryData(
        appointmentKeys.lists(),
        (oldAppointments: Appointment[] = []) => [...oldAppointments, newAppointment]
      );
      
      // Wenn der Termin einem Wochentag zugeordnet ist, diesen Wochentag-Cache aktualisieren
      if (newAppointment.weekday) {
        queryClient.invalidateQueries({ 
          queryKey: appointmentKeys.byWeekday(newAppointment.weekday) 
        });
      }
      
      // Wenn der Termin einem Patienten zugeordnet ist, diesen Patienten-Cache aktualisieren
      if (newAppointment.patient_id) {
        queryClient.invalidateQueries({ 
          queryKey: appointmentKeys.byPatient(newAppointment.patient_id) 
        });
      }
    },
  });
};

// Hook zum Aktualisieren eines Termins
export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, appointmentData }: { id: number; appointmentData: Partial<Appointment> }) => 
      appointmentsApi.update(id, appointmentData),
    onSuccess: (updatedAppointment, { id }) => {
      // Cache invalidieren und neu laden
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      
      // Optional den Cache direkt aktualisieren
      queryClient.setQueryData(
        appointmentKeys.lists(),
        (oldAppointments: Appointment[] = []) => 
          oldAppointments.map(appointment => (appointment.id === id ? updatedAppointment : appointment))
      );
      
      // Wenn der Termin einem Wochentag zugeordnet ist, diesen Wochentag-Cache aktualisieren
      if (updatedAppointment.weekday) {
        queryClient.invalidateQueries({ 
          queryKey: appointmentKeys.byWeekday(updatedAppointment.weekday) 
        });
      }
      
      // Wenn der Termin einem Patienten zugeordnet ist, diesen Patienten-Cache aktualisieren
      if (updatedAppointment.patient_id) {
        queryClient.invalidateQueries({ 
          queryKey: appointmentKeys.byPatient(updatedAppointment.patient_id) 
        });
      }
    },
  });
};

// Hook zum Löschen eines Termins
export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => appointmentsApi.delete(id),
    onSuccess: (_, id) => {
      // Cache invalidieren und neu laden
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      // Aus dem Cache entfernen
      queryClient.removeQueries({ queryKey: appointmentKeys.detail(id) });
      
      // Optional den Listen-Cache direkt aktualisieren
      queryClient.setQueryData(
        appointmentKeys.lists(),
        (oldAppointments: Appointment[] = []) => oldAppointments.filter(appointment => appointment.id !== id)
      );
      
      // Für die anderen spezifischen Caches (byWeekday, byPatient) ist es am besten,
      // sie zu invalidieren, da wir hier nicht wissen, zu welchem Wochentag oder Patienten
      // der gelöschte Termin gehörte
      queryClient.invalidateQueries({ 
        queryKey: appointmentKeys.lists(),
        exact: false // Alle Unterschlüssel invalidieren, einschließlich byWeekday und byPatient
      });
    },
  });
}; 