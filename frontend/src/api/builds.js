import { apiClient } from './client.js';

export const buildsAPI = {
  create: async ({ name, components }) => {
    const response = await apiClient.post('/builds', { name, components });
    return response.data;
  },

  list: async ({ signal } = {}) => {
    const response = await apiClient.get('/builds', { signal });
    return response.data;
  },

  get: async (id) => {
    const response = await apiClient.get(`/builds/${id}`);
    return response.data;
  },

  addToCart: async (id) => {
    const response = await apiClient.post(`/builds/${id}/cart`);
    return response.data;
  },
};