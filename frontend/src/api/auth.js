import { apiClient } from './client.js';

export const authAPI = {
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (_error) {
      // Ignore logout errors — always clear local state
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};