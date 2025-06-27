"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = sendError;
exports.sendSuccess = sendSuccess;
exports.handleValidationErrors = handleValidationErrors;
exports.asyncHandler = asyncHandler;
exports.checkPermission = checkPermission;
exports.parsePagination = parsePagination;
exports.parseSortParams = parseSortParams;
exports.buildSearchQuery = buildSearchQuery;
exports.handleDuplicateKeyError = handleDuplicateKeyError;
exports.logRequest = logRequest;
exports.handleControllerError = handleControllerError;
exports.sendSuccessResponse = sendSuccessResponse;
exports.handleNotFound = handleNotFound;
exports.validateRequiredFields = validateRequiredFields;
exports.createPaginationMeta = createPaginationMeta;
const express_validator_1 = require("express-validator");
/**
 * Send a standardized error response
 */
function sendError(res, statusCode, message, details, code) {
    const errorResponse = {
        error: message,
        timestamp: new Date().toISOString(),
    };
    if (details)
        errorResponse.details = details;
    if (code)
        errorResponse.code = code;
    return res.status(statusCode).json(errorResponse);
}
/**
 * Send a standardized success response
 */
function sendSuccess(res, data, statusCode = 200, message, meta) {
    const response = { data };
    if (message)
        response.message = message;
    if (meta)
        response.meta = meta;
    return res.status(statusCode).json(response);
}
/**
 * Handle validation errors from express-validator
 */
function handleValidationErrors(req, res) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        sendError(res, 400, 'Validation failed', errors.array(), 'VALIDATION_ERROR');
        return true;
    }
    return false;
}
/**
 * Async handler wrapper to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * Check if user has required permissions
 */
function checkPermission(userRole, allowedRoles) {
    return allowedRoles.includes(userRole);
}
function parsePagination(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
function parseSortParams(req, defaultSortBy = 'createdAt', allowedFields = []) {
    let sortBy = req.query.sortBy || defaultSortBy;
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    // Validate sort field if allowedFields provided
    if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
        sortBy = defaultSortBy;
    }
    return { sortBy, sortOrder };
}
/**
 * Build a search query for MongoDB
 */
function buildSearchQuery(searchTerm, searchFields) {
    if (!searchTerm || !searchFields.length)
        return {};
    const regex = new RegExp(searchTerm, 'i');
    return {
        $or: searchFields.map((field) => ({ [field]: regex })),
    };
}
/**
 * Handle MongoDB duplicate key errors
 */
function handleDuplicateKeyError(error, res) {
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        sendError(res, 409, `A record with this ${field} already exists`, error.keyValue, 'DUPLICATE_KEY');
        return true;
    }
    return false;
}
/**
 * Log request details for debugging
 */
function logRequest(req, context) {
    console.log(`[${context}] ${req.method} ${req.path}`, {
        params: req.params,
        query: req.query,
        user: req.user?.id,
    });
}
/**
 * Handle controller errors with proper logging
 */
function handleControllerError(error, res, message = 'An error occurred') {
    console.error(`Controller Error: ${message}`, error);
    return sendError(res, 500, message, error.message);
}
/**
 * Send standardized success response
 */
function sendSuccessResponse(res, data, message, meta) {
    const response = {
        data,
        message,
        meta,
    };
    return res.status(200).json(response);
}
/**
 * Handle not found errors
 */
function handleNotFound(res, resource = 'Resource') {
    return sendError(res, 404, `${resource} not found`);
}
/**
 * Validate required fields
 */
function validateRequiredFields(data, requiredFields) {
    for (const field of requiredFields) {
        if (!data[field]) {
            return `Missing required field: ${field}`;
        }
    }
    return null;
}
/**
 * Create pagination metadata
 */
function createPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        page,
        limit,
        hasMore: page < totalPages,
        totalPages,
    };
}
