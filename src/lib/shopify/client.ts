import { ShopifyAPI } from '../shopify'
import { getAccessToken } from '../shopify-auth'
import { logger } from '@/lib/logger'
import {
  withCircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitStatus,
} from '@/lib/resilience/circuit-breaker'

// Helper function to get Shopify access token for a shop
async function getShopifyAccessToken(shop: string, sessionToken?: string): Promise<string> {

  // Use the official Shopify authentication library
  // This will either use database token or Token Exchange
  const accessToken = await getAccessToken(shop, sessionToken)
  return accessToken
}

/**
 * Check if error should bypass circuit breaker
 * Auth errors and invalid request errors shouldn't count as service failures
 */
function isNonCircuitBreakerError(error: Error): boolean {
  const message = error.message.toLowerCase()

  // Auth errors - shop-specific, not service-wide
  if (message.includes('unauthorized') || message.includes('authentication')) {
    return true
  }

  // Invalid request - client error, not service failure
  if (message.includes('invalid') || message.includes('syntax error')) {
    return true
  }

  return false
}

/**
 * Custom error for circuit breaker open state
 */
export class ShopifyCircuitOpenError extends Error {
  retryAfterMs: number

  constructor(message: string, retryAfterMs: number) {
    super(message)
    this.name = 'ShopifyCircuitOpenError'
    this.retryAfterMs = retryAfterMs
  }
}

// Wrapper function that matches the expected interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function shopifyGraphQL<T = any>(query: string, variables: Record<string, unknown>, shop: string, sessionToken?: string): Promise<{ data: T }> {
  return withCircuitBreaker(
    'shopify',
    async () => {
      return executeShopifyGraphQL<T>(query, variables, shop, sessionToken)
    },
    {
      isNonRetryableError: isNonCircuitBreakerError,
    }
  ).catch((error) => {
    if (error instanceof CircuitBreakerOpenError) {
      const status = getCircuitStatus('shopify')
      logger.warn(`Shopify circuit breaker OPEN - ${status.failureCount} failures`, {
        component: 'shopify-client',
        shop,
      })
      throw new ShopifyCircuitOpenError(
        `Shopify API temporarily unavailable (circuit breaker open). ` +
        `${status.failureCount} failures in last ${Math.floor(status.config.failureWindowMs / 1000)}s. ` +
        `Retry after ${Math.ceil(error.retryAfterMs / 1000)}s.`,
        error.retryAfterMs
      )
    }
    throw error
  })
}

/**
 * Execute the actual Shopify GraphQL request
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeShopifyGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown>,
  shop: string,
  sessionToken?: string
): Promise<{ data: T }> {
  try {

    // Get the access token for this shop
    const accessToken = await getShopifyAccessToken(shop, sessionToken)


    // Use the GraphQLClient for real API calls

    // Ensure shop domain format is correct
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    const { GraphQLClient } = await import('graphql-request')
    const client = new GraphQLClient(
      `https://${shopDomain}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    const response = await client.request<T>(query, variables)
    return { data: response }

  } catch (error) {
    logger.error('❌ Shopify GraphQL query failed:', error as Error, { component: 'client' })
    throw error
  }
}

// Export the ShopifyAPI class for direct use when needed
export { ShopifyAPI }