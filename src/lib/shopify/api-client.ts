/**
 * Client-side API utilities for making authenticated requests to Shopify API endpoints
 * Following the authentication guide's best practices for token management
 */

/**
 * Get a fresh Shopify session token
 * Always fetches a new token to avoid expiry issues (tokens expire in 60 seconds)
 */
export async function getSessionToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  // Try to use the global function set up by AppBridgeProvider
  if (window.getShopifySessionToken) {
    try {
      const freshToken = await window.getShopifySessionToken()
      return freshToken
    } catch (error) {
      console.error('Failed to get fresh session token:', error)
    }
  }

  // Fallback to sessionStorage (might be stale)
  return window.sessionStorage.getItem('shopify_session_token')
}

/**
 * Make an authenticated fetch request to our API endpoints
 * Implements retry logic for expired tokens as recommended in the guide
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Get fresh session token
  const sessionToken = await getSessionToken()

  // Add session token to headers if available
  const headers: HeadersInit = {
    ...options.headers,
    'Content-Type': 'application/json'
  }

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`
  }

  // Make initial request
  let response = await fetch(url, {
    ...options,
    headers
  })

  // Handle token expiry with retry logic (as per guide line 237-249)
  if (response.status === 401 && sessionToken) {
    console.log('🔄 Token expired, retrying with fresh token...')

    // Get a fresh token
    const freshToken = await getSessionToken()

    if (freshToken && freshToken !== sessionToken) {
      // Retry with fresh token
      headers['Authorization'] = `Bearer ${freshToken}`

      response = await fetch(url, {
        ...options,
        headers
      })
    }
  }

  return response
}

/**
 * Fetch products with authentication and automatic retry
 */
export async function fetchProducts(params: URLSearchParams) {
  const response = await authenticatedFetch(`/api/shopify/products?${params}`)
  const result = await response.json()

  if (!response.ok) {
    // Check if it's an auth error that requires app reinstallation
    if (response.status === 401 && result.requiresAuth) {
      console.error('⚠️ Authentication failed. App may need to be reinstalled.')
      // In a real app, you might want to trigger a reinstallation flow here
    }
    throw new Error(result.error || 'Failed to fetch products')
  }

  return result
}

/**
 * Enhance a product with authentication
 */
export async function enhanceProduct(productId: string, shop: string, data: any) {
  // Validate productId before making request
  const invalidProductIds = ['undefined', 'null', 'metafields', 'staging-test', '']
  if (!productId || invalidProductIds.includes(productId.toLowerCase())) {
    console.error('❌ Invalid productId in enhanceProduct:', productId)
    throw new Error(`Invalid product ID: "${productId}"`)
  }

  const response = await authenticatedFetch(
    `/api/shopify/products/${productId}/enhance?shop=${shop}`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to enhance product')
  }

  return result
}

/**
 * Get product data for prepopulation
 */
export async function getProductPrepopulation(productId: string, shop: string) {
  // Validate productId before making request
  const invalidProductIds = ['undefined', 'null', 'metafields', 'staging-test', '']
  if (!productId || invalidProductIds.includes(productId.toLowerCase())) {
    console.error('❌ Invalid productId in getProductPrepopulation:', productId)
    throw new Error(`Invalid product ID: "${productId}"`)
  }

  const response = await authenticatedFetch(
    `/api/shopify/product-prepopulation?productId=${productId}&shop=${shop}`
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to get product data')
  }

  return result
}

// Extend window type for TypeScript
declare global {
  interface Window {
    getShopifySessionToken?: () => Promise<string>
  }
}