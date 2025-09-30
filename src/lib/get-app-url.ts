/**
 * Get the application URL for the current environment
 * Handles production, staging, and preview deployments
 */
export function getAppUrl(): string {
  // If explicitly set, use that
  if (process.env.SHOPIFY_APP_URL) {
    return process.env.SHOPIFY_APP_URL
  }

  // In Vercel, use the auto-generated URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Fallback to production URL
  return 'https://thunder-text-nine.vercel.app'
}

/**
 * Get the OAuth callback URL for Shopify
 */
export function getOAuthCallbackUrl(): string {
  return `${getAppUrl()}/auth/shopify/callback`
}