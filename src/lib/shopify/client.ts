import { ShopifyAPI } from '../shopify'
import { getShopToken } from './token-manager'
import { getShopifyAccessToken as getEnvToken } from './get-access-token'

// Helper function to get Shopify access token for a shop
async function getShopifyAccessToken(shop: string, sessionToken?: string): Promise<string> {
  console.log('🔍 Getting Shopify access token for shop:', shop)

  // Priority order for getting tokens:
  // 1. Environment variable token (for Vercel deployment)
  // 2. Session token from App Bridge (for embedded apps)
  // 3. Access token from database (for OAuth flow)
  // 4. Mock token for development with auth bypass

  // Check for environment variable token FIRST (for Vercel deployment)
  const envToken = getEnvToken()
  if (envToken) {
    console.log('✅ Using access token from environment variable for shop:', shop)
    return envToken
  }

  // If session token is provided, use it
  if (sessionToken && sessionToken !== 'undefined') {
    console.log('✅ Using session token from App Bridge for shop:', shop)
    return sessionToken
  }

  // Try to get permanent access token from database
  try {
    const tokenResult = await getShopToken(shop)
    if (tokenResult.success && tokenResult.accessToken) {
      console.log('✅ Retrieved access token from database for shop:', shop)
      return tokenResult.accessToken
    }
  } catch (error) {
    console.log('⚠️ Failed to retrieve token from database:', error)
  }

  // Only use mock token if auth bypass is enabled AND no real token exists
  if (process.env.NODE_ENV === 'development' && process.env.SHOPIFY_AUTH_BYPASS === 'true') {
    console.log('🧪 Development mode with auth bypass: returning mock token for shop:', shop)
    return 'mock_development_token_12345'
  }

  console.error('❌ No access token found. Checked:', {
    envToken: !!envToken,
    sessionToken: !!sessionToken,
    authBypass: process.env.SHOPIFY_AUTH_BYPASS,
    nodeEnv: process.env.NODE_ENV
  })

  throw new Error(`Access token not found for shop: ${shop}. Please ensure the app is properly installed.`)
}

// Wrapper function that matches the expected interface
export async function shopifyGraphQL(query: string, variables: any, shop: string, sessionToken?: string) {
  try {
    console.log('🔍 Starting Shopify GraphQL query for shop:', shop)
    console.log('📝 Query variables:', JSON.stringify(variables, null, 2))

    // Get the access token for this shop
    const accessToken = await getShopifyAccessToken(shop, sessionToken)

    console.log('🔑 Access token status:', accessToken ? 'Available' : 'Missing')

    // Skip mock mode if we have a real access token
    const hasRealToken = accessToken &&
      accessToken !== 'mock_development_token_12345' &&
      accessToken !== '' &&
      accessToken !== 'placeholder-token'

    if (hasRealToken) {
      console.log('✅ Using real Shopify API with access token')

      // Use the GraphQLClient directly for real API calls
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

      try {
        const response = await client.request(query, variables)
        console.log('✅ Shopify GraphQL query successful')
        return { data: response }
      } catch (graphqlError) {
        console.error('❌ GraphQL request failed:', graphqlError)
        throw graphqlError
      }
    } else {
      console.log('🧪 No valid token, using mock mode')

      // Only use mock mode if no real token is available
      if (query.includes('query GetProduct') || query.includes('product(id: $id)')) {
        const mockClient = new ShopifyAPI(shop, 'mock_development_token_12345')
        return await executeProductQuery(mockClient, variables.id)
      }

      throw new Error('No valid access token available and query type not supported in mock mode')
    }
    
  } catch (error) {
    console.error('❌ Shopify GraphQL query failed:', error)

    // In development with auth bypass, fall back to mock data
    if (process.env.NODE_ENV === 'development' && process.env.SHOPIFY_AUTH_BYPASS === 'true') {
      console.log('🧪 Falling back to mock data due to error in development mode')

      // If this was a product query, return mock product data
      if (query.includes('query GetProduct') || query.includes('product(id: $id)')) {
        const mockClient = new ShopifyAPI(shop, 'mock_development_token_12345')
        return await executeProductQuery(mockClient, variables.id)
      }
    }

    throw error
  }
}

