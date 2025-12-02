import { authenticatedFetch } from '@shopify/app-bridge/utilities'
import type { ClientApplication } from '@shopify/app-bridge'
import { logger } from '@/lib/logger'

/**
 * Create an authenticated fetch function that automatically includes session tokens
 * This is the proper way to make API calls from an embedded Shopify app
 */
export function createAuthenticatedFetch(app: ClientApplication) {
  return authenticatedFetch(app)
}

/**
 * Helper to make authenticated API calls with proper error handling
 */
export async function makeAuthenticatedRequest(
  app: ClientApplication,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const fetchFunction = authenticatedFetch(app)

  try {
    const response = await fetchFunction(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // If we get a 401, the session token might be expired
    // App Bridge will automatically refresh it on the next request
    if (response.status === 401) {
      // Retry once with a fresh token
      return await fetchFunction(url, options)
    }

    return response
  } catch (error) {
    logger.error('❌ Authenticated fetch failed:', error as Error, { component: 'authenticated-fetch' })
    throw error
  }
}