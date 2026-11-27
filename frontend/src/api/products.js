import { apiClient } from './client.js';

export const productsAPI = {
  list: async ({ page = 1, limit = 20, category, search, sort, signal } = {}) => {
    const params = { page, limit };
    if (category) params.category = category;
    if (search) params.search = search;
    if (sort) params.sort = sort;
    const response = await apiClient.get('/products', { params, signal });
    return response.data;
  },

  get: async (id, { signal } = {}) => {
    const response = await apiClient.get(`/products/${id}`, { signal });
    return response.data;
  },

  create: async (productData) => {
    const response = await apiClient.post('/products', productData);
    return response.data;
  },

  update: async (id, productData) => {
    const response = await apiClient.patch(`/products/${id}`, productData);
    return response.data;
  },

  deactivate: async (id) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  lowStock: async ({ signal } = {}) => {
    const response = await apiClient.get('/products/admin/low-stock', { signal });
    return response.data;
  },
};