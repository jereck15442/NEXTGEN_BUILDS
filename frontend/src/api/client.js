import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: inject auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle error envelope and auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response: res } = error;

    if (!res) {
      const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
      if (isTimeout) {
        return Promise.reject({
          code: 'TIMEOUT',
          message: 'The request took too long. Please try again.',
          status: 0,
          isOffline: false,
        });
      }

      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'No internet connection. Please check your network and try again.',
        status: 0,
        isOffline: true,
      });
    }

    const { status, data } = res;

    // Handle 401 — clear auth and redirect
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    // Normalize error into a consistent shape
    const normalized = {
      code: data?.error?.code || `HTTP_${status}`,
      message: data?.error?.message || data?.message || 'An unexpected error occurred',
      details: data?.error?.details || data?.details || {},
      status,
      requestId: data?.requestId,
      isOffline: false,
    };

    return Promise.reject(normalized);
  }
);

export { apiClient };
export default apiClient;