import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

// Add window global type declaration
declare global {
  interface Window {
    __checkAuthCount?: number;
  }
}

interface User {
  id: string;
  email: string;
  token: string;
  name: string;
  profilePicture?: string;
  role?: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<any>;
  isLoading: boolean;
  refreshUserData: () => Promise<any>;
}

interface ApiError {
  response?: {
    status?: number;
    data?: any;
  };
  message?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function to get stored user data from localStorage
const getStoredUserData = (): User | null => {
  try {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user_data');

    if (!token || !userData) {
      return null;
    }

    const parsedUser = JSON.parse(userData);
    return {
      id: parsedUser._id,
      email: parsedUser.email,
      name: parsedUser.name,
      token: token,
      profilePicture: parsedUser.profilePicture,
      role: parsedUser.role,
    };
  } catch (error) {
    console.error('Failed to parse stored user data:', error);
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUserData());
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const authCheckInProgress = useRef(false);

  // Function to validate a JWT token
  const isTokenValid = (token: string): boolean => {
    try {
      // Check token format
      if (!token || typeof token !== 'string' || !token.includes('.')) {
        console.error('Invalid token format');
        return false;
      }

      // Parse the JWT payload
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid token parts');
        return false;
      }

      // Decode JWT payload
      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      const currentTime = Date.now() / 1000;
      if (!payload.exp || payload.exp < currentTime) {
        console.error('Token expired');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  useEffect(() => {
    // This function will handle the initial auth check
    const performAuthCheck = async () => {
      // Avoid multiple simultaneous auth checks
      if (authCheckInProgress.current) {
        console.log('Auth check already in progress, skipping');
        return;
      }

      authCheckInProgress.current = true;

      // Add a safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        console.warn('Auth check safety timeout reached, forcing loading to false');
        setIsLoading(false);
        authCheckInProgress.current = false;
      }, 10000); // 10 second safety timeout

      try {
        // Get token from localStorage (the source of truth)
        const token = localStorage.getItem('token');

        // If no token, user is not authenticated
        if (!token) {
          console.log('No token found, user is not authenticated');
          setUser(null);
          setIsLoading(false);
          authCheckInProgress.current = false;
          clearTimeout(safetyTimeout);
          return;
        }

        // Always try to use stored user data first to avoid white screens
        try {
          const userData = localStorage.getItem('user_data');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            // Set user state immediately from localStorage
            setUser({
              id: parsedUser._id,
              email: parsedUser.email,
              name: parsedUser.name,
              token: token,
              profilePicture: parsedUser.profilePicture,
              role: parsedUser.role,
            });

            // Continue with validation in the background
            console.log('User restored from localStorage');
          }
        } catch (parseError) {
          console.error('Failed to parse stored user data:', parseError);
        }

        // Validate token - but don't block rendering on this
        if (!isTokenValid(token)) {
          console.log('Invalid or expired token, will be removed after profile check');
          // We'll let the profile check handle token removal to avoid
          // removing a potentially valid token too early
        }

        // Continue with regular auth check in background
        checkAuth().catch((error) => {
          console.error('Background auth check failed:', error);
          // Don't set loading to false here, as it may have been set already
        });
      } catch (error) {
        console.error('Auth check failed with error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        authCheckInProgress.current = false;
        clearTimeout(safetyTimeout);
      }
    };

    performAuthCheck();
    // No dependencies needed as this should only run once on mount
  }, []);

  // For debugging - log when user state changes
  useEffect(() => {
    if (user) {
      console.log('User state updated:', {
        id: user.id,
        name: user.name,
        email: user.email,
        hasProfilePic: !!user.profilePicture,
        profilePicLength: user.profilePicture ? user.profilePicture.length : 0,
      });
    } else {
      console.log('User state is null');
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping auth check');
        setIsLoading(false);
        return;
      }

      console.log('Checking authentication with token');

      // Set a reasonable timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Auth check timed out');
        controller.abort();
      }, 5000);

      // Add a safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        console.warn('Auth check safety timeout reached, forcing completion');
        setIsLoading(false);
      }, 8000); // 8 second safety timeout

      try {
        const response = await axiosInstance.get('/api/auth/profile', {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`, // Explicitly set the token
          },
        });

        clearTimeout(timeoutId);
        clearTimeout(safetyTimeout);

        if (!response.data || !response.data._id) {
          throw new Error('Invalid user data received');
        }

        // Update user in state
        const userData = {
          id: response.data._id,
          email: response.data.email,
          name: response.data.name,
          profilePicture: response.data.profilePicture,
          token,
          role: response.data.role,
        };

        // Also store in localStorage for persistence
        localStorage.setItem('user_data', JSON.stringify(response.data));

        setUser(userData);
        console.log('Auth check successful, loaded user:', response.data.name);
      } catch (error) {
        clearTimeout(timeoutId);
        clearTimeout(safetyTimeout);
        console.error('Auth request failed:', error);

        // Only clear token if unauthorized and not a network error
        const apiError = error as ApiError;
        if (apiError.response && apiError.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user_data');
          setUser(null);
        } else if (apiError.message !== 'Network Error' && apiError.message !== 'canceled') {
          // Don't clear token on network errors or timeouts
          localStorage.removeItem('token');
          localStorage.removeItem('user_data');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only update user state if not a network error
      if ((error as ApiError).message !== 'Network Error') {
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = useCallback(async () => {
    try {
      console.log('Refreshing user data...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, cannot refresh user data');
        return;
      }

      // Validate token before using it
      if (!isTokenValid(token)) {
        console.log('Invalid token during refresh, logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('token_checked');
        localStorage.removeItem('user_data');
        setUser(null);
        navigate('/login');
        return;
      }

      const response = await axiosInstance.get('/api/auth/profile');
      const userData = {
        id: response.data._id,
        email: response.data.email,
        name: response.data.name,
        profilePicture: response.data.profilePicture,
        token,
        role: response.data.role,
      };

      console.log('User data refreshed:', {
        name: userData.name,
        hasProfilePic: !!userData.profilePicture,
        profilePicLength: userData.profilePicture ? userData.profilePicture.length : 0,
      });

      // Also store in localStorage for persistence across refreshes
      localStorage.setItem('user_data', JSON.stringify(response.data));

      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      const apiError = error as ApiError;
      if (apiError.response && apiError.response.status === 401) {
        // Unauthorized response - token is invalid
        localStorage.removeItem('token');
        localStorage.removeItem('token_checked');
        localStorage.removeItem('user_data');
        setUser(null);
        navigate('/login');
      }
      throw error;
    }
  }, [navigate]);

  const login = async (email: string, password: string) => {
    try {
      // Clear any existing token first
      localStorage.removeItem('token');

      console.log('Attempting login with:', { email });

      const response = await axiosInstance.post('/api/auth/login', {
        email,
        password,
      });

      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from login API');
      }

      console.log('Login API response received:', {
        success: true,
        hasToken: !!response.data.token,
        userId: response.data.user._id,
      });

      const { token, user } = response.data;

      // Validate token before saving
      if (!isTokenValid(token)) {
        throw new Error('Server returned invalid token');
      }

      // Save token to localStorage immediately
      localStorage.setItem('token', token);

      // Set user in state
      setUser({
        id: user._id,
        email: user.email,
        name: user.name,
        token,
        profilePicture: user.profilePicture,
        role: user.role,
      });

      // Reset global login counter on success
      if (window.__checkAuthCount !== undefined) {
        window.__checkAuthCount = 0;
      }

      // Check if there's a stored redirect URL from a previous session
      const redirectUrl = sessionStorage.getItem('redirect_after_login');
      if (redirectUrl) {
        console.log('Found stored redirect URL:', redirectUrl);
        // Clear the stored URL
        sessionStorage.removeItem('redirect_after_login');
        // Navigate to the stored URL after a short delay to allow context to update
        setTimeout(() => {
          navigate(redirectUrl);
        }, 100);
      }

      // Don't navigate here - let the Login component handle navigation
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      // Clear token on error
      localStorage.removeItem('token');
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Create a promise that resolves when saving is complete
      const saveComplete = new Promise<void>((resolve) => {
        const handleSaveComplete = () => {
          console.log('Save completed before logout');
          window.removeEventListener('save-complete', handleSaveComplete);
          resolve();
        };
        window.addEventListener('save-complete', handleSaveComplete);

        // Dispatch save event
        console.log('Dispatching save event before logout');
        const event = new CustomEvent('save-pending-changes');
        window.dispatchEvent(event);

        // Add safety timeout to resolve after 2 seconds if no save event is fired
        setTimeout(() => {
          console.log('Save timeout reached, proceeding with logout');
          resolve();
        }, 2000);
      });

      // Wait for save to complete
      await saveComplete;

      // Clear auth data
      console.log('Clearing auth data and logging out');
      localStorage.removeItem('token');
      localStorage.removeItem('token_checked');
      localStorage.removeItem('user_data');
      setUser(null);

      // Navigate to login with replace to prevent back navigation
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      // Force cleanup even if there's an error
      localStorage.removeItem('token');
      localStorage.removeItem('token_checked');
      localStorage.removeItem('user_data');
      setUser(null);
      navigate('/login', { replace: true });
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/api/auth/register', {
        name,
        email,
        password,
      });

      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from register API');
      }

      const { token, user: userData } = response.data;

      // Validate token before saving
      if (!isTokenValid(token)) {
        throw new Error('Server returned invalid token');
      }

      localStorage.setItem('token', token);

      const user = {
        id: userData.id || userData._id,
        email: userData.email,
        name: userData.name,
        token,
        profilePicture: userData.profilePicture,
        role: userData.role,
      };

      setUser(user);

      // Don't navigate here - let the calling component handle navigation
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      console.log('Starting profile update with data:', {
        name: data.name,
        email: data.email,
        hasPassword: !!data.password,
        hasProfilePicture: !!data.profilePicture,
        profilePictureLength: data.profilePicture ? data.profilePicture.length : 0,
      });

      const response = await axiosInstance.put('/api/auth/profile', data);

      console.log('Profile update response received:', {
        name: response.data.name,
        email: response.data.email,
        hasProfilePicture: !!response.data.profilePicture,
        profilePictureLength: response.data.profilePicture
          ? response.data.profilePicture.length
          : 0,
      });

      if (!user) {
        throw new Error('Cannot update profile when not logged in');
      }

      // Create a fully updated user object
      const updatedUser = {
        ...user,
        name: response.data.name,
        email: response.data.email,
        profilePicture: response.data.profilePicture,
        role: response.data.role,
      };

      // Log update to verify
      console.log('Setting updated user in state:', {
        name: updatedUser.name,
        email: updatedUser.email,
        hasProfilePicture: !!updatedUser.profilePicture,
        profilePictureLength: updatedUser.profilePicture ? updatedUser.profilePicture.length : 0,
      });

      // Update the user state directly with the new data
      setUser(updatedUser);

      // Return the response for further processing if needed
      return response.data;
    } catch (error) {
      console.error('Profile update failed:', error);

      // Handle unauthorized errors
      const apiError = error as ApiError;
      if (apiError.response && apiError.response.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
      }

      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    updateProfile,
    isLoading,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
