import api from './api';
import { Patient, PatientImportResponse } from '../../types/models';
import { getCurrentCalendarWeek, getBestCalendarWeek } from '../../utils/calendarUtils';
import { calendarWeekService } from './calendarWeek';

export const patientsApi = {
    // Get available calendar weeks from backend
    async getCalendarWeeks(): Promise<number[]> {
        try {
            const response = await api.get('/patients/calendar-weeks');
            return response.data.calendar_weeks;
        } catch (error) {
            console.error('Failed to fetch calendar weeks:', error);
            throw error;
        }
    },

    // Get all patients for current or latest available calendar week
    async getAll(): Promise<Patient[]> {
        try {
            // Use the calendar week service to get the best week
            const weekToUse = await calendarWeekService.getBestWeek();
            
            const response = await api.get('/patients/', { 
                params: { calendar_week: weekToUse } 
            });
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
    async import(file: File): Promise<PatientImportResponse> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await api.post('/patients/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to import patients from Excel:', error);
            throw error;
        }
    },

}; 