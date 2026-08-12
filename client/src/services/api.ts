import axios from 'axios';
import { getToken, clearSession } from '../utils/auth.utils';
import { API_BASE_URL } from '../utils/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Dynamically resolve host & attach Bearer Token automatically
api.interceptors.request.use(
  (config) => {
    // Dynamic IP resolution for mobile phone testing on Wi-Fi
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol || 'http:';
      
      // If current page is opened via local IP (e.g. 192.168.1.102) but request baseURL is localhost
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && config.baseURL && (config.baseURL.includes('localhost') || config.baseURL.includes('127.0.0.1'))) {
        config.baseURL = `${protocol}//${hostname}:5000/api`;
      }
    }

    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 & 403 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401 || status === 403) {
        console.warn(`[API Interceptor] Auth error (${status}). Clearing session and redirecting to /login.`);
        clearSession();

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
