import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken } from '../services/authToken.service';

// Base URL for local development with correct path
const baseURL = import.meta.env.VITE_API_BASE || '/api';

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
    // Get the latest token using our centralized token service
    const token = getToken();

    // Add additional debugging
    console.log(`Token from authToken service: ${token ? 'Present' : 'Not present'}`);

    // Only set the token if it exists and add it properly formatted
    if (token) {
      // Make sure we always add 'Bearer ' prefix if not present
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      console.log(`Authorization header set: ${config.headers.Authorization}`);
    } else {
      console.warn('No auth token found in authToken service');
    }

    // Make sure all API requests start with /api
    if (config.url) {
      // Strip any leading slash for consistency
      let url = config.url.startsWith('/') ? config.url.substring(1) : config.url;

      // Add /api/ prefix if not already present and not a full URL
      if (!config.url.startsWith('/api/') && !config.url.includes('://')) {
        const path = config.url.startsWith('/') ? config.url.substring(1) : config.url;
        config.url = `/api/${path}`;
      }

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

      // Check if this is an OAuth-related endpoint
      const isOAuthRelatedEndpoint = 
        error.config?.url?.includes('/oauth/') || 
        error.config?.url?.includes('/groupme/oauth') ||
        error.config?.url?.includes('/groupme/token') ||
        error.config?.url?.includes('/groupme/callback') ||
        error.config?.url?.includes('/groupme/config');
      
      // Only clear token and redirect if:
      // 1. Not already on login page
      // 2. Not an OAuth-related endpoint
      // 3. Not during a page refresh (check referrer)
      const currentPath = window.location.pathname;
      const isRefresh = document.referrer === window.location.href;
      
      if (currentPath !== '/login' && !isOAuthRelatedEndpoint && !isRefresh) {
        console.log('Clearing invalid token from localStorage and redirecting to login');
        
        // Use our centralized token service to clear the token
        // This will handle removing from localStorage and updating axios instances
        import('../services/authToken.service').then(authTokenService => {
          authTokenService.clearToken();
          
          // Store the current URL to redirect back after login
          sessionStorage.setItem('redirect_after_login', window.location.pathname);

          // Redirect to login page after a short delay to allow other requests to complete
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }, 100);
        });
      } else {
        console.log('Not redirecting to login because:', {
          currentPath,
          isLoginPage: currentPath === '/login',
          isOAuthEndpoint: isOAuthRelatedEndpoint,
          isRefresh
        });
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

// Make the instance available globally for debugging and emergency fixes
if (typeof window !== 'undefined') {
  window.axiosInstance = axiosInstance;
}

export default axiosInstance;
