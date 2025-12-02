import { ShopifyAPI } from '../shopify'
import { getAccessToken } from '../shopify-auth'
import { logger } from '@/lib/logger'

// Helper function to get Shopify access token for a shop
async function getShopifyAccessToken(shop: string, sessionToken?: string): Promise<string> {

  // Use the official Shopify authentication library
  // This will either use database token or Token Exchange
  const accessToken = await getAccessToken(shop, sessionToken)
  return accessToken
}

// Wrapper function that matches the expected interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function shopifyGraphQL<T = any>(query: string, variables: Record<string, unknown>, shop: string, sessionToken?: string): Promise<{ data: T }> {
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