import api from './api';
import { Appointment, Weekday } from '../../types/models';

export const appointmentsApi = {
    // Get all appointments
    async getAll(): Promise<Appointment[]> {
        try {
            const response = await api.get('/appointments/');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
            throw error;
        }
    },

    // Get appointments by patient ID
    async getByPatientId(patientId: number): Promise<Appointment[]> {
        try {
            const response = await api.get(`/appointments?patient_id=${patientId}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch appointments for patient with ID ${patientId}:`, error);
            throw error;
        }
    },

    // Get appointments by weekday
    async getByWeekday(weekday: Weekday): Promise<Appointment[]> {
        try {
            const response = await api.get(`/appointments/weekday/${weekday}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch appointments for weekday ${weekday}:`, error);
            throw error;
        }
    },

    // Get single appointment by ID
    async getById(id: number): Promise<Appointment> {
        try {
            const response = await api.get(`/appointments/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch appointment with ID ${id}:`, error);
            throw error;
        }
    },

    async moveAppointment(appointmentId: number, sourceEmployeeId: number, targetEmployeeId: number): Promise<void> {
        try {
            await api.post('/appointments/move', {
                appointment_id: appointmentId,
                source_employee_id: sourceEmployeeId,
                target_employee_id: targetEmployeeId
            });
        } catch (error) {
            console.error('Fehler beim Verschieben des Termins:', error);
            throw error;
        }
    },

    async batchMoveAppointments(sourceEmployeeId: number, targetEmployeeId: number): Promise<void> {
        try {
            await api.post('/appointments/batchmove', {
                source_employee_id: sourceEmployeeId,
                target_employee_id: targetEmployeeId
            });
        } catch (error) {
            console.error('Fehler beim Batch-Verschieben der Termine:', error);
            throw error;
        }
    }
}; 