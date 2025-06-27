/**
 * Query Validation Middleware
 * Simple validation without shared dependencies
 */

import { Request, Response, NextFunction } from 'express';
import { QUERY_CONFIG } from '@shared/config/queryConfig';

// Extend the Request interface to include validatedQuery
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: any;
    }
  }
}

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
];
const ALLOWED_SORTS = ['createdAt', 'name', 'email', 'phone', 'state', 'disposition', 'timeZone'];

// Helper function to parse array parameters
const parseArrayParam = (param: any): string[] | undefined => {
  if (!param) return undefined;
  if (Array.isArray(param)) return param;
  if (typeof param === 'string') {
    return param.includes(',') ? param.split(',').filter(Boolean) : [param];
  }
  return undefined;
};

export const validateQuery = (req: Request, res: Response, next: NextFunction) => {
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
    if (query.sortDirection && !['asc', 'desc'].includes(query.sortDirection as string)) {
      return res.status(400).json({
        success: false,
        message: 'Sort direction must be "asc" or "desc"',
      });
    }

    // Validate sort field
    if (query.sortBy && !ALLOWED_SORTS.includes(query.sortBy as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sort field',
      });
    }

    // Build validated query object
    const validatedQuery = {
      page: Math.max(1, parseInt((query.page as string) || '1', 10) || 1),
      limit: Math.min(
        QUERY_CONFIG.PAGINATION.maxLimit,
        Math.max(
          QUERY_CONFIG.PAGINATION.minLimit,
          parseInt((query.limit as string) || '50', 10) || 50
        ),
      ),
      sortBy: (query.sortBy as string) || 'createdAt',
      sortDirection:
        query.sortDirection === 'asc' || query.sortDirection === 'desc'
          ? query.sortDirection
          : 'desc',
      search: query.search as string,
      states: parseArrayParam(query.states),
      dispositions: parseArrayParam(query.dispositions),
      sources: parseArrayParam(query.sources),
      pipelineSource: query.pipelineSource as string,
      requestId: query.requestId as string,
      getAllResults: query.getAllResults === 'true' || query.format === 'csv',
    };

    console.log('[ValidateQuery] Validated query:', validatedQuery);

    // Attach validated query to request
    (req as any).validatedQuery = validatedQuery;

    next();
  } catch (error) {
    console.error('Query validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during query validation',
    });
  }
};

export interface ValidatedQuery extends Request {
  validatedQuery: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    states?: string[];
    dispositions?: string[];
    sources?: string[];
    pipelineSource: string;
  };
}

export const validateQueryMiddleware = validateQuery;

// Simple rate limit middleware (placeholder for production-ready solution)
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // In production, use a real rate limiter like express-rate-limit or Redis-based
  next();
};
