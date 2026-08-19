import axios from 'axios';

const getApiUrl = () => {
  const envUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL;

  // Production / configured environment
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Local development fallback only
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }

  // Production should never silently use localhost/:5000
  console.error('VITE_API_BASE_URL is not configured');
  return '/api';
};

export const API_BASE_URL = getApiUrl();

// Axios global network error interceptor for instant poor connection detection
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && (!error.response || error.code === 'ERR_NETWORK' || (error.message && error.message.includes('Network Error')))) {
      window.dispatchEvent(new Event('foodway_network_error'));
    }
    return Promise.reject(error);
  }
);

export default API_BASE_URL;
