import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  details?: any;
  code?: string;
  timestamp?: string;
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

/**
 * Send a standardized error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  details?: any,
  code?: string
): Response {
  const errorResponse: ErrorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (details) errorResponse.details = details;
  if (code) errorResponse.code = code;

  return res.status(statusCode).json(errorResponse);
}

/**
 * Send a standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
  meta?: SuccessResponse<T>['meta']
): Response {
  const response: SuccessResponse<T> = { data };
  if (message) response.message = message;
  if (meta) response.meta = meta;

  return res.status(statusCode).json(response);
}

/**
 * Handle validation errors from express-validator
 */
export function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 400, 'Validation failed', errors.array(), 'VALIDATION_ERROR');
    return true;
  }
  return false;
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Check if user has required permissions
 */
export function checkPermission(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Parse pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse sort parameters
 */
export interface SortParams {
  sortBy: string;
  sortOrder: 1 | -1;
}

export function parseSortParams(
  req: Request,
  defaultSortBy = 'createdAt',
  allowedFields: string[] = []
): SortParams {
  let sortBy = (req.query.sortBy as string) || defaultSortBy;
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
export function buildSearchQuery(searchTerm: string, searchFields: string[]): any {
  if (!searchTerm || !searchFields.length) return {};

  const regex = new RegExp(searchTerm, 'i');
  return {
    $or: searchFields.map((field) => ({ [field]: regex })),
  };
}

/**
 * Handle MongoDB duplicate key errors
 */
export function handleDuplicateKeyError(error: any, res: Response): boolean {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    sendError(
      res,
      409,
      `A record with this ${field} already exists`,
      error.keyValue,
      'DUPLICATE_KEY'
    );
    return true;
  }
  return false;
}

/**
 * Log request details for debugging
 */
export function logRequest(req: Request, context: string): void {
  console.log(`[${context}] ${req.method} ${req.path}`, {
    params: req.params,
    query: req.query,
    user: (req as any).user?.id,
  });
}

/**
 * Handle controller errors with proper logging
 */
export function handleControllerError(
  error: any,
  res: Response,
  message: string = 'An error occurred'
): Response {
  console.error(`Controller Error: ${message}`, error);
  return sendError(res, 500, message, error.message);
}

/**
 * Send standardized success response
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  message?: string,
  meta?: any
): Response {
  const response: SuccessResponse<T> = {
    data,
    message,
    meta,
  };
  return res.status(200).json(response);
}

/**
 * Handle not found errors
 */
export function handleNotFound(res: Response, resource: string = 'Resource'): Response {
  return sendError(res, 404, `${resource} not found`);
}

/**
 * Validate required fields
 */
export function validateRequiredFields(data: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!data[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Pagination meta interface
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    hasMore: page < totalPages,
    totalPages,
  };
}
