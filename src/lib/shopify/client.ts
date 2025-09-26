import { ShopifyAPI } from '../shopify'
import { getShopToken } from './token-manager'
import { getShopifyAccessToken as getEnvToken } from './get-access-token'

// Helper function to get Shopify access token for a shop
async function getShopifyAccessToken(shop: string, sessionToken?: string): Promise<string> {
  console.log('🔍 Getting Shopify access token for shop:', shop)

  // Priority order for getting tokens:
  // 1. Session token from App Bridge (for embedded apps)
  // 2. Access token from database (for OAuth flow)
  // 3. Throw error if no token found (no more bypass logic)

  // If session token is provided, use it
  if (sessionToken && sessionToken !== 'undefined') {
    console.log('✅ Using session token from App Bridge for shop:', shop)
    return sessionToken
  }

  // Try to get permanent access token from database (PRIMARY METHOD)
  try {
    const tokenResult = await getShopToken(shop)
    if (tokenResult.success && tokenResult.accessToken) {
      console.log('✅ Retrieved access token from database for shop:', shop)
      return tokenResult.accessToken
    }
  } catch (error) {
    console.log('⚠️ Failed to retrieve token from database:', error)
  }

  console.error('❌ No access token found for shop:', shop)
  console.error('📝 Checked:', {
    sessionToken: !!sessionToken,
    databaseQuery: 'attempted'
  })

  throw new Error(`Access token not found for shop: ${shop}. Please ensure the app is properly installed through Shopify.`)
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