import axios from 'axios';

// Create a dedicated axios instance for OAuth operations that doesn't include auth headers
// This is used only for endpoints that don't require authentication (callback, status)
const oauthAxios = axios.create({
  baseURL: '',
  withCredentials: true,
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
    const token = localStorage.getItem('token');
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
    // Enhanced logging for debugging OAuth issues
    console.error('OAuth API Error Details:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
    });
    
    // Include ALL OAuth and GroupMe-related endpoints in the exclusion list
    const isOAuthOrGroupMeEndpoint = 
      error.config?.url?.includes('/oauth/') || 
      error.config?.url?.includes('/groupme/') ||
      error.config?.url?.includes('api.groupme.com') ||
      error.config?.url?.includes('oauth.groupme.com');
    
    console.log('Is OAuth/GroupMe endpoint:', isOAuthOrGroupMeEndpoint, 'URL:', error.config?.url);
    
    // Check if this is a page refresh
    const isRefresh = document.referrer === window.location.href;
    const currentPath = window.location.pathname;
    
    if (error.response?.status === 401 && !isOAuthOrGroupMeEndpoint && !isRefresh && currentPath !== '/login') {
      console.warn('Non-OAuth 401 error detected - logging out user');
      // Handle unauthorized access for non-OAuth endpoints
      localStorage.removeItem('token'); // Use correct token key
      
      // Store the current URL to redirect back after login
      sessionStorage.setItem('redirect_after_login', window.location.pathname);
      
      window.location.href = '/login';
    } else if (error.response?.status === 401) {
      console.log('OAuth/GroupMe-related 401 error or refresh - NOT logging out user');
      console.log('Context:', {
        isOAuthEndpoint: isOAuthOrGroupMeEndpoint,
        isRefresh,
        currentPath
      });
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
  async handleOAuthCallback(code: string, state: string): Promise<void> {
    console.log('=== groupMeOAuthService.handleOAuthCallback ===');
    console.log('Code received:', code ? 'Yes' : 'No');
    console.log('Code length:', code?.length);
    console.log('State received:', state);
    
    if (!code) {
      console.error('No code provided to handleOAuthCallback');
      throw new Error('No authorization code provided');
    }
    
    if (!state) {
      console.error('No state parameter provided to handleOAuthCallback');
      throw new Error('No state parameter provided');
    }
    
    try {
      // Use the non-authenticated API for the callback
      console.log('Making POST request to /groupme/oauth/callback');
      console.log('Request payload:', { 
        code: code ? `${code.substring(0, 10)}...` : null,
        state 
      });
      
      const response = await oauthAxios.post('/api/groupme/oauth/callback', {
        code: code,
        state: state,
      });
      
      console.log('Callback response received:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      console.log('OAuth callback successful');
      return response.data;
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
        throw new Error('GroupMe token expired or invalid. Please try connecting again.');
      }
      
      throw error;
    }
  }

  /**
   * Handle Manual Token Submission
   */
  async handleManualToken(token: string): Promise<void> {
    await authApi.post('/groupme/save-manual-token', { token });
  }

  /**
   * Disconnect GroupMe (requires authentication)
   */
  async disconnect(): Promise<void> {
    // Use authenticated API for this endpoint
    await authApi.post('/groupme/oauth/disconnect');
  }

  /**
   * Handle OAuth callback when only a code is provided (authorization-code flow)
   */
  async handleOAuthCode(code: string, state: string): Promise<void> {
    console.log('groupMeOAuthService.handleOAuthCode', { codeLen: code?.length, state });
    if (!code || !state) throw new Error('Missing code or state');

    await oauthAxios.post('/api/groupme/oauth/callback', { code, state });
  }

  /**
   * Save access token obtained via implicit flow
   */
  async saveAccessToken(token: string): Promise<void> {
    console.log('=== groupMeOAuthService.saveAccessToken ===');
    console.log('Token received (length):', token ? token.length : 0);
    
    if (!token) {
      console.error('Missing GroupMe access token');
      throw new Error('Missing GroupMe access token');
    }
    
    try {
      console.log('Sending token to server...');
      await authApi.post('/groupme/token', { access_token: token });
      console.log('Token saved successfully');
    } catch (error: any) {
      console.error('Failed to save GroupMe token:', error);
      console.error('Error response:', error?.response?.data);
      throw error;
    }
  }

  /**
   * Extract access token from URL hash and save it
   * This should be called on the callback page that GroupMe redirects to
   */
  async handleImplicitCallback(): Promise<boolean> {
    console.log('=== groupMeOAuthService.handleImplicitCallback ===');
    
    // Get URL hash (fragment)
    const hash = window.location.hash.substring(1); // Remove the # character
    console.log('URL hash:', hash ? 'present' : 'missing');
    
    if (!hash) {
      console.error('No URL hash found - implicit flow should include access_token in URL fragment');
      return false;
    }
    
    // Parse the hash to get access_token and state
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const state = params.get('state');
    
    console.log('Extracted from hash - access_token:', accessToken ? 'present' : 'missing');
    console.log('Extracted from hash - state:', state ? 'present' : 'missing');
    
    if (!accessToken) {
      console.error('No access_token found in URL hash');
      return false;
    }
    
    // Save the token to the server
    try {
      await this.saveAccessToken(accessToken);
      console.log('Access token saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save access token:', error);
      return false;
    }
  }
}

// Export singleton instance
export const groupMeOAuthService = new GroupMeOAuthService();

// Export service class for testing
export default GroupMeOAuthService;
