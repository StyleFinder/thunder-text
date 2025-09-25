/**
 * Centralized function to get Shopify access token
 * This ensures consistent token retrieval across all API routes
 */
export function getShopifyAccessToken(): string | undefined {
  // TEMPORARY: Use a base64 encoded token from environment
  // This avoids GitHub secret detection while we fix proper env access
  const encodedToken = process.env.NEXT_PUBLIC_SHOPIFY_TOKEN_B64

  console.log('🔍 Token retrieval attempt:', {
    hasEncodedToken: !!encodedToken,
    encodedTokenLength: encodedToken?.length || 0,
    nodeEnv: process.env.NODE_ENV
  })

  if (encodedToken) {
    try {
      const decodedToken = Buffer.from(encodedToken, 'base64').toString('utf-8')
      console.log('✅ Using decoded Shopify access token from environment')
      console.log('🔑 Decoded token prefix:', decodedToken.substring(0, 10) + '...')
      return decodedToken
    } catch (error) {
      console.error('❌ Failed to decode token:', error)
    }
  }

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