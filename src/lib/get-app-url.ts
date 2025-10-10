/**
 * Get the application URL for the current environment
 * Handles production, staging, and preview deployments
 */
export function getAppUrl(): string {
  // If explicitly set, use that
  if (process.env.SHOPIFY_APP_URL) {
    return process.env.SHOPIFY_APP_URL
  }

  // In Render, use the RENDER_EXTERNAL_URL environment variable
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL
  }

  // Fallback to production URL
  return 'https://thunder-text.onrender.com'
}

/**
 * Get the OAuth callback URL for Shopify
 */
export function getOAuthCallbackUrl(): string {
  return `${getAppUrl()}/auth/shopify/callback`
}