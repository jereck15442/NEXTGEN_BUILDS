import { apiClient } from './client.js';

export const ordersAPI = {
  create: async () => {
    const response = await apiClient.post('/orders');
    return response.data;
  },

  list: async ({ page = 1, limit = 20, signal } = {}) => {
    const response = await apiClient.get('/orders', { params: { page, limit }, signal });
    return response.data;
  },

  get: async (id, { signal } = {}) => {
    const response = await apiClient.get(`/orders/${id}`, { signal });
    return response.data;
  },

  cancel: async (id) => {
    const response = await apiClient.post(`/orders/${id}/cancel`);
    return response.data;
  },
};