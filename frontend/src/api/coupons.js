import { apiClient } from './client.js';

export const couponsAPI = {
  apply: async ({ code }) => {
    const response = await apiClient.post('/coupons/apply', { code });
    return response.data;
  },
};
