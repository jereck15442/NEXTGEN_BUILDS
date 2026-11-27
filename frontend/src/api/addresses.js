import { apiClient } from './client.js';

export const addressesAPI = {
  list: async ({ signal } = {}) => {
    const response = await apiClient.get('/addresses', { signal });
    return response.data;
  },

  get: async (id, { signal } = {}) => {
    const response = await apiClient.get(`/addresses/${id}`, { signal });
    return response.data;
  },

  create: async (addressData, { signal } = {}) => {
    const response = await apiClient.post('/addresses', addressData, { signal });
    return response.data;
  },

  update: async (id, addressData, { signal } = {}) => {
    const response = await apiClient.patch(`/addresses/${id}`, addressData, { signal });
    return response.data;
  },
};