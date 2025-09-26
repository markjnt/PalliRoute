import api from './api';

export interface EmployeePlanningData {
    id?: number;
    employee_id: number;
    weekday: string;
    status: 'available' | 'vacation' | 'sick' | 'custom';
    custom_text?: string;
    calendar_week?: number;
    created_at?: string;
    updated_at?: string;
    has_conflicts?: boolean;
    appointments_count?: number;
}


export const employeePlanningApi = {
    // Get all planning entries for current week
    getAll: (calendarWeek?: number) => {
        const params = calendarWeek ? `?calendar_week=${calendarWeek}` : '';
        return api.get(`/employee-planning/${params}`);
    },

    // Update planning status for employee and weekday
    update: (employeeId: number, weekday: string, data: {
        status: 'available' | 'vacation' | 'sick' | 'custom';
        custom_text?: string;
        calendar_week?: number;
    }) => {
        return api.put(`/employee-planning/${employeeId}/${weekday}`, data);
    },


    // Check for conflicts before updating
    checkConflicts: (employeeId: number, weekday: string, calendarWeek?: number) => {
        const params = calendarWeek ? `?calendar_week=${calendarWeek}` : '';
        return api.get(`/employee-planning/check-conflicts/${employeeId}/${weekday}${params}`);
    }
};
