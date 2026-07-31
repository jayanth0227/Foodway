const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If the env variable is configured with a production domain, use it directly.
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  
  // Dynamically resolve local IP address for mobile/other devices on the local network.
  const hostname = window.location.hostname;
  return `http://${hostname}:5000/api`;
};

export const API_BASE_URL = getApiUrl();
export default API_BASE_URL;
