import api from './api';
import { Employee, EmployeeFormData, EmployeeImportResponse } from '../../types/models';

export const employeesApi = {
    // Get all employees
    async getAll(): Promise<Employee[]> {
        try {
            const response = await api.get('/employees/');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            throw error;
        }
    }
}; 
