const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  
  // If explicitly configured for production domain (e.g. https://api.mkdeliveryservices.com/v1)
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // In browser, dynamically resolve current hostname from address bar
  // No static IP address is hardcoded, ensuring instant access on any device on any network
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol || 'http:';
    return `${protocol}//${hostname}:5000/api`;
  }
  
  return '/api';
};

export const API_BASE_URL = getApiUrl();
export default API_BASE_URL;
