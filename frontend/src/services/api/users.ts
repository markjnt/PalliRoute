import axios from 'axios';
import { User, UserFormData } from '../../types/models';

export const usersApi = {
    async getUsers(): Promise<User[]> {
        try {
            const response = await axios.get('/users/');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch users:', error);
            throw error;
        }
    },

    async getUser(id: number): Promise<User> {
        try {
            const response = await axios.get(`/users/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch user with id ${id}:`, error);
            throw error;
        }
    },

    async createUser(userData: UserFormData): Promise<User> {
        try {
            const response = await axios.post('/users/', userData);
            return response.data;
        } catch (error) {
            console.error('Failed to create user:', error);
            throw error;
        }
    },

    async updateUser(id: number, userData: Partial<UserFormData>): Promise<User> {
        try {
            const response = await axios.put(`/users/${id}`, userData);
            return response.data;
        } catch (error) {
            console.error('Failed to update user:', error);
            throw error;
        }
    },

    async deleteUser(id: number): Promise<void> {
        try {
            await axios.delete(`/users/${id}`);
        } catch (error) {
            console.error('Failed to delete user:', error);
            throw error;
        }
    }
}; 