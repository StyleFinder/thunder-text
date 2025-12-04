/**
 * Environment Configuration
 *
 * Centralized environment variable access with runtime validation.
 * This prevents debug routes from being accessible in production.
 */

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

/**
 * Debug mode configuration
 *
 * SECURITY: Debug routes are COMPLETELY DISABLED in production.
 * No environment variable can override this - if NODE_ENV is 'production',
 * debug routes will NEVER be accessible. This protects against accidental
 * exposure of sensitive information (env vars, tokens, auth state).
 *
 * Debug routes are ONLY available when NODE_ENV is 'development'.
 */
export const isDebugEnabled = isDevelopment && !isProduction;

/**
 * Check if debug routes should be accessible
 * This should be used in middleware or route handlers to protect debug endpoints
 */
export function requireDebugMode(routePath: string): boolean {
  if (isProduction) {
    // SECURITY: Always block in production, no exceptions
    return false;
  }
  if (!isDebugEnabled) {
    console.warn(`[Security] Blocked access to debug route: ${routePath} (not in development mode)`);
    return false;
  }
  return true;
}
