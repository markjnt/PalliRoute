import api from './api';
import {
    ShiftDefinition,
    ShiftInstance,
    EmployeeCapacity,
    Assignment,
    ShiftCategory,
    ShiftRole,
    ShiftArea,
    ShiftTimeOfDay,
    CapacityType,
    AssignmentSource
} from '../../types/models';

// Query parameter types
export interface ShiftDefinitionsQueryParams {
    category?: ShiftCategory;
    role?: ShiftRole;
    area?: ShiftArea;
    time_of_day?: ShiftTimeOfDay;
    is_weekday?: boolean;
    is_weekend?: boolean;
}

export interface ShiftInstancesQueryParams {
    start_date?: string;  // YYYY-MM-DD
    end_date?: string;    // YYYY-MM-DD
    month?: string;       // YYYY-MM
    calendar_week?: number;
    shift_definition_id?: number;
    category?: ShiftCategory;
    role?: ShiftRole;
    area?: ShiftArea;
}

export interface EmployeeCapacitiesQueryParams {
    employee_id?: number;
    month?: string;  // YYYY-MM (optional, for calculating assigned/remaining, defaults to current month)
    capacity_type?: CapacityType;
}

export interface AssignmentsQueryParams {
    employee_id?: number;
    shift_instance_id?: number;
    shift_definition_id?: number;
    start_date?: string;  // YYYY-MM-DD
    end_date?: string;    // YYYY-MM-DD
    category?: ShiftCategory;
    role?: ShiftRole;
    area?: ShiftArea;
    source?: AssignmentSource;
}

export interface CreateShiftDefinitionData {
    category: ShiftCategory;
    role: ShiftRole;
    area: ShiftArea;
    time_of_day: ShiftTimeOfDay;
    is_weekday: boolean;
    is_weekend: boolean;
}

export type CreateShiftInstanceData =
    | {
        shift_definition_id: number;
        date: string;  // YYYY-MM-DD
      }
    | {
        category: ShiftCategory;
        role: ShiftRole;
        area: ShiftArea;
        time_of_day: ShiftTimeOfDay;
        date: string;  // YYYY-MM-DD
      };

export interface GenerateShiftInstancesData {
    month: string;  // YYYY-MM
    category?: ShiftCategory;
    role?: ShiftRole;
    area?: ShiftArea;
}

export type CreateAssignmentData =
    | {
        shift_instance_id: number;
        employee_id: number;
        source?: AssignmentSource;
      }
    | {
        shift_definition_id: number;
        date: string;  // YYYY-MM-DD
        employee_id: number;
        source?: AssignmentSource;
      };

export interface UpdateAssignmentData {
    employee_id?: number;
    source?: AssignmentSource;
}

export interface AutoPlanData {
    start_date: string;  // YYYY-MM-DD
    end_date: string;    // YYYY-MM-DD
    existing_assignments_handling?: 'overwrite' | 'respect';
    allow_overplanning?: boolean;
    include_aplano?: boolean;
}

export interface ResetPlanningData {
    start_date: string;  // YYYY-MM-DD
    end_date: string;    // YYYY-MM-DD
}

export const schedulingApi = {
    // Shift Definitions
    async getShiftDefinitions(params?: ShiftDefinitionsQueryParams): Promise<ShiftDefinition[]> {
        try {
            const response = await api.get('/scheduling/shift-definitions', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch shift definitions:', error);
            throw error;
        }
    },

    async createShiftDefinition(data: CreateShiftDefinitionData): Promise<ShiftDefinition> {
        try {
            const response = await api.post('/scheduling/shift-definitions', data);
            return response.data;
        } catch (error: any) {
            if (error.response?.status !== 400) {
                console.error('Failed to create shift definition:', error);
            }
            throw error;
        }
    },

    // Shift Instances
    async getShiftInstances(params?: ShiftInstancesQueryParams): Promise<ShiftInstance[]> {
        try {
            const response = await api.get('/scheduling/shift-instances', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch shift instances:', error);
            throw error;
        }
    },

    async createShiftInstance(data: CreateShiftInstanceData): Promise<ShiftInstance> {
        try {
            const response = await api.post('/scheduling/shift-instances', data);
            return response.data;
        } catch (error: any) {
            if (error.response?.status !== 400) {
                console.error('Failed to create shift instance:', error);
            }
            throw error;
        }
    },

    async generateShiftInstances(data: GenerateShiftInstancesData): Promise<{
        message: string;
        month: string;
        created: number;
        existing: number;
        instances: Array<{ id: number; date: string; shift_definition_id: number }>;
    }> {
        try {
            const response = await api.post('/scheduling/shift-instances/generate', data);
            return response.data;
        } catch (error) {
            console.error('Failed to generate shift instances:', error);
            throw error;
        }
    },

    // Employee Capacities
    async getEmployeeCapacities(params?: EmployeeCapacitiesQueryParams): Promise<EmployeeCapacity[]> {
        try {
            const response = await api.get('/scheduling/employee-capacities', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch employee capacities:', error);
            throw error;
        }
    },

    // Assignments
    async getAssignments(params?: AssignmentsQueryParams): Promise<Assignment[]> {
        try {
            const response = await api.get('/scheduling/assignments', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
            throw error;
        }
    },

    async createAssignment(data: CreateAssignmentData): Promise<Assignment> {
        try {
            const response = await api.post('/scheduling/assignments', data);
            return response.data;
        } catch (error: any) {
            if (error.response?.status !== 400) {
                console.error('Failed to create assignment:', error);
            }
            throw error;
        }
    },

    async updateAssignment(id: number, data: UpdateAssignmentData): Promise<Assignment> {
        try {
            const response = await api.put(`/scheduling/assignments/${id}`, data);
            return response.data;
        } catch (error) {
            console.error(`Failed to update assignment with ID ${id}:`, error);
            throw error;
        }
    },

    async deleteAssignment(id: number): Promise<void> {
        try {
            await api.delete(`/scheduling/assignments/${id}`);
        } catch (error) {
            console.error(`Failed to delete assignment with ID ${id}:`, error);
            throw error;
        }
    },

    // Upload Stundenkonto Excel (columns: Mitarbeiter, Stundenkonto); saves time_account on employees and stand date from filename
    async uploadTimeAccounts(file: File): Promise<{ time_account_as_of: string; updated_count: number }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/scheduling/time-accounts-upload', formData);
        return response.data;
    },

    // Auto Plan
    async autoPlan(data: AutoPlanData): Promise<{ message: string; assignments_created?: number; total_planned?: number }> {
        try {
            const response = await api.post('/scheduling/auto-plan', data);
            return response.data;
        } catch (error) {
            console.error('Failed to start auto planning:', error);
            throw error;
        }
    },

    // Reset Planning
    async resetPlanning(data: ResetPlanningData): Promise<{ message: string; deleted_count: number }> {
        try {
            const response = await api.post('/scheduling/reset-planning', data);
            return response.data;
        } catch (error) {
            console.error('Failed to reset planning:', error);
            throw error;
        }
    },
};
