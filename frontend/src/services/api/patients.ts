import axios from 'axios';
import { Patient, PatientImportResponse } from '../../types/models';

export const patientsApi = {
    // Get all patients
    async getAll(): Promise<Patient[]> {
        try {
            const response = await axios.get('/patients');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch patients:', error);
            throw error;
        }
    },

    // Get single patient by ID
    async getById(id: number): Promise<Patient> {
        try {
            const response = await axios.get(`/patients/${id}`);
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
            
            const response = await axios.post('/patients/import', formData, {
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

    // Clear all data from the database
    async clearAll(): Promise<{
        message: string;
        deleted_count: {
            patients: number;
            appointments: number;
            routes: number;
        };
    }> {
        try {
            const response = await axios.delete('/patients/clear-all');
            return response.data;
        } catch (error) {
            console.error('Failed to clear all data:', error);
            throw error;
        }
    }
}; 