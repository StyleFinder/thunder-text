/**
 * Centralized function to get Shopify access token
 * This ensures consistent token retrieval across all API routes
 */
export function getShopifyAccessToken(): string | undefined {
  // Check environment variable (Vercel deployment)
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN

  if (envToken && envToken !== '' && envToken !== 'placeholder-token') {
    console.log('✅ Found Shopify access token from environment')
    return envToken
  }

  console.warn('⚠️ No Shopify access token found in environment')
  console.log('📝 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasToken: !!envToken,
    tokenLength: envToken?.length || 0
  })

  return undefined
}

/**
 * Check if we have a valid Shopify access token
 */
export function hasValidShopifyToken(): boolean {
  const token = getShopifyAccessToken()
  return !!token && token.length > 20
}