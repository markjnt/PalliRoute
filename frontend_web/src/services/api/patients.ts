import api from './api';
import { Patient, PatientImportResponse } from '../../types/models';

interface CalendarWeeksResponse {
    calendar_weeks: number[];
    count: number;
}

export const patientsApi = {
    // Get all patients
    async getAll(calendarWeek?: number): Promise<Patient[]> {
        try {
            const params = calendarWeek ? { calendar_week: calendarWeek } : {};
            const response = await api.get('/patients/', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch patients:', error);
            throw error;
        }
    },

    // Get single patient by ID
    async getById(id: number): Promise<Patient> {
        try {
            const response = await api.get(`/patients/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch patient with ID ${id}:`, error);
            throw error;
        }
    },

    // Import patients from Excel file
    async import(): Promise<PatientImportResponse> {
        try {
            const response = await api.post('/patients/import');
            return response.data;
        } catch (error) {
            console.error('Failed to import patients from Excel:', error);
            throw error;
        }
    },

    // Get available calendar weeks
    async getCalendarWeeks(): Promise<number[]> {
        try {
            const response = await api.get('/patients/calendar-weeks');
            return response.data.calendar_weeks;
        } catch (error) {
            console.error('Failed to fetch available calendar weeks:', error);
            throw error;
        }
    },

}; 