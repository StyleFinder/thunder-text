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
 * Check if running in a preview/staging environment (e.g., Render preview deploys)
 * These environments should also block debug routes
 */
export const isPreviewEnvironment =
  process.env.RENDER_SERVICE_TYPE === 'preview' ||
  process.env.IS_PREVIEW === 'true' ||
  process.env.VERCEL_ENV === 'preview';

/**
 * Debug mode configuration
 *
 * SECURITY: Debug routes are COMPLETELY DISABLED in production AND preview environments.
 * No environment variable can override this - if NODE_ENV is 'production' or we're in
 * a preview environment, debug routes will NEVER be accessible. This protects against
 * accidental exposure of sensitive information (env vars, tokens, auth state).
 *
 * Debug routes are ONLY available when:
 * 1. NODE_ENV is 'development'
 * 2. NOT in a preview/staging environment
 */
export const isDebugEnabled = isDevelopment && !isProduction && !isPreviewEnvironment;

/**
 * Optional debug admin secret for additional protection
 * When set, debug routes require this secret in X-Debug-Secret header
 */
export const DEBUG_ADMIN_SECRET = process.env.DEV_ADMIN_SECRET;

/**
 * Check if debug routes should be accessible
 * This should be used in middleware or route handlers to protect debug endpoints
 */
export function requireDebugMode(routePath: string): boolean {
  if (isProduction) {
    // SECURITY: Always block in production, no exceptions
    return false;
  }
  if (isPreviewEnvironment) {
    // SECURITY: Block in preview/staging environments
    console.warn(`[Security] Blocked access to debug route: ${routePath} (preview environment)`);
    return false;
  }
  if (!isDebugEnabled) {
    console.warn(`[Security] Blocked access to debug route: ${routePath} (not in development mode)`);
    return false;
  }
  return true;
}

/**
 * Validate debug admin secret if configured
 * @param providedSecret - The secret from X-Debug-Secret header
 * @returns true if valid or no secret configured, false otherwise
 */
export function validateDebugSecret(providedSecret: string | null): boolean {
  // If no secret configured, allow access (relies on other checks)
  if (!DEBUG_ADMIN_SECRET) {
    return true;
  }
  // Compare using timing-safe comparison would be better, but for dev tools this is acceptable
  return providedSecret === DEBUG_ADMIN_SECRET;
}
