import axios from 'axios';
import { Route, Weekday } from '../../types/models';

export const routesApi = {
    // Get all routes with optional filtering
    async getRoutes(params?: {
        employee_id?: number;
        weekday?: Weekday;
        date?: string;
    }): Promise<Route[]> {
        try {
            const response = await axios.get('/routes', { params });
            return response.data.routes || [];
        } catch (error) {
            console.error('Failed to fetch routes:', error);
            throw error;
        }
    },

    // Get a single route by ID
    async getRouteById(id: number): Promise<Route> {
        try {
            const response = await axios.get(`/routes/${id}`);
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
            const response = await axios.get('/routes', { params });
            return response.data.routes || [];
        } catch (error) {
            console.error(`Failed to fetch routes for date ${date}:`, error);
            throw error;
        }
    },

    // Optimize routes for a specific day and employee
    async optimizeRoutes(weekday: string, employeeId: number): Promise<void> {
        try {
            const response = await axios.post(`/routes/optimize`, {
                weekday: weekday.toLowerCase(),
                employee_id: employeeId
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 400) {
                    throw new Error(error.response.data.error || 'Invalid request');
                } else if (error.response?.status === 500) {
                    throw new Error(error.response.data.error || 'Server error occurred');
                }
            }
            throw error;
        }
    },

    // Reorder an appointment up or down in a route
    async reorderAppointment(routeId: number, appointmentId: number, direction: 'up' | 'down'): Promise<Route> {
        try {
            const response = await axios.put(`/routes/${routeId}`, {
                appointment_id: appointmentId,
                direction: direction
            });
            return response.data.route;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 400) {
                    throw new Error(error.response.data.error || 'Invalid request');
                } else if (error.response?.status === 404) {
                    throw new Error('Route or appointment not found');
                } else if (error.response?.status === 500) {
                    throw new Error(error.response.data.error || 'Server error occurred');
                }
            }
            console.error(`Failed to reorder appointment in route ${routeId}:`, error);
            throw error;
        }
    }
};
