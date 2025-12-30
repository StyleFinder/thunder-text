/**
 * Error Sanitization Middleware
 *
 * Prevents information disclosure by sanitizing error messages before
 * returning them to clients. Detailed errors are logged server-side only.
 *
 * @security P2 - Prevents implementation details leaking through error responses
 */

import { logger } from "@/lib/logger";

/**
 * Error categories for consistent handling
 */
export enum ErrorCategory {
  /** Authentication/authorization failures */
  AUTH = "auth",
  /** Input validation errors */
  VALIDATION = "validation",
  /** External service failures */
  EXTERNAL = "external",
  /** Rate limiting */
  RATE_LIMIT = "rate_limit",
  /** Internal server errors */
  INTERNAL = "internal",
  /** Resource not found */
  NOT_FOUND = "not_found",
}

/**
 * Safe error messages that can be returned to clients
 * Maps internal error patterns to user-friendly messages
 */
const SAFE_ERROR_MESSAGES: ReadonlyMap<string, string> = new Map([
  // Authentication errors
  ["failed to exchange code", "Authentication failed. Please try again."],
  ["invalid token", "Session expired. Please log in again."],
  ["token expired", "Session expired. Please log in again."],
  ["unauthorized", "You don't have permission to access this resource."],
  ["authentication required", "Please log in to continue."],

  // Rate limiting
  ["rate limit exceeded", "Too many requests. Please wait and try again."],
  ["too many requests", "Too many requests. Please wait and try again."],

  // Validation errors
  ["invalid input", "Invalid input. Please check your data and try again."],
  ["validation failed", "Invalid input. Please check your data and try again."],

  // External service errors
  ["shopify api error", "Unable to connect to Shopify. Please try again."],
  ["facebook api error", "Unable to connect to Facebook. Please try again."],
  ["openai api error", "AI service temporarily unavailable. Please try again."],
  [
    "anthropic api error",
    "AI service temporarily unavailable. Please try again.",
  ],
  ["supabase error", "Database service temporarily unavailable."],

  // Not found errors
  ["not found", "The requested resource was not found."],
  ["resource not found", "The requested resource was not found."],

  // File upload errors
  ["file too large", "File is too large. Please upload a smaller file."],
  ["unsupported file type", "File type not supported."],
  ["invalid file", "Invalid file. Please upload a valid file."],
]);

/**
 * HTTP status code to category mapping
 */
const STATUS_TO_CATEGORY: ReadonlyMap<number, ErrorCategory> = new Map([
  [400, ErrorCategory.VALIDATION],
  [401, ErrorCategory.AUTH],
  [403, ErrorCategory.AUTH],
  [404, ErrorCategory.NOT_FOUND],
  [429, ErrorCategory.RATE_LIMIT],
  [500, ErrorCategory.INTERNAL],
  [502, ErrorCategory.EXTERNAL],
  [503, ErrorCategory.EXTERNAL],
  [504, ErrorCategory.EXTERNAL],
]);

/**
 * Result of error sanitization
 */
export interface SanitizedError {
  /** Safe message to return to client */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Error category for logging/metrics */
  category: ErrorCategory;
  /** Unique error ID for correlation */
  errorId: string;
}

/**
 * Generate a unique error ID for correlation
 */
function generateErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sanitize an error for client response
 *
 * @param error - The original error
 * @param context - Additional context for logging
 * @returns Sanitized error safe to return to client
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   const safe = sanitizeErrorForClient(error, { component: 'auth' });
 *   return NextResponse.json(
 *     { error: safe.message, errorId: safe.errorId },
 *     { status: safe.statusCode }
 *   );
 * }
 * ```
 */
export function sanitizeErrorForClient(
  error: unknown,
  context?: Record<string, unknown>,
): SanitizedError {
  const errorId = generateErrorId();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Try to match against known safe patterns
  for (const [pattern, safeMessage] of SAFE_ERROR_MESSAGES) {
    if (lowerMessage.includes(pattern)) {
      // Determine category from pattern
      let category = ErrorCategory.INTERNAL;
      if (
        pattern.includes("auth") ||
        pattern.includes("token") ||
        pattern.includes("unauthorized")
      ) {
        category = ErrorCategory.AUTH;
      } else if (pattern.includes("rate") || pattern.includes("too many")) {
        category = ErrorCategory.RATE_LIMIT;
      } else if (pattern.includes("valid") || pattern.includes("input")) {
        category = ErrorCategory.VALIDATION;
      } else if (
        pattern.includes("api error") ||
        pattern.includes("supabase")
      ) {
        category = ErrorCategory.EXTERNAL;
      } else if (pattern.includes("not found")) {
        category = ErrorCategory.NOT_FOUND;
      }

      // Log the full error server-side
      logger.warn("Sanitized error for client", {
        component: "error-handler",
        errorId,
        originalMessage: errorMessage,
        sanitizedMessage: safeMessage,
        category,
        ...context,
      });

      return {
        message: safeMessage,
        statusCode: getStatusCodeForCategory(category),
        category,
        errorId,
      };
    }
  }

  // No pattern matched - return generic error
  logger.error(
    "Unmatched error sanitized",
    error instanceof Error ? error : new Error(String(error)),
    {
      component: "error-handler",
      errorId,
      originalMessage: errorMessage,
      ...context,
    },
  );

  return {
    message: "An unexpected error occurred. Please try again.",
    statusCode: 500,
    category: ErrorCategory.INTERNAL,
    errorId,
  };
}

/**
 * Get appropriate HTTP status code for error category
 */
function getStatusCodeForCategory(category: ErrorCategory): number {
  switch (category) {
    case ErrorCategory.AUTH:
      return 401;
    case ErrorCategory.VALIDATION:
      return 400;
    case ErrorCategory.RATE_LIMIT:
      return 429;
    case ErrorCategory.NOT_FOUND:
      return 404;
    case ErrorCategory.EXTERNAL:
      return 503;
    case ErrorCategory.INTERNAL:
    default:
      return 500;
  }
}

/**
 * Determine error category from HTTP status code
 */
export function getCategoryFromStatus(status: number): ErrorCategory {
  return STATUS_TO_CATEGORY.get(status) ?? ErrorCategory.INTERNAL;
}

/**
 * Check if an error message is safe to return to clients
 * (i.e., it doesn't contain implementation details)
 */
export function isErrorMessageSafe(message: string): boolean {
  const unsafePatterns = [
    // Stack traces
    /at \w+\s*\(/i,
    /\.js:\d+:\d+/i,
    /\.ts:\d+:\d+/i,

    // Internal paths
    /\/src\//i,
    /\/node_modules\//i,
    /\/lib\//i,

    // Database details
    /postgres|supabase|sql|query|database/i,
    /relation|column|constraint|primary key/i,

    // API keys/tokens
    /api[_-]?key/i,
    /token|secret|password|credential/i,
    /sk[-_]/i,
    /bearer/i,

    // Internal error codes
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i,

    // Environment details
    /process\.env/i,
    /NODE_ENV/i,
  ];

  return !unsafePatterns.some((pattern) => pattern.test(message));
}

/**
 * Create a safe error response object for Next.js API routes
 *
 * @example
 * ```ts
 * return NextResponse.json(
 *   createSafeErrorResponse(error, { userId }),
 *   { status: 500 }
 * );
 * ```
 */
export function createSafeErrorResponse(
  error: unknown,
  context?: Record<string, unknown>,
): { success: false; error: string; errorId: string } {
  const sanitized = sanitizeErrorForClient(error, context);
  return {
    success: false,
    error: sanitized.message,
    errorId: sanitized.errorId,
  };
}
