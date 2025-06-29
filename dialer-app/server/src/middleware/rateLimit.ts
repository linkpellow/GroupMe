import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiter for passcode validation endpoints
export const passcodeValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many passcode validation attempts. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many passcode validation attempts. Please wait 15 minutes before trying again.',
      retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
    });
  },
  keyGenerator: (req: Request) => {
    // Use IP address as the key for rate limiting
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  skip: (req: Request) => {
    // Skip rate limiting for authenticated users (they're likely admins)
    return !!req.user;
  },
});

// Rate limiter for passcode consumption (more strict)
export const passcodeConsumptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 consumption attempts per hour
  message: {
    success: false,
    message: 'Too many passcode consumption attempts. Please wait 1 hour before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many passcode consumption attempts. Please wait 1 hour before trying again.',
      retryAfter: Math.ceil(60 * 60), // 1 hour in seconds
    });
  },
  keyGenerator: (req: Request) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  skip: (req: Request) => {
    return !!req.user;
  },
});

// Rate limiter for admin passcode management endpoints
export const adminPasscodeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each authenticated user to 20 requests per 5 minutes
  message: {
    success: false,
    message: 'Too many admin passcode management requests. Please wait 5 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many admin passcode management requests. Please wait 5 minutes before trying again.',
      retryAfter: Math.ceil(5 * 60), // 5 minutes in seconds
    });
  },
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated requests, IP for unauthenticated
    return req.user ? req.user._id || req.user.id : (req.ip || req.connection.remoteAddress || 'unknown');
  },
  skip: (req: Request) => {
    // Only apply to admin passcode management endpoints
    return !req.path.includes('/passcodes');
  },
});

// General API rate limiter for all endpoints
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait 15 minutes before trying again.',
      retryAfter: Math.ceil(15 * 60),
    });
  },
  keyGenerator: (req: Request) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  skip: (req: Request) => {
    // Skip for authenticated users and health checks
    return !!req.user || req.path === '/api/health';
  },
});

// Development rate limiter (more lenient)
export const developmentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Very high limit for development
  message: {
    success: false,
    message: 'Development rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'development',
}); 