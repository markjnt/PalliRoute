import api from './api';
import { OnCallAssignment, OnCallAssignmentFormData, EmployeeCapacity } from '../../types/models';

export interface OnCallAssignmentsQueryParams {
    start_date?: string;  // YYYY-MM-DD
    end_date?: string;    // YYYY-MM-DD
    calendar_week?: number;
    duty_type?: string;
    area?: string;
    employee_id?: number;
}

export const oncallAssignmentsApi = {
    // Get all on-call assignments with optional filters
    async getAll(params?: OnCallAssignmentsQueryParams): Promise<OnCallAssignment[]> {
        try {
            const response = await api.get('/oncall-assignments/', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch on-call assignments:', error);
            throw error;
        }
    },

    // Get single assignment by ID
    async getById(id: number): Promise<OnCallAssignment> {
        try {
            const response = await api.get(`/oncall-assignments/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch on-call assignment with ID ${id}:`, error);
            throw error;
        }
    },

    // Create new assignment
    async create(assignmentData: OnCallAssignmentFormData): Promise<OnCallAssignment> {
        try {
            const response = await api.post('/oncall-assignments/', assignmentData);
            return response.data;
        } catch (error: any) {
            if (error.response?.status !== 400) {
                console.error('Failed to create on-call assignment:', error);
            }
            throw error;
        }
    },

    // Update existing assignment
    async update(id: number, assignmentData: Partial<OnCallAssignmentFormData>): Promise<OnCallAssignment> {
        try {
            const response = await api.put(`/oncall-assignments/${id}`, assignmentData);
            return response.data;
        } catch (error) {
            console.error(`Failed to update on-call assignment with ID ${id}:`, error);
            throw error;
        }
    },

    // Delete assignment
    async delete(id: number): Promise<void> {
        try {
            await api.delete(`/oncall-assignments/${id}`);
        } catch (error) {
            console.error(`Failed to delete on-call assignment with ID ${id}:`, error);
            throw error;
        }
    },

    // Get capacity information for all employees
    async getAllEmployeesCapacity(month?: number, year?: number): Promise<{ month: number; year: number; capacities: Record<number, EmployeeCapacity> }> {
        try {
            const params: { month?: number; year?: number } = {};
            if (month) params.month = month;
            if (year) params.year = year;
            const response = await api.get('/oncall-assignments/capacity', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch capacity for all employees:', error);
            throw error;
        }
    },

    // Auto plan RB and AW assignments
    async autoPlan(data: {
        existing_assignments_handling: 'overwrite' | 'respect';
        allow_overplanning: boolean;
        include_aplano: boolean;
        start_date?: string;
        end_date?: string;
    }): Promise<{ message: string; settings: any }> {
        try {
            const response = await api.post('/oncall-assignments/auto-plan', data);
            return response.data;
        } catch (error) {
            console.error('Failed to start auto planning:', error);
            throw error;
        }
    },

    // Reset planning for a date range
    async resetPlanning(start_date: string, end_date: string): Promise<{ message: string; deleted_count: number }> {
        try {
            const response = await api.post('/oncall-assignments/reset-planning', {
                start_date,
                end_date,
            });
            return response.data;
        } catch (error) {
            console.error('Failed to reset planning:', error);
            throw error;
        }
    },

};

