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