// Specialized product query handler
async function executeProductQuery(client: ShopifyAPI, productId: string) {
  // For development with auth bypass or mock token, we'll create a mock response
  const isMockMode = process.env.NODE_ENV === 'development' &&
    (process.env.SHOPIFY_AUTH_BYPASS === 'true' || client.accessToken === 'mock_development_token_12345')

  if (isMockMode) {
    console.log('🧪 Development mode: returning mock product data')
    console.log('📦 Product ID requested:', productId)
    console.log('📝 ID format:', productId.startsWith('gid://') ? 'GraphQL' : 'Numeric')
    
    return {
      data: {
        product: {
          id: productId,
          title: "Effortless Elegance: Wrinkle-Resistant Tops",
          handle: "effortless-elegance-wrinkle-resistant-tops",
          description: "Step into a world of effortless elegance with these wrinkle-resistant tops, crafted from a luxurious blend of premium fabrics. Designed for the modern woman who values both comfort and sophistication, these versatile pieces transition seamlessly from day to night.",
          descriptionHtml: "<p>Step into a world of effortless elegance with these wrinkle-resistant tops, crafted from a luxurious blend of premium fabrics. Designed for the modern woman who values both comfort and sophistication, these versatile pieces transition seamlessly from day to night.</p>",
          vendor: "zunosai-staging-test-store",
          productType: "Tops",
          tags: ["wrinkle-resistant tops", "women's fashion"],
          status: "ACTIVE",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-15T00:00:00Z",
          seo: {
            title: "Effortless Elegance: Wrinkle-Resistant Tops - Premium Women's Fashion",
            description: "Discover wrinkle-resistant tops that combine style and comfort. Perfect for busy professionals who want to look polished all day long."
          },
          images: {
            edges: [
              {
                node: {
                  id: "gid://shopify/ProductImage/1",
                  url: "https://cdn.shopify.com/s/files/1/0692/7299/3952/products/blue-top-front.jpg",
                  altText: "Blue wrinkle-resistant top - front view",
                  width: 800,
                  height: 1000
                }
              },
              {
                node: {
                  id: "gid://shopify/ProductImage/2", 
                  url: "https://cdn.shopify.com/s/files/1/0692/7299/3952/products/lavender-top-front.jpg",
                  altText: "Lavender wrinkle-resistant top - front view",
                  width: 800,
                  height: 1000
                }
              }
            ]
          },
          variants: {
            edges: [
              {
                node: {
                  id: "gid://shopify/ProductVariant/1",
                  title: "XS / Blue",
                  price: "89.99",
                  sku: "WRT-BLUE-XS",
                  weight: 0.5,
                  weightUnit: "POUNDS",
                  metafields: {
                    edges: [
                      {
                        node: {
                          namespace: "sizing",
                          key: "size_range",
                          value: "XS-XL",
                          type: "single_line_text_field"
                        }
                      }
                    ]
                  }
                }
              },
              {
                node: {
                  id: "gid://shopify/ProductVariant/2",
                  title: "S / Blue",
                  price: "89.99",
                  sku: "WRT-BLUE-S",
                  weight: 0.5,
                  weightUnit: "POUNDS",
                  metafields: {
                    edges: []
                  }
                }
              },
              {
                node: {
                  id: "gid://shopify/ProductVariant/3",
                  title: "XS / Lavender",
                  price: "89.99",
                  sku: "WRT-LAV-XS",
                  weight: 0.5,
                  weightUnit: "POUNDS",
                  metafields: {
                    edges: []
                  }
                }
              }
            ]
          },
          collections: {
            edges: [
              {
                node: {
                  id: "gid://shopify/Collection/1",
                  title: "Women's Tops",
                  handle: "womens-tops"
                }
              },
              {
                node: {
                  id: "gid://shopify/Collection/2",
                  title: "Wrinkle-Resistant Collection",
                  handle: "wrinkle-resistant"
                }
              }
            ]
          },
          metafields: {
            edges: [
              {
                node: {
                  namespace: "custom",
                  key: "fabric",
                  value: "68% Polyester, 28% Rayon, 4% Spandex",
                  type: "single_line_text_field"
                }
              },
              {
                node: {
                  namespace: "custom", 
                  key: "care_instructions",
                  value: "Machine wash cold, tumble dry low, do not bleach",
                  type: "single_line_text_field"
                }
              },
              {
                node: {
                  namespace: "custom",
                  key: "features",
                  value: "Wrinkle-resistant fabric, Breathable material, Professional appearance, Easy care",
                  type: "single_line_text_field"
                }
              },
              {
                node: {
                  namespace: "sizing",
                  key: "fit_guide",
                  value: "True to size, relaxed fit through body",
                  type: "single_line_text_field"
                }
              }
            ]
          }
        }
      }
    }
  }

  // In production, implement actual GraphQL query execution
  throw new Error('Production GraphQL execution not yet implemented')
}

// Export the ShopifyAPI class for direct use when needed
export { ShopifyAPI }