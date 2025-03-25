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

    // Create a new route
    async createRoute(routeData: Partial<Route>): Promise<Route> {
        try {
            const response = await axios.post('/routes', routeData);
            return response.data.route;
        } catch (error) {
            console.error('Failed to create route:', error);
            throw error;
        }
    },

    // Update an existing route
    async updateRoute(id: number, routeData: Partial<Route>): Promise<Route> {
        try {
            const response = await axios.put(`/routes/${id}`, routeData);
            return response.data.route;
        } catch (error) {
            console.error(`Failed to update route with ID ${id}:`, error);
            throw error;
        }
    },

    // Delete a route
    async deleteRoute(id: number): Promise<void> {
        try {
            await axios.delete(`/routes/${id}`);
        } catch (error) {
            console.error(`Failed to delete route with ID ${id}:`, error);
            throw error;
        }
    },

    // Optimize routes for a specific day
    async optimizeRoutes(date: string, employee_ids?: number[]): Promise<any> {
        try {
            const data: { date: string; employee_ids?: number[] } = { date };
            if (employee_ids && employee_ids.length > 0) {
                data.employee_ids = employee_ids;
            }
            const response = await axios.post('/routes/optimize', data);
            return response.data;
        } catch (error) {
            console.error(`Failed to optimize routes for date ${date}:`, error);
            throw error;
        }
    }
};
