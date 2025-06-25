import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base URL for local development with correct path
const baseURL = ''; // Empty base URL to use relative paths with the proxy

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set a reasonable timeout - increased for large file uploads
  timeout: 300000, // 5 minutes for large CSV uploads
});

// Add detailed logging functions
// logRequest and hasApiPath removed as they are unused

const logResponse = (response: AxiosResponse) => {
  return response;
};

const logError = (error: AxiosError) => {
  if (error.response) {
    // The request was made and the server responded with a status code outside of 2xx
  } else if (error.request) {
    // The request was made but no response was received
  } else {
    // Something happened in setting up the request that triggered an Error
  }
};

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get the latest token from localStorage
    const token = localStorage.getItem('token');

    // Add additional debugging
    console.log(`Token from localStorage: ${token ? 'Present' : 'Not present'}`);

    // Only set the token if it exists and add it properly formatted
    if (token) {
      // Make sure we always add 'Bearer ' prefix if not present
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      console.log(`Authorization header set: ${config.headers.Authorization}`);
    } else {
      console.warn('No auth token found in localStorage');
    }

    // Make sure all API requests start with /api
    if (config.url) {
      // Strip any leading slash for consistency
      let url = config.url.startsWith('/') ? config.url.substring(1) : config.url;

      // Add /api/ prefix if not already present and not a full URL
      if (!url.includes('://') && !url.startsWith('api/')) {
        url = 'api/' + url;
      }

      // Always add leading slash for absolute path
      config.url = '/' + url;

      // Log the normalized URL
      console.log(`Normalized URL: ${config.url}`);
    }

    // Log the request
    console.log('Sending Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response
    console.log(`[API] Response from ${response.config.url}:`, response.data);
    return response;
  },
  (error: AxiosError) => {
    // Log detailed error information
    console.error(
      `[API] Response error from ${error.config?.url}:`,
      // Check if error.response?.data is an object before stringifying
      typeof error.response?.data === 'object' && error.response?.data !== null
        ? JSON.stringify(error.response.data, null, 2)
        : error.message
    );
    
    // Special handling for authentication errors
    if (error.response?.status === 401) {
      console.warn('Authentication error - token may be invalid');

      // Clear invalid token
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        console.log('Clearing invalid token from localStorage');
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');

        // Optional: redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    // Network errors need special handling
    if (error.message === 'Network Error') {
      console.error('Network error - server may be down');
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out - server may be overloaded');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
