import axios from 'axios';
import { Appointment, Weekday } from '../../types/models';

export const appointmentsApi = {
    // Get all appointments
    async getAll(): Promise<Appointment[]> {
        try {
            const response = await axios.get('/appointments');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
            throw error;
        }
    },

    // Get appointments by patient ID
    async getByPatientId(patientId: number): Promise<Appointment[]> {
        try {
            const response = await axios.get(`/appointments?patient_id=${patientId}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch appointments for patient with ID ${patientId}:`, error);
            throw error;
        }
    },

    // Get appointments by weekday
    async getByWeekday(weekday: Weekday): Promise<Appointment[]> {
        try {
            const response = await axios.get(`/appointments/weekday/${weekday}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch appointments for weekday ${weekday}:`, error);
            throw error;
        }
    },

    // Get single appointment by ID
    async getById(id: number): Promise<Appointment> {
        try {
            const response = await axios.get(`/appointments/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch appointment with ID ${id}:`, error);
            throw error;
        }
    },

    // Create new appointment
    async create(appointmentData: Partial<Appointment>): Promise<Appointment> {
        try {
            const response = await axios.post('/appointments', appointmentData);
            return response.data;
        } catch (error) {
            console.error('Failed to create appointment:', error);
            throw error;
        }
    },

    // Update existing appointment
    async update(id: number, appointmentData: Partial<Appointment>): Promise<Appointment> {
        try {
            const response = await axios.put(`/appointments/${id}`, appointmentData);
            return response.data;
        } catch (error) {
            console.error(`Failed to update appointment with ID ${id}:`, error);
            throw error;
        }
    },

    // Delete appointment
    async delete(id: number): Promise<void> {
        try {
            await axios.delete(`/appointments/${id}`);
        } catch (error) {
            console.error(`Failed to delete appointment with ID ${id}:`, error);
            throw error;
        }
    }
}; 