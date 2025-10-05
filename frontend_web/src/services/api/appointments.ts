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
            const response = await api.get(`/appointments/?patient_id=${patientId}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch appointments for patient with ID ${patientId}:`, error);
            throw error;
        }
    },

    // Get appointments by weekday
    async getByWeekday(weekday: Weekday, calendarWeek?: number): Promise<Appointment[]> {
        try {
            const params = calendarWeek ? { calendar_week: calendarWeek } : {};
            const response = await api.get(`/appointments/weekday/${weekday}`, { params });
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

    async moveAppointment(appointmentId: number, sourceEmployeeId?: number, targetEmployeeId?: number, sourceArea?: string, targetArea?: string, calendarWeek?: number): Promise<void> {
        try {
            const payload: any = {
                appointment_id: appointmentId
            };
            
            if (calendarWeek) {
                payload.calendar_week = calendarWeek;
            }
            
            if (sourceEmployeeId !== undefined && targetEmployeeId !== undefined) {
                // Employee-based move
                payload.source_employee_id = sourceEmployeeId;
                payload.target_employee_id = targetEmployeeId;
            } else if (sourceArea && targetArea) {
                // Area-based move (for weekend appointments)
                payload.source_area = sourceArea;
                payload.target_area = targetArea;
            } else {
                throw new Error('Either employee IDs or areas must be provided');
            }
            
            await api.post('/appointments/move', payload);
        } catch (error) {
            console.error('Fehler beim Verschieben des Termins:', error);
            throw error;
        }
    },

}; 