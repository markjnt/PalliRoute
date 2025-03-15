import axios from 'axios';
import { Employee, EmployeeFormData, EmployeeImportResponse } from '../../types/models';

export const employeesApi = {
    // Get all employees
    async getAll(): Promise<Employee[]> {
        try {
            const response = await axios.get('/employees/');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            throw error;
        }
    },

    // Get single employee by ID
    async getById(id: number): Promise<Employee> {
        try {
            const response = await axios.get(`/employees/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch employee with ID ${id}:`, error);
            throw error;
        }
    },

    // Create new employee
    async create(employeeData: EmployeeFormData): Promise<Employee> {
        try {
            const response = await axios.post('/employees/', employeeData);
            return response.data;
        } catch (error: any) {
            // Don't log expected errors (like duplicate employee)
            if (error.response?.status !== 400) {
                console.error('Failed to create employee:', error);
            }
            throw error;
        }
    },

    // Update existing employee
    async update(id: number, employeeData: Partial<EmployeeFormData>): Promise<Employee> {
        try {
            const response = await axios.put(`/employees/${id}`, employeeData);
            return response.data;
        } catch (error) {
            console.error(`Failed to update employee with ID ${id}:`, error);
            throw error;
        }
    },

    // Delete employee
    async delete(id: number): Promise<void> {
        try {
            await axios.delete(`/employees/${id}`);
        } catch (error) {
            console.error(`Failed to delete employee with ID ${id}:`, error);
            throw error;
        }
    },

    // Toggle employee active status
    async toggleActive(id: number, isActive: boolean): Promise<Employee> {
        try {
            const response = await axios.put(`/employees/${id}`, { is_active: isActive });
            return response.data;
        } catch (error) {
            console.error(`Failed to toggle active status for employee with ID ${id}:`, error);
            throw error;
        }
    },

    // Import employees from Excel file
    async import(file: File): Promise<EmployeeImportResponse> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await axios.post('/employees/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to import employees from Excel:', error);
            throw error;
        }
    }
}; 