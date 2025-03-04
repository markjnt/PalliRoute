import axios from 'axios';
import { Employee, EmployeeFormData } from '../../types/models';

const EMPLOYEES_URL = '/employees';

export const employeesApi = {
    // Get all employees
    getAll: async (): Promise<Employee[]> => {
        const response = await axios.get(EMPLOYEES_URL);
        return response.data;
    },

    // Get single employee by ID
    getById: async (id: number): Promise<Employee> => {
        const response = await axios.get(`${EMPLOYEES_URL}/${id}`);
        return response.data;
    },

    // Create new employee
    create: async (employeeData: EmployeeFormData): Promise<Employee> => {
        const response = await axios.post(EMPLOYEES_URL, employeeData);
        return response.data;
    },

    // Update existing employee
    update: async (id: number, employeeData: Partial<EmployeeFormData>): Promise<Employee> => {
        const response = await axios.put(`${EMPLOYEES_URL}/${id}`, employeeData);
        return response.data;
    },

    // Delete employee
    delete: async (id: number): Promise<void> => {
        await axios.delete(`${EMPLOYEES_URL}/${id}`);
    },

    // Toggle employee active status
    toggleActive: async (id: number, isActive: boolean): Promise<Employee> => {
        const response = await axios.patch(`${EMPLOYEES_URL}/${id}/active`, { is_active: isActive });
        return response.data;
    },

    // Import employees from Excel file
    import: async (file: File): Promise<Employee[]> => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(`${EMPLOYEES_URL}/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.employees;
    }
}; 