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

    // Create new patient
    async create(patientData: Partial<Patient>): Promise<Patient> {
        try {
            const response = await axios.post('/patients', patientData);
            return response.data;
        } catch (error) {
            console.error('Failed to create patient:', error);
            throw error;
        }
    },

    // Update existing patient
    async update(id: number, patientData: Partial<Patient>): Promise<Patient> {
        try {
            const response = await axios.put(`/patients/${id}`, patientData);
            return response.data;
        } catch (error) {
            console.error(`Failed to update patient with ID ${id}:`, error);
            throw error;
        }
    },

    // Delete patient
    async delete(id: number): Promise<void> {
        try {
            await axios.delete(`/patients/${id}`);
        } catch (error) {
            console.error(`Failed to delete patient with ID ${id}:`, error);
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
    }
}; 