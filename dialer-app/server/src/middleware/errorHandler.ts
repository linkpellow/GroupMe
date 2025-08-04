import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
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
