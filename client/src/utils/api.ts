import axios from 'axios';

const getApiUrl = () => {
  let envUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL;

  // If no env variable set, use default port 5000 in dev mode
  if (!envUrl) {
    if (import.meta.env.DEV) {
      envUrl = 'http://localhost:5000/api';
    } else {
      console.error('VITE_API_BASE_URL is not configured');
      return '/api';
    }
  }

  let finalUrl = envUrl.replace(/\/$/, '');

  // Dynamic IP resolution for testing on Wi-Fi network host (e.g., 192.168.x.x, 10.x.x.x)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    if (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      (finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1'))
    ) {
      const protocol = window.location.protocol || 'http:';
      finalUrl = finalUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1)/g, `${protocol}//${hostname}`);
    }
  }

  return finalUrl;
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
