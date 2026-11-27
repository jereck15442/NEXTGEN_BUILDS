import { apiClient } from './client.js';

export const compatibilityAPI = {
  check: async (components) => {
    const response = await apiClient.post('/compatibility/check', { components });
    return response.data;
  },
};
