import { apiClient } from './client.js';

export const advisorAPI = {
  recommend: async ({ budget, usage }) => {
    const response = await apiClient.post('/advisor/recommend', { budget, usage }, { timeout: 60000 });
    return response.data;
  },
};