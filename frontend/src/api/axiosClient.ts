import axios from 'axios';
import { clearSession, getStoredToken } from '@/lib/authStorage';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api', // Adjusted backend URL
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Si la respuesta usa el sobre { ok: true, data: ... } del backend
    if (response.data && response.data.ok !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    if (error?.response?.status === 401) {
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
