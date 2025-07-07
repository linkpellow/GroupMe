"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('=== Error Handler ===');
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.error('Request headers:', req.headers);
    console.error('Request body:', req.body);
    console.error('Request query:', req.query);
    console.error('Request params:', req.params);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            status: statusCode,
            details: err.details || err,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        },
    });
};
exports.errorHandler = errorHandler;
