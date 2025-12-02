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
 * Debug routes and features are ONLY available when:
 * 1. NODE_ENV is 'development', OR
 * 2. ENABLE_DEBUG_ROUTES is explicitly set to 'true'
 */
export const isDebugEnabled = isDevelopment || process.env.ENABLE_DEBUG_ROUTES === 'true';

/**
 * Check if debug routes should be accessible
 * This should be used in middleware or route handlers to protect debug endpoints
 */
export function requireDebugMode(routePath: string): boolean {
  if (!isDebugEnabled) {
    console.warn(`[Security] Blocked access to debug route: ${routePath} (production mode)`);
    return false;
  }
  return true;
}
