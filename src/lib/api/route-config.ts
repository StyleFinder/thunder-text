/**
 * API Route Configuration
 *
 * Provides standardized route segment configs for API security.
 * Use these exports in route files to enforce consistent limits.
 *
 * @example
 * // In route.ts file:
 * export { jsonRouteConfig as config } from '@/lib/api/route-config';
 */

/**
 * Default JSON API route config
 * - 1MB body size limit for standard JSON payloads
 * - Suitable for most API endpoints
 */
export const jsonRouteConfig = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  // Maximum duration for serverless functions (in seconds)
  maxDuration: 30,
};

/**
 * File upload route config
 * - 10MB body size limit for file uploads
 * - Suitable for writing samples, document uploads
 */
export const fileUploadRouteConfig = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60,
};

/**
 * Content generation route config
 * - 2MB body size limit (allows larger prompts/context)
 * - Extended timeout for AI generation
 */
export const contentGenerationRouteConfig = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
  // Extended timeout for OpenAI API calls
  maxDuration: 120,
};

/**
 * Webhook route config
 * - 5MB body size limit for webhook payloads
 * - Extended timeout for processing
 */
export const webhookRouteConfig = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
  maxDuration: 60,
};

/**
 * Minimal route config for read-only endpoints
 * - 100KB body size limit (query params should be used instead)
 * - Short timeout for quick responses
 */
export const readOnlyRouteConfig = {
  api: {
    bodyParser: {
      sizeLimit: '100kb',
    },
  },
  maxDuration: 15,
};

/**
 * Route size limits summary (for documentation)
 */
export const ROUTE_SIZE_LIMITS = {
  JSON_DEFAULT: '1mb',
  FILE_UPLOAD: '10mb',
  CONTENT_GENERATION: '2mb',
  WEBHOOK: '5mb',
  READ_ONLY: '100kb',
} as const;

/**
 * Helper to create custom route config
 */
export function createRouteConfig(options: {
  sizeLimit?: string;
  maxDuration?: number;
}) {
  return {
    api: {
      bodyParser: {
        sizeLimit: options.sizeLimit || '1mb',
      },
    },
    maxDuration: options.maxDuration || 30,
  };
}

/**
 * Q3: Standardized error handling utility
 *
 * Safely extracts an Error object from unknown catch parameter.
 * Use this in catch blocks for type-safe error handling.
 *
 * @example
 * try {
 *   // ... api logic
 * } catch (error) {
 *   const err = toError(error);
 *   logger.error("Failed:", err, { component: "my-route" });
 *   return NextResponse.json({ error: err.message }, { status: 500 });
 * }
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  code?: string;
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage = "Internal Server Error"
): ApiErrorResponse {
  const err = toError(error);
  return {
    error: err.message || defaultMessage,
  };
}
