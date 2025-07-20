"use strict";
/**
 * Query Validation Middleware
 * Simple validation without shared dependencies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = exports.validateQueryMiddleware = exports.validateQuery = void 0;
const queryConfig_1 = require("@shared/config/queryConfig");
// Simple validation without shared config
const ALLOWED_FILTERS = [
    'search',
    'states',
    'dispositions',
    'sources',
    'pipelineSource',
    'sortBy',
    'sortDirection',
    'page',
    'limit',
    'requestId', // Added for request tracking
    'getAllResults', // Added for getting all results without pagination
    'format', // Allow CSV or other formats without triggering 400
    'createdAtStart', // Date range filter - start date
    'createdAtEnd', // Date range filter - end date
];
const ALLOWED_SORTS = ['createdAt', 'name', 'email', 'phone', 'state', 'disposition', 'timeZone'];
// Helper function to parse array parameters
const parseArrayParam = (param) => {
    if (!param)
        return undefined;
    if (Array.isArray(param))
        return param;
    if (typeof param === 'string') {
        return param.includes(',') ? param.split(',').filter(Boolean) : [param];
    }
    return undefined;
};
const validateQuery = (req, res, next) => {
    try {
        // Extract query parameters
        const query = req.query;
        console.log('[ValidateQuery] Raw query params:', query);
        // Validate allowed parameters
        for (const key in query) {
            if (!ALLOWED_FILTERS.includes(key)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid query parameter: ${key}`,
                });
            }
        }
        // Validate sort direction
        if (query.sortDirection && !['asc', 'desc'].includes(query.sortDirection)) {
            return res.status(400).json({
                success: false,
                message: 'Sort direction must be "asc" or "desc"',
            });
        }
        // Validate sort field
        if (query.sortBy && !ALLOWED_SORTS.includes(query.sortBy)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sort field',
            });
        }
        // Build validated query object
        const validatedQuery = {
            page: Math.max(1, parseInt(query.page || '1', 10) || 1),
            limit: Math.min(queryConfig_1.QUERY_CONFIG.PAGINATION.maxLimit, Math.max(queryConfig_1.QUERY_CONFIG.PAGINATION.minLimit, parseInt(query.limit || '50', 10) || 50)),
            sortBy: query.sortBy || 'createdAt',
            sortDirection: query.sortDirection === 'asc' || query.sortDirection === 'desc'
                ? query.sortDirection
                : 'desc',
            search: query.search,
            states: parseArrayParam(query.states),
            dispositions: parseArrayParam(query.dispositions),
            sources: parseArrayParam(query.sources),
            pipelineSource: query.pipelineSource,
            requestId: query.requestId,
            getAllResults: query.getAllResults === 'true' || query.format === 'csv',
            createdAtStart: query.createdAtStart,
            createdAtEnd: query.createdAtEnd,
        };
        console.log('[ValidateQuery] Validated query:', validatedQuery);
        // Attach validated query to request
        req.validatedQuery = validatedQuery;
        next();
    }
    catch (error) {
        console.error('Query validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during query validation',
        });
    }
};
exports.validateQuery = validateQuery;
exports.validateQueryMiddleware = exports.validateQuery;
// Simple rate limit middleware (placeholder for production-ready solution)
const rateLimitMiddleware = (req, res, next) => {
    // In production, use a real rate limiter like express-rate-limit or Redis-based
    next();
};
exports.rateLimitMiddleware = rateLimitMiddleware;
