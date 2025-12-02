import { logger } from '@/lib/logger'

// @ts-nocheck - Client-side API utilities with type issues in HeadersInit
/**
 * Client-side API utilities for making authenticated requests to Shopify API endpoints
 * Supports both embedded (App Bridge) and external (OAuth) authentication modes
 */

/**
 * Get authentication token for API requests
 * Supports both embedded mode (Shopify App Bridge) and external mode (OAuth tokens)
 */
export async function getAuthToken(shop?: string): Promise<{ token: string | null; type: 'session' | 'oauth' | null }> {
  if (typeof window === 'undefined') return { token: null, type: null }


  // Try embedded mode first (Shopify App Bridge session token)
  if (window.getShopifySessionToken) {
    try {
      const sessionToken = await window.getShopifySessionToken()
      if (sessionToken) {
        return { token: sessionToken, type: 'session' }
      }
    } catch (error) {
      logger.debug('App Bridge not available, trying external auth', { component: 'api-client' })
    }
  }

  // Fallback to sessionStorage (App Bridge)
  const storedSessionToken = window.sessionStorage.getItem('shopify_session_token')
  if (storedSessionToken) {
    return { token: storedSessionToken, type: 'session' }
  }

  // External mode: Get OAuth access token from backend
  if (shop) {
    try {
      const response = await fetch(`/api/shopify/token?shop=${encodeURIComponent(shop)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.token) {
          return { token: data.token, type: 'oauth' }
        }
      }
    } catch (error) {
      logger.error('Failed to get OAuth token:', error as Error, { component: 'api-client' })
    }
  }

  // Development bypass: Enable in development mode when shop is provided
  if (typeof window !== 'undefined' && shop) {
    const urlParams = new URLSearchParams(window.location.search)
    const isDevelopment = process.env.NODE_ENV === 'development'
    const hasAuthParam = urlParams.get('authenticated') === 'true'

    // Allow dev-token if either:
    // 1. authenticated=true is in URL, OR
    // 2. We're in development mode (NODE_ENV=development)
    if (hasAuthParam || isDevelopment) {
      // Return a dev token for testing
      return { token: 'dev-token', type: 'oauth' }
    }
  }

  logger.warn('No authentication token available', { component: 'api-client' })
  return { token: null, type: null }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getAuthToken instead
 */
export async function getSessionToken(): Promise<string | null> {
  const { token } = await getAuthToken()
  return token
}

/**
 * Make an authenticated fetch request to our API endpoints
 * Supports both embedded (App Bridge) and external (OAuth) authentication modes
 * Implements retry logic for expired tokens with automatic refresh
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}, shop?: string): Promise<Response> {
  // Extract shop from URL if not provided
  let shopDomain = shop
  if (!shopDomain && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    shopDomain = urlParams.get('shop') || undefined
  }


  // Get authentication token (App Bridge session token or OAuth access token)
  const { token: authToken, type: authType } = await getAuthToken(shopDomain)


  // Add authentication to headers
  const headers: HeadersInit = {
    ...options.headers
  }

  // Only set Content-Type if not sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  // Add shop domain to headers for backend validation
  if (shopDomain) {
    headers['X-Shop-Domain'] = shopDomain
  }

  // Make initial request
  let response = await fetch(url, {
    ...options,
    headers
  })

  // Handle token expiry with retry logic
  if (response.status === 401 && authToken) {

    // For OAuth tokens, try to refresh
    if (authType === 'oauth' && shopDomain) {
      try {
        const refreshResponse = await fetch(`/api/auth/refresh?shop=${encodeURIComponent(shopDomain)}`, {
          method: 'POST'
        })

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          if (refreshData.success && refreshData.token) {
            // Retry with new token
            headers['Authorization'] = `Bearer ${refreshData.token}`

            response = await fetch(url, {
              ...options,
              headers
            })
          }
        }
      } catch (error) {
        logger.error('Failed to refresh OAuth token:', error as Error, { component: 'api-client' })
      }
    } else {
      // For session tokens, try to get fresh one
      const { token: freshToken } = await getAuthToken(shopDomain)

      if (freshToken && freshToken !== authToken) {
        // Retry with fresh token
        headers['Authorization'] = `Bearer ${freshToken}`

        response = await fetch(url, {
          ...options,
          headers
        })
      }
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
      logger.error('⚠️ Authentication failed. App may need to be reinstalled.', undefined, { component: 'api-client' })
      // In a real app, you might want to trigger a reinstallation flow here
    }
    throw new Error(result.error || 'Failed to fetch products')
  }

  return result
}

/**
 * Enhance a product with authentication
 */
export async function enhanceProduct(productId: string, shop: string, data: Record<string, unknown>) {
  // Validate productId before making request
  const invalidProductIds = ['undefined', 'null', 'metafields', 'staging-test', '']
  if (!productId || invalidProductIds.includes(productId.toLowerCase())) {
    logger.error('❌ Invalid productId in enhanceProduct:', productId as Error, { component: 'api-client' })
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
    logger.error('❌ Invalid productId in getProductPrepopulation:', productId as Error, { component: 'api-client' })
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