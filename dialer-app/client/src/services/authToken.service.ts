import axios from 'axios';

/**
 * Centralized service for managing authentication tokens
 * This ensures all components use the same token and are notified of changes
 */

// Store the current token in memory
let currentToken: string | null = localStorage.getItem('token');

// Event name constants
export const AUTH_TOKEN_UPDATED = 'auth_token_updated';
export const AUTH_TOKEN_CLEARED = 'auth_token_cleared';
export const AUTH_TOKEN_RESTORED = 'auth_token_restored';

/**
 * Get the current authentication token
 */
export const getToken = (): string | null => {
  // Always check localStorage first in case it was updated elsewhere
  const storedToken = localStorage.getItem('token');
  if (storedToken !== currentToken) {
    currentToken = storedToken;
  }
  return currentToken;
};

/**
 * Set the authentication token
 * This will update localStorage and all axios instances
 */
export const setToken = (token: string): void => {
  console.log('Setting auth token');
  
  // Validate token
  if (!token || token === 'undefined' || token === 'null') {
    console.error('Invalid token provided to setToken:', token);
    return;
  }
  
  currentToken = token;
  localStorage.setItem('token', token);
  
  // Format token for Authorization header
  const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  
  // Update axios default headers
  axios.defaults.headers.common['Authorization'] = formattedToken;
  
  // Update any global axios instance
  if (typeof window !== 'undefined' && window.axiosInstance) {
    window.axiosInstance.defaults.headers.common['Authorization'] = formattedToken;
  }
  
  // Notify listeners
  dispatchTokenEvent(AUTH_TOKEN_UPDATED, { token });
  
  console.log('Auth token set and applied to axios instances');
};

/**
 * Clear the authentication token
 * This will remove the token from localStorage and all axios instances
 */
export const clearToken = (): void => {
  console.log('Clearing auth token');
  
  currentToken = null;
  localStorage.removeItem('token');
  
  // Remove from axios default headers
  delete axios.defaults.headers.common['Authorization'];
  
  // Remove from any global axios instance
  if (typeof window !== 'undefined' && window.axiosInstance) {
    delete window.axiosInstance.defaults.headers.common['Authorization'];
  }
  
  // Notify listeners
  dispatchTokenEvent(AUTH_TOKEN_CLEARED);
  
  console.log('Auth token cleared from axios instances');
};

/**
 * Restore the authentication token from backup
 * This is used during OAuth flows to restore the token after redirection
 */
export const restoreTokenFromBackup = (): boolean => {
  try {
    const backupToken = sessionStorage.getItem('groupme_auth_token_backup');
    if (backupToken) {
      console.log('Restoring auth token from backup');
      
      // Set the token which will update localStorage and axios
      setToken(backupToken);
      
      // Clean up the backup
      sessionStorage.removeItem('groupme_auth_token_backup');
      
      // Notify listeners
      dispatchTokenEvent(AUTH_TOKEN_RESTORED, { token: backupToken });
      
      console.log('Auth token restored from backup');
      return true;
    } else {
      console.warn('No backup token found in sessionStorage');
      return false;
    }
  } catch (error) {
    console.error('Error restoring auth token from backup:', error);
    return false;
  }
};

/**
 * Backup the current authentication token
 * This is used before starting OAuth flows
 */
export const backupCurrentToken = (): boolean => {
  try {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      console.log('Backing up current auth token to sessionStorage');
      sessionStorage.setItem('groupme_auth_token_backup', currentToken);
      return true;
    } else {
      console.warn('No token to backup');
      return false;
    }
  } catch (error) {
    console.error('Error backing up auth token:', error);
    return false;
  }
};

/**
 * Initialize the token service
 * This should be called when the application starts
 */
export const initializeToken = (): void => {
  const token = localStorage.getItem('token');
  if (token) {
    setToken(token);
  }
  
  // Listen for storage events (for multi-tab support)
  window.addEventListener('storage', (event) => {
    if (event.key === 'token') {
      if (event.newValue) {
        setToken(event.newValue);
      } else {
        clearToken();
      }
    }
  });
};

/**
 * Helper function to dispatch token events
 */
const dispatchTokenEvent = (eventName: string, detail: any = {}): void => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }
};

// Initialize the token service when imported
if (typeof window !== 'undefined') {
  initializeToken();
}

export default {
  getToken,
  setToken,
  clearToken,
  restoreTokenFromBackup,
  backupCurrentToken,
  initializeToken,
}; 