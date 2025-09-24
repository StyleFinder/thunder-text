/**
 * Client-side API utilities for making authenticated requests to Shopify API endpoints
 */

/**
 * Get the Shopify session token from sessionStorage
 */
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem('shopify_session_token')
}

/**
 * Make an authenticated fetch request to our API endpoints
 * Automatically adds the session token if available
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const sessionToken = getSessionToken()

  // Add session token to headers if available
  const headers: HeadersInit = {
    ...options.headers,
    'Content-Type': 'application/json'
  }

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`
  }

  return fetch(url, {
    ...options,
    headers
  })
}

/**
 * Fetch products with authentication
 */
export async function fetchProducts(params: URLSearchParams) {
  const response = await authenticatedFetch(`/api/shopify/products?${params}`)
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch products')
  }

  return result
}

/**
 * Enhance a product with authentication
 */
export async function enhanceProduct(productId: string, shop: string, data: any) {
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