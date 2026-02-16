import api from './api';
import { Pflegeheim, PflegeheimImportResponse } from '../../types/models';

export const pflegeheimeApi = {
  async getAll(): Promise<Pflegeheim[]> {
    try {
      const response = await api.get('/pflegeheime/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch pflegeheime:', error);
      throw error;
    }
  },

  async import(): Promise<PflegeheimImportResponse> {
    try {
      const response = await api.post('/pflegeheime/import');
      return response.data;
    } catch (error) {
      console.error('Failed to import pflegeheime from Excel:', error);
      throw error;
    }
  },
};
