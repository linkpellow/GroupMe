// Development configuration for GroupMe testing
export const developmentConfig = {
  // Server settings
  server: {
    port: process.env.PORT || 3001,
    host: '0.0.0.0',
    shutdownTimeout: 10000,
    keepAliveTimeout: 65000,
  },

  // JWT settings with longer expiration for testing
  jwt: {
    secret: process.env.JWT_SECRET || 'lkj234lkjfdslkj234lkjadsflkjfdaslkjfdalskdfj',
    expiresIn: '90d', // 90 days for development testing
  },

  // GroupMe settings
  groupMe: {
    clientId: process.env.GROUPME_CLIENT_ID || 'm30BXQSEw03mzZK0ZfzDGQqqp8LXHRT2MiZNWWCeC7jmBSAx',
    redirectUri:
      process.env.GROUPME_REDIRECT_URI ||
      (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/groupme/callback` : 'http://localhost:5173/groupme/callback'),
    apiUrl: 'https://api.groupme.com/v3',
    pollInterval: 3000, // 3 seconds
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // MongoDB settings
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer',
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // CORS settings
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    prettyPrint: true,
    colorize: true,
  },

  // Error handling
  errorHandling: {
    exposeErrors: true, // Show full errors in development
    gracefulShutdown: true,
    uncaughtExceptionHandler: true,
  },

  // Testing helpers
  testing: {
    bypassAuth: process.env.BYPASS_AUTH === 'true',
    mockGroupMe: process.env.MOCK_GROUPME === 'true',
    testUserId: '68031c6250449693533f5ae7', // admin user
  },
};

// Health check configuration
export const healthCheckConfig = {
  checks: {
    mongodb: true,
    memory: true,
    uptime: true,
  },
  timeout: 3000,
};
