import axios from 'axios';

// Create a dedicated axios instance for OAuth operations that doesn't include auth headers
// This is used only for endpoints that don't require authentication (callback, status)
const oauthAxios = axios.create({
  baseURL: '',
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create an authenticated axios instance for protected endpoints
const authApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log the error for debugging
    console.error('OAuth API Error:', error.response?.status, error.response?.data);
    
    // OAuth initiate needs authentication, but callback/status don't
    const isPublicOAuthEndpoint = error.config?.url?.includes('/oauth/callback') || 
                                  error.config?.url?.includes('/oauth/status');
    
    if (error.response?.status === 401 && !isPublicOAuthEndpoint) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface GroupMeOAuthStatus {
  connected: boolean;
  connectedAt?: Date;
  email?: string;
}

export interface GroupMeOAuthResponse {
  authUrl: string;
  state: string;
}

class GroupMeOAuthService {
  /**
   * Check if GroupMe is connected (no auth required)
   */
  async checkConnectionStatus(): Promise<GroupMeOAuthStatus> {
    try {
      const response = await authApi.get('/groupme/oauth/status');
      return {
        connected: response.data.connected,
        connectedAt: response.data.connectedAt ? new Date(response.data.connectedAt) : undefined,
        email: response.data.email,
      };
    } catch (error: any) {
      console.error('Error checking GroupMe connection status:', error);
      // Return disconnected state on error
      return { connected: false };
    }
  }

  /**
   * Initiate OAuth flow (requires authentication)
   */
  async initiateOAuth(userId: string): Promise<GroupMeOAuthResponse> {
    console.log('=== groupMeOAuthService.initiateOAuth ===');
    console.log('Input userId:', userId);
    console.log('API endpoint:', '/groupme/oauth/initiate');
    console.log('Request payload:', { userId });
    
    try {
      // Use authenticated API for this endpoint
      console.log('Making POST request to /groupme/oauth/initiate');
      const response = await authApi.post('/groupme/oauth/initiate', {
        userId: userId
      });
      
      console.log('Raw API response:', response);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response data:', response.data);
      
      // The backend returns the data wrapped in a 'data' property
      const result = response.data.data || response.data;
      console.log('Extracted result:', result);
      
      return result;
    } catch (error: any) {
      console.error('=== API CALL FAILED ===');
      console.error('Error in initiateOAuth:', error);
      console.error('Error config:', error?.config);
      console.error('Error request:', error?.request);
      console.error('Error response:', error?.response);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(accessToken: string, state: string): Promise<void> {
    console.log('=== groupMeOAuthService.handleOAuthCallback ===');
    console.log('Access token received:', accessToken ? 'Yes' : 'No');
    console.log('Access token length:', accessToken?.length);
    console.log('State received:', state);
    
    try {
      // Use the non-authenticated API for the callback
      console.log('Making POST request to /groupme/oauth/callback');
      console.log('Request payload:', { 
        access_token: accessToken ? `${accessToken.substring(0, 10)}...` : null,
        state 
      });
      
      const response = await oauthAxios.post('/api/groupme/oauth/callback', {
        access_token: accessToken,
        state: state,
      });
      
      console.log('Callback response received:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      console.log('OAuth callback successful');
    } catch (error: any) {
      console.error('=== OAuth Callback Error ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      console.error('Error response status:', error?.response?.status);
      console.error('Error stack:', error?.stack);
      
      // Check if it's a token expiration error
      if (error?.response?.data?.message?.includes('token is no longer valid')) {
        console.error('Token validation failed - token expired or invalid');
      }
      
      throw error;
    }
  }

  /**
   * Disconnect GroupMe (requires authentication)
   */
  async disconnect(): Promise<void> {
    // Use authenticated API for this endpoint
    await authApi.post('/groupme/oauth/disconnect');
  }
}

// Export singleton instance
export const groupMeOAuthService = new GroupMeOAuthService();

// Export service class for testing
export default GroupMeOAuthService;
