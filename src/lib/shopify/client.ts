import { ShopifyAPI } from '../shopify'
import { getAccessToken } from '../shopify-auth'

// Helper function to get Shopify access token for a shop
async function getShopifyAccessToken(shop: string, sessionToken?: string): Promise<string> {
  console.log('🔍 Getting Shopify access token for shop:', shop)

  // Use the official Shopify authentication library
  // This will either use database token or Token Exchange
  const accessToken = await getAccessToken(shop, sessionToken)
  console.log('✅ Access token obtained')
  return accessToken
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