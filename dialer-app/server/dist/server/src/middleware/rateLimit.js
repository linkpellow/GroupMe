"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.developmentLimiter = exports.generalApiLimiter = exports.adminPasscodeLimiter = exports.passcodeConsumptionLimiter = exports.passcodeValidationLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limiter for passcode validation endpoints
exports.passcodeValidationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many passcode validation attempts. Please wait 15 minutes before trying again.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many passcode validation attempts. Please wait 15 minutes before trying again.',
            retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
        });
    },
    keyGenerator: (req) => {
        // Use IP address as the key for rate limiting
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    skip: (req) => {
        // Skip rate limiting for authenticated users (they're likely admins)
        return !!req.user;
    },
});
// Rate limiter for passcode consumption (more strict)
exports.passcodeConsumptionLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 consumption attempts per hour
    message: {
        success: false,
        message: 'Too many passcode consumption attempts. Please wait 1 hour before trying again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many passcode consumption attempts. Please wait 1 hour before trying again.',
            retryAfter: Math.ceil(60 * 60), // 1 hour in seconds
        });
    },
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    skip: (req) => {
        return !!req.user;
    },
});
// Rate limiter for admin passcode management endpoints
exports.adminPasscodeLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each authenticated user to 20 requests per 5 minutes
    message: {
        success: false,
        message: 'Too many admin passcode management requests. Please wait 5 minutes before trying again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many admin passcode management requests. Please wait 5 minutes before trying again.',
            retryAfter: Math.ceil(5 * 60), // 5 minutes in seconds
        });
    },
    keyGenerator: (req) => {
        // Use user ID for authenticated requests, IP for unauthenticated
        return req.user ? req.user._id || req.user.id : (req.ip || req.connection.remoteAddress || 'unknown');
    },
    skip: (req) => {
        // Only apply to admin passcode management endpoints
        return !req.path.includes('/passcodes');
    },
});
// General API rate limiter for all endpoints
exports.generalApiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests. Please wait 15 minutes before trying again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests. Please wait 15 minutes before trying again.',
            retryAfter: Math.ceil(15 * 60),
        });
    },
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    skip: (req) => {
        // Skip for authenticated users and health checks
        return !!req.user || req.path === '/api/health';
    },
});
// Development rate limiter (more lenient)
exports.developmentLimiter = (0, express_rate_limit_1.default)({
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
