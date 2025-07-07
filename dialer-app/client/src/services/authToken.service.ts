import axios from 'axios';

/**
 * Centralized service for managing authentication tokens
 * This ensures all components use the same token and are notified of changes
 */

// Store the current token in memory
let currentToken: string | null = localStorage.getItem('token');

// Log initial token status on module load
console.log('AuthToken service loaded, initial token status:', currentToken ? 'Present' : 'Not present');

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
    console.log('Token changed in localStorage, updating in-memory token');
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
    console.log('Updated axiosInstance Authorization header');
  } else {
    console.warn('Global axiosInstance not available when setting token');
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
    // Try multiple storage locations for backup token
    const backupSources = [
      sessionStorage.getItem('groupme_auth_token_backup'),
      localStorage.getItem('auth_token_backup'),
      sessionStorage.getItem('auth_token_backup')
    ];
    
    // Find the first valid backup token
    const backupToken = backupSources.find(token => token && token !== 'undefined' && token !== 'null');
    
    if (backupToken) {
      console.log('Restoring auth token from backup - token length:', backupToken.length);
      
      // Set the token which will update localStorage and axios
      setToken(backupToken);
      
      // Clean up all backups
      sessionStorage.removeItem('groupme_auth_token_backup');
      localStorage.removeItem('auth_token_backup');
      sessionStorage.removeItem('auth_token_backup');
      
      // Notify listeners
      dispatchTokenEvent(AUTH_TOKEN_RESTORED, { token: backupToken });
      
      console.log('Auth token restored successfully');
      return true;
    } else {
      console.warn('No backup token found in any storage location');
      
      // Check if there's already a token in localStorage as a last resort
      const existingToken = localStorage.getItem('token');
      if (existingToken) {
        console.log('Using existing token in localStorage as fallback');
        
        // Make sure axios is configured with the existing token
        const formattedToken = existingToken.startsWith('Bearer ') ? existingToken : `Bearer ${existingToken}`;
        axios.defaults.headers.common['Authorization'] = formattedToken;
        
        if (typeof window !== 'undefined' && window.axiosInstance) {
          window.axiosInstance.defaults.headers.common['Authorization'] = formattedToken;
          console.log('Updated axiosInstance with existing token');
        }
        
        dispatchTokenEvent(AUTH_TOKEN_RESTORED, { token: existingToken });
        return true;
      }
      
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
      console.log('Backing up current auth token - token length:', currentToken.length);
      
      // Store in multiple locations for redundancy
      sessionStorage.setItem('groupme_auth_token_backup', currentToken);
      localStorage.setItem('auth_token_backup', currentToken);
      sessionStorage.setItem('auth_token_backup', currentToken);
      
      return true;
    } else {
      console.warn('No token found in localStorage to backup');
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
  console.log('Initializing token service');
  const token = localStorage.getItem('token');
  console.log('Token from localStorage:', token ? 'Present' : 'Not present');
  
  if (token) {
    console.log('Setting token during initialization');
    setToken(token);
  } else {
    console.log('No token found during initialization');
  }
  
  // Listen for storage events (for multi-tab support)
  window.addEventListener('storage', (event) => {
    console.log('Storage event detected:', event.key);
    if (event.key === 'token') {
      if (event.newValue) {
        console.log('Token updated in another tab, syncing');
        setToken(event.newValue);
      } else {
        console.log('Token cleared in another tab, syncing');
        clearToken();
      }
    }
  });
  
  console.log('Token service initialization complete');
};

/**
 * Helper function to dispatch token events
 */
export const dispatchTokenEvent = (eventName: string, detail: any = {}): void => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
    console.log(`Token event dispatched: ${eventName}`);
  }
};

// Initialize the token service when imported
if (typeof window !== 'undefined') {
  console.log('Window detected, initializing token service');
  initializeToken();
} else {
  console.log('No window object, skipping token service initialization');
}

export default {
  getToken,
  setToken,
  clearToken,
  restoreTokenFromBackup,
  backupCurrentToken,
  initializeToken,
}; 