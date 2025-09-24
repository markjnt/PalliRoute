import api from './api';
import { Route, Weekday } from '../../types/models';
import { getCurrentCalendarWeek, getBestCalendarWeek } from '../../utils/calendarUtils';
import { patientsApi } from './patients';
import { calendarWeekService } from './calendarWeek';

export const routesApi = {
    // Get all routes with optional filtering for current or latest available calendar week
    async getRoutes(params?: {
        employee_id?: number;
        weekday?: Weekday;
        date?: string;
    }): Promise<Route[]> {
        try {
            // Use the calendar week service to get the best week
            const weekToUse = await calendarWeekService.getBestWeek();
            const queryParams = { ...params, calendar_week: weekToUse };
            const response = await api.get('/routes/', { params: queryParams });
            return response.data.routes || [];
        } catch (error) {
            console.error('Failed to fetch routes:', error);
            throw error;
        }
    },

    // Get a single route by ID
    async getRouteById(id: number): Promise<Route> {
        try {
            const response = await api.get(`/routes/${id}`);
            return response.data.route;
        } catch (error) {
            console.error(`Failed to fetch route with ID ${id}:`, error);
            throw error;
        }
    },

    // Get routes for a specific day and employee for current or latest available calendar week
    async getRoutesForDay(date: string, employee_id?: number): Promise<Route[]> {
        try {
            // Use the calendar week service to get the best week
            const weekToUse = await calendarWeekService.getBestWeek();
            
            const params: { date: string; employee_id?: number; calendar_week: number } = { 
                date, 
                calendar_week: weekToUse 
            };
            if (employee_id) {
                params.employee_id = employee_id;
            }
            const response = await api.get('/routes', { params });
            return response.data.routes || [];
        } catch (error) {
            console.error(`Failed to fetch routes for date ${date}:`, error);
            throw error;
        }
    },

    // Optimize routes for a specific day and employee
    async optimizeRoutes(weekday: string, employeeId: number): Promise<void> {
        try {
            const response = await api.post(`/routes/optimize`, {
                weekday: weekday.toLowerCase(),
                employee_id: employeeId
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to optimize routes for weekday ${weekday} and employee ${employeeId}:`, error);
            throw error;
        }
    },

    // Optimize weekend routes for a specific day and area
    async optimizeWeekendRoutes(weekday: string, area: string): Promise<void> {
        try {
            const response = await api.post(`/routes/optimize`, {
                weekday: weekday.toLowerCase(),
                area: area
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to optimize weekend routes for weekday ${weekday} and area ${area}:`, error);
            throw error;
        }
    },

    // Reorder an appointment in a route using direction or index
    async reorderAppointment(
        routeId: number, 
        appointmentId: number, 
        options: { direction?: 'up' | 'down'; index?: number }
    ): Promise<Route> {
        try {
            const payload: { appointment_id: number; direction?: string; index?: number } = {
                appointment_id: appointmentId
            };

            if (options.direction) {
                payload.direction = options.direction;
            } else if (options.index !== undefined) {
                payload.index = options.index;
            } else {
                throw new Error('Either direction or index must be provided');
            }

            const response = await api.put(`/routes/${routeId}`, payload);
            return response.data.route;
        } catch (error) {
            console.error(`Failed to reorder appointment in route ${routeId}:`, error);
            throw error;
        }
    }
};
