import api from './api';

export interface EmployeePlanningData {
    id?: number;
    employee_id: number;
    weekday: string;
    available: boolean;
    custom_text?: string;
    replacement_id?: number;
    replacement_employee?: {
        id: number;
        first_name: string;
        last_name: string;
        function: string;
    };
    calendar_week?: number;
    created_at?: string;
    updated_at?: string;
    has_conflicts?: boolean;
    appointments_count?: number;
    patient_count?: number;
}


export const employeePlanningApi = {
    // Get all planning entries for current week
    getAll: (calendarWeek?: number) => {
        const params = calendarWeek ? `?calendar_week=${calendarWeek}` : '';
        return api.get(`/employee-planning/${params}`);
    },

    // Update planning availability for employee and weekday
    update: (employeeId: number, weekday: string, data: {
        available: boolean;
        custom_text?: string; // optional reason when unavailable
        replacement_id?: number;
        calendar_week?: number;
    }) => {
        return api.put(`/employee-planning/${employeeId}/${weekday}`, data);
    },

    // Update replacement for employee and weekday
    updateReplacement: (employeeId: number, weekday: string, data: {
        replacement_id?: number;
        calendar_week?: number;
    }) => {
        return api.put(`/employee-planning/${employeeId}/${weekday}/replacement`, data);
    },

    

};
