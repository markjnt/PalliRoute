import api from './api';
import { Patient, PatientImportResponse } from '../../types/models';

export const patientsApi = {
    // Get all patients
    async getAll(): Promise<Patient[]> {
        try {
            const response = await api.get('/patients/');
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

    // Get last import time
    async getLastImportTime(): Promise<{ last_import_time: string | null }> {
        try {
            const response = await api.get('/patients/last-import-time');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch last import time:', error);
            throw error;
        }
    }
}; 