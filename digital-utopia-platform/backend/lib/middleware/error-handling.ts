/**
 * Error Handling Middleware
 * 
 * Standardized error handling for API routes with logging and monitoring.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { NextRequest, NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export class ApplicationError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Common error types for quick access
 */
export const ErrorTypes = {
  VALIDATION_ERROR: (message: string, details?: any) =>
    new ApplicationError('VALIDATION_ERROR', message, 400, details),
  
  UNAUTHORIZED: (message: string = 'Authentication required') =>
    new ApplicationError('UNAUTHORIZED', message, 401),
  
  FORBIDDEN: (message: string = 'Access denied') =>
    new ApplicationError('FORBIDDEN', message, 403),
  
  NOT_FOUND: (message: string = 'Resource not found') =>
    new ApplicationError('NOT_FOUND', message, 404),
  
  CONFLICT: (message: string, details?: any) =>
    new ApplicationError('CONFLICT', message, 409, details),
  
  TOO_MANY_REQUESTS: (message: string = 'Rate limit exceeded') =>
    new ApplicationError('TOO_MANY_REQUESTS', message, 429),
  
  INTERNAL_ERROR: (message: string = 'Internal server error') =>
    new ApplicationError('INTERNAL_ERROR', message, 500),
  
  SERVICE_UNAVAILABLE: (message: string = 'Service temporarily unavailable') =>
    new ApplicationError('SERVICE_UNAVAILABLE', message, 503),

  INSUFFICIENT_BALANCE: (message: string = 'Insufficient balance') =>
    new ApplicationError('INSUFFICIENT_BALANCE', message, 400),

  INVALID_ORDER: (message: string, details?: any) =>
    new ApplicationError('INVALID_ORDER', message, 400, details),

  KYC_REQUIRED: (message: string = 'KYC verification required') =>
    new ApplicationError('KYC_REQUIRED', message, 403),
};

/**
 * Log error with context
 * In production, this would send to error tracking service (e.g., Sentry)
 */
function logError(error: Error, request: NextRequest, context?: any) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
    },
    context,
  };

  // Log to console (in production, send to logging service)
  console.error('API Error:', JSON.stringify(errorLog, null, 2));

  // TODO: Send to error tracking service (Sentry, Rollbar, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: errorLog });
  // }
}

/**
 * Format error for API response
 */
function formatErrorResponse(error: Error): {
  success: false;
  error: ApiError;
  timestamp: string;
} {
  if (error instanceof ApplicationError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Generic error (don't expose internal details in production)
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'An internal error occurred. Please try again later.'
        : error.message,
      details: isProduction ? undefined : { stack: error.stack },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Error handling middleware wrapper
 * Catches errors and formats them into standardized API responses
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return errorHandlingMiddleware(async (req) => {
 *     // Your handler code
 *     // Any thrown errors will be caught and formatted
 *     if (!data) {
 *       throw ErrorTypes.NOT_FOUND('Data not found');
 *     }
 *     return NextResponse.json({ success: true, data });
 *   })(request);
 * }
 * ```
 */
export function errorHandlingMiddleware(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      // Log the error
      logError(error as Error, request);

      // Format and return error response
      const errorResponse = formatErrorResponse(error as Error);
      const statusCode =
        error instanceof ApplicationError ? error.statusCode : 500;

      return NextResponse.json(errorResponse, { status: statusCode });
    }
  };
}

/**
 * Async error wrapper for individual functions
 * Useful for non-middleware contexts
 */
export function asyncErrorHandler<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Async operation failed:', error);
      throw error;
    }
  };
}

/**
 * Validate request body with error handling
 * 
 * Usage:
 * ```typescript
 * const data = await validateRequestBody(request, schema);
 * ```
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: { parse: (data: any) => T }
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      // Zod validation error
      throw ErrorTypes.VALIDATION_ERROR('Invalid request data', {
        errors: error.errors,
      });
    }
    // JSON parse error
    throw ErrorTypes.VALIDATION_ERROR('Invalid JSON in request body');
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: { parse: (data: any) => T }
): T {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);
    return schema.parse(params);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw ErrorTypes.VALIDATION_ERROR('Invalid query parameters', {
        errors: error.errors,
      });
    }
    throw ErrorTypes.VALIDATION_ERROR('Invalid query parameters');
  }
}

export default errorHandlingMiddleware;
