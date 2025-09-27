import { ShopifyAPI } from '../shopify'
import { getOrExchangeToken, validateSessionToken } from './token-exchange'

// Helper function to get Shopify access token for a shop
async function getShopifyAccessToken(shop: string, sessionToken?: string): Promise<string> {
  console.log('🔍 Getting Shopify access token for shop:', shop)

  // New Token Exchange flow:
  // 1. First check database for offline token
  // 2. If no database token, validate and exchange session token
  // 3. Use access token for API calls

  // Always try database first - this is most reliable
  try {
    const { getShopToken } = await import('./shopify/token-manager')
    const dbToken = await getShopToken(shop)
    if (dbToken.success && dbToken.accessToken) {
      console.log('✅ Using existing access token from database')
      return dbToken.accessToken
    }
  } catch (error) {
    console.log('⚠️ Could not check database for token:', error)
  }

  // If we have a session token, try to use it
  if (sessionToken && sessionToken !== 'undefined') {
    // Validate the session token first
    if (!validateSessionToken(sessionToken)) {
      console.log('⚠️ Session token invalid or expired, will check database')
      // Don't throw here - let it fall through to database check
    } else {
      console.log('✅ Valid session token provided for shop:', shop)

      // Try to exchange the session token
      try {
        const accessToken = await getOrExchangeToken(shop, sessionToken)
        console.log('✅ Access token obtained via token exchange')
        return accessToken
      } catch (exchangeError) {
        console.error('⚠️ Token exchange failed:', exchangeError)
        // Don't throw yet - might still have database token
      }
    }
  }

  // Final attempt - try database one more time (in case it was just added)
  try {
    const { getShopToken } = await import('./shopify/token-manager')
    const dbToken = await getShopToken(shop)
    if (dbToken.success && dbToken.accessToken) {
      console.log('✅ Found database token on retry')
      return dbToken.accessToken
    }
  } catch (error) {
    console.error('❌ Final database check failed:', error)
  }

  // If we get here, we have no valid token
  throw new Error(`Access token not available for shop: ${shop}. Please ensure the app is properly installed.`)
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