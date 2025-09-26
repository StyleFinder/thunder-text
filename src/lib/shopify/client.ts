import { ShopifyAPI } from '../shopify'
import { getOrExchangeToken, validateSessionToken } from './token-exchange'

// Helper function to get Shopify access token for a shop
async function getShopifyAccessToken(shop: string, sessionToken?: string): Promise<string> {
  console.log('🔍 Getting Shopify access token for shop:', shop)

  // New Token Exchange flow:
  // 1. Validate session token if provided
  // 2. Exchange session token for access token OR get from database
  // 3. Use access token for API calls

  if (sessionToken && sessionToken !== 'undefined') {
    // Validate the session token first
    if (!validateSessionToken(sessionToken)) {
      throw new Error('Invalid or expired session token')
    }
    console.log('✅ Valid session token provided for shop:', shop)
  }

  // Get or exchange for an access token
  try {
    const accessToken = await getOrExchangeToken(shop, sessionToken)
    console.log('✅ Access token obtained for shop:', shop)
    return accessToken
  } catch (error) {
    console.error('❌ Failed to get access token:', error)
    throw new Error(`Access token not available for shop: ${shop}. Please ensure the app is properly installed.`)
  }
}

// Wrapper function that matches the expected interface
export async function shopifyGraphQL(query: string, variables: any, shop: string, sessionToken?: string) {
  try {
    console.log('🔍 Starting Shopify GraphQL query for shop:', shop)
    console.log('📝 Query variables:', JSON.stringify(variables, null, 2))

    // Get the access token for this shop
    const accessToken = await getShopifyAccessToken(shop, sessionToken)

    console.log('🔑 Access token status:', accessToken ? 'Available' : 'Missing')

    // Use the GraphQLClient for real API calls
    console.log('✅ Using Shopify API with access token')

    const { GraphQLClient } = await import('graphql-request')
    const client = new GraphQLClient(
      `https://${shop}.myshopify.com/admin/api/2025-01/graphql.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    const response = await client.request(query, variables)
    console.log('✅ Shopify GraphQL query successful')
    return { data: response }
    
  } catch (error) {
    console.error('❌ Shopify GraphQL query failed:', error)
    throw error
  }
}

// Export the ShopifyAPI class for direct use when needed
export { ShopifyAPI }