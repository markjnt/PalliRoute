import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Patient } from '../../types/models';
import { patientsApi } from '../api/patients';

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

// Hook zum Erstellen eines Patienten
export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (patientData: Partial<Patient>) => patientsApi.create(patientData),
    onSuccess: (newPatient) => {
      // Cache invalidieren und neu laden
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      
      // Optional den Cache direkt aktualisieren
      queryClient.setQueryData(
        patientKeys.lists(),
        (oldPatients: Patient[] = []) => [...oldPatients, newPatient]
      );
    },
  });
};

// Hook zum Aktualisieren eines Patienten
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, patientData }: { id: number; patientData: Partial<Patient> }) => 
      patientsApi.update(id, patientData),
    onSuccess: (updatedPatient) => {
      // Cache invalidieren und neu laden
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(updatedPatient.id as number) });
      
      // Optional den Cache direkt aktualisieren
      queryClient.setQueryData(
        patientKeys.lists(),
        (oldPatients: Patient[] = []) => 
          oldPatients.map(patient => (patient.id === updatedPatient.id ? updatedPatient : patient))
      );
    },
  });
};

// Hook zum Löschen eines Patienten
export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => patientsApi.delete(id),
    onSuccess: (_, id) => {
      // Cache invalidieren und neu laden
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      
      // Aus dem Cache entfernen
      queryClient.removeQueries({ queryKey: patientKeys.detail(id) });
      
      // Optional den Listen-Cache direkt aktualisieren
      queryClient.setQueryData(
        patientKeys.lists(),
        (oldPatients: Patient[] = []) => oldPatients.filter(patient => patient.id !== id)
      );
    },
  });
};

// Hook für Excel-Import von Patienten
export const usePatientImport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => patientsApi.import(file),
    onSuccess: () => {
      // Patienten-Daten im Cache invalidieren
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}; 