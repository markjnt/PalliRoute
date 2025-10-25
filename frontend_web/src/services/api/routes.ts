import api from './api';
import { Route, Weekday } from '../../types/models';

export const routesApi = {
    // Get all routes with optional filtering
    async getRoutes(params?: {
        employee_id?: number;
        weekday?: Weekday;
        date?: string;
        area?: string;
        weekend_only?: boolean;
        calendar_week?: number;
    }): Promise<Route[]> {
        try {
            const response = await api.get('/routes/', { params });
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

    // Get routes for a specific day and employee
    async getRoutesForDay(date: string, employee_id?: number): Promise<Route[]> {
        try {
            const params: { date: string; employee_id?: number } = { date };
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
    async optimizeRoutes(weekday: string, employeeId: number, calendarWeek?: number): Promise<void> {
        try {
            const requestData: any = {
                weekday: weekday.toLowerCase(),
                employee_id: employeeId
            };
            if (calendarWeek) {
                requestData.calendar_week = calendarWeek;
            }
            const response = await api.post(`/routes/optimize`, requestData);
            return response.data;
        } catch (error) {
            console.error(`Failed to optimize routes for weekday ${weekday} and employee ${employeeId}:`, error);
            throw error;
        }
    },

    // Optimize weekend routes for a specific day and area
    async optimizeWeekendRoutes(weekday: string, area: string, calendarWeek?: number): Promise<void> {
        try {
            const requestData: any = {
                weekday: weekday.toLowerCase(),
                area: area
            };
            if (calendarWeek) {
                requestData.calendar_week = calendarWeek;
            }
            const response = await api.post(`/routes/optimize`, requestData);
            return response.data;
        } catch (error) {
            console.error(`Failed to optimize weekend routes for weekday ${weekday} and area ${area}:`, error);
            throw error;
        }
    },

    // Reorder an appointment up or down in a route
    async reorderAppointment(routeId: number, appointmentId: number, direction: 'up' | 'down'): Promise<Route> {
        try {
            const response = await api.put(`/routes/${routeId}`, {
                appointment_id: appointmentId,
                direction: direction
            });
            return response.data.route;
        } catch (error) {
            console.error(`Failed to reorder appointment in route ${routeId}:`, error);
            throw error;
        }
    },

    // Download route PDF for a calendar week
    async downloadRoutePdf(calendarWeek: number): Promise<void> {
        try {
            const response = await api.get('/routes/download-pdf', {
                params: { calendar_week: calendarWeek },
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `PalliRoute_Routenplanung_KW${calendarWeek}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`Failed to download route PDF for calendar week ${calendarWeek}:`, error);
            throw error;
        }
    }
};
