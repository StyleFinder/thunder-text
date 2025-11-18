/**
 * Standardized API Error Handling
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * Standard API Error Codes
 */
export enum ErrorCode {
  // Client Errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  AI_GENERATION_ERROR = 'AI_GENERATION_ERROR',

  // Shopify-specific
  SHOPIFY_AUTH_ERROR = 'SHOPIFY_AUTH_ERROR',
  SHOPIFY_API_ERROR = 'SHOPIFY_API_ERROR',
}

/**
 * API Error class with standardized structure
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: unknown,
    public requestId?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
    details?: unknown
    requestId?: string
    timestamp: string
  }
}

/**
 * Create standardized error response
 */
export function errorResponse(
  error: APIError | Error,
  requestId?: string
): NextResponse<ErrorResponse> {
  // Handle APIError instances
  if (error instanceof APIError) {
    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: error.requestId || requestId,
        timestamp: new Date().toISOString(),
      },
    }

    // Send to Sentry if it's a server error
    if (error.statusCode >= 500) {
      Sentry.captureException(error, {
        extra: {
          code: error.code,
          details: error.details,
          requestId: error.requestId || requestId,
        },
      })
    }

    return NextResponse.json(response, {
      status: error.statusCode,
      headers: {
        'x-request-id': error.requestId || requestId || '',
      }
    })
  }

  // Handle generic Error instances
  const response: ErrorResponse = {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message || 'An unexpected error occurred',
      requestId,
      timestamp: new Date().toISOString(),
    },
  }

  // Send to Sentry
  Sentry.captureException(error, {
    extra: { requestId },
  })

  return NextResponse.json(response, {
    status: 500,
    headers: {
      'x-request-id': requestId || '',
    }
  })
}

/**
 * Convenience functions for common errors
 */
export const Errors = {
  badRequest: (message: string, details?: unknown, requestId?: string) =>
    new APIError(400, ErrorCode.BAD_REQUEST, message, details, requestId),

  unauthorized: (message = 'Unauthorized', details?: unknown, requestId?: string) =>
    new APIError(401, ErrorCode.UNAUTHORIZED, message, details, requestId),

  forbidden: (message = 'Forbidden', details?: unknown, requestId?: string) =>
    new APIError(403, ErrorCode.FORBIDDEN, message, details, requestId),

  notFound: (message = 'Not found', details?: unknown, requestId?: string) =>
    new APIError(404, ErrorCode.NOT_FOUND, message, details, requestId),

  validation: (message: string, details?: unknown, requestId?: string) =>
    new APIError(400, ErrorCode.VALIDATION_ERROR, message, details, requestId),

  rateLimit: (message = 'Rate limit exceeded', details?: unknown, requestId?: string) =>
    new APIError(429, ErrorCode.RATE_LIMIT_EXCEEDED, message, details, requestId),

  internal: (message = 'Internal server error', details?: unknown, requestId?: string) =>
    new APIError(500, ErrorCode.INTERNAL_ERROR, message, details, requestId),

  database: (message: string, details?: unknown, requestId?: string) =>
    new APIError(500, ErrorCode.DATABASE_ERROR, message, details, requestId),

  externalAPI: (message: string, details?: unknown, requestId?: string) =>
    new APIError(502, ErrorCode.EXTERNAL_API_ERROR, message, details, requestId),

  aiGeneration: (message: string, details?: unknown, requestId?: string) =>
    new APIError(500, ErrorCode.AI_GENERATION_ERROR, message, details, requestId),

  shopifyAuth: (message: string, details?: unknown, requestId?: string) =>
    new APIError(401, ErrorCode.SHOPIFY_AUTH_ERROR, message, details, requestId),

  shopifyAPI: (message: string, details?: unknown, requestId?: string) =>
    new APIError(502, ErrorCode.SHOPIFY_API_ERROR, message, details, requestId),
}
