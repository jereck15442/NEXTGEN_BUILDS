import { apiClient } from './client.js';

export const cartAPI = {
  get: async ({ signal } = {}) => {
    const response = await apiClient.get('/cart', { signal });
    return response.data;
  },

  addItem: async ({ productId, quantity }) => {
    const response = await apiClient.post('/cart/items', { productId, quantity });
    return response.data;
  },

  updateItem: async (productId, quantity) => {
    const response = await apiClient.patch(`/cart/items/${productId}`, { quantity });
    return response.data;
  },

  removeItem: async (productId) => {
    const response = await apiClient.delete(`/cart/items/${productId}`);
    return response.data;
  },
};