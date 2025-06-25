import crypto from 'crypto';

// Generate a secure SID if not already set
export const API_SID = process.env.API_SID || 'crok_' + crypto.randomBytes(16).toString('hex');

// API configuration
export const API_CONFIG = {
  version: 'v1',
  baseUrl: process.env.API_BASE_URL || 'https://crokodial-2a1145cec713.herokuapp.com',
  endpoints: {
    leads: '/api/v1/leads',
    auth: '/api/v1/auth',
    calls: '/api/v1/calls',
  },
};

// Export the configuration
export default {
  sid: API_SID,
  baseUrl: API_CONFIG.baseUrl,
  endpoints: API_CONFIG.endpoints,
  version: API_CONFIG.version,
};
