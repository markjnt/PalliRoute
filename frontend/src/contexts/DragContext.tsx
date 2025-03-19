import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Patient, Appointment } from '../types/models';
import { patientsApi } from '../services/api/patients';
import { appointmentsApi } from '../services/api/appointments';

type DragContextType = {
  updatePatientTour: (patientId: number, newTourNumber: number | undefined) => Promise<void>;
  updateAppointmentEmployee: (appointmentId: number, newEmployeeId: number | undefined) => Promise<void>;
  loadingPatients: boolean;
  loadingAppointments: boolean;
  error: string | null;
};

const DragContext = createContext<DragContextType | undefined>(undefined);

export const DragProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePatientTour = async (patientId: number, newTourNumber: number | undefined) => {
    setLoadingPatients(true);
    setError(null);
    try {
      await patientsApi.update(patientId, { tour: newTourNumber });
    } catch (err) {
      setError('Fehler beim Aktualisieren der Patienten-Tour');
      console.error('Fehler beim Aktualisieren der Patienten-Tour:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const updateAppointmentEmployee = async (appointmentId: number, newEmployeeId: number | undefined) => {
    setLoadingAppointments(true);
    setError(null);
    try {
      await appointmentsApi.update(appointmentId, { employee_id: newEmployeeId });
    } catch (err) {
      setError('Fehler beim Aktualisieren des Termin-Mitarbeiters');
      console.error('Fehler beim Aktualisieren des Termin-Mitarbeiters:', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  return (
    <DragContext.Provider
      value={{
        updatePatientTour,
        updateAppointmentEmployee,
        loadingPatients,
        loadingAppointments,
        error
      }}
    >
      {children}
    </DragContext.Provider>
  );
};

export const useDrag = (): DragContextType => {
  const context = useContext(DragContext);
  if (context === undefined) {
    throw new Error('useDrag must be used within a DragProvider');
  }
  return context;
}; 