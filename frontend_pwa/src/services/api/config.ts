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
    }
}; 