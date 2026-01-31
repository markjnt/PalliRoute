import api from './api';

export const configApi = {
    async getGoogleMapsApiKey(): Promise<string> {
        try {
            const response = await api.get('/config/maps-api-key');
            return response.data.apiKey;
        } catch (error) {
            console.error('Failed to fetch Google Maps API key:', error);
            throw error;
        }
    },

    // Get last import time
    async getLastImportTime(): Promise<{ last_import_time: string | null }> {
        try {
            const response = await api.get('/config/last-import-time');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch last import time:', error);
            throw error;
        }
    },

    // Get Stundenkonto stand date (from last Excel upload)
    async getTimeAccountAsOf(): Promise<{ time_account_as_of: string | null }> {
        try {
            const response = await api.get('/config/time-account-as-of');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch time account as-of:', error);
            throw error;
        }
    }
}; 