import { ShopifyAPI } from '../shopify'
import { getShopToken } from './token-manager'

// Helper function to get Shopify access token for a shop
async function getShopifyAccessToken(shop: string, sessionToken?: string): Promise<string> {
  // Priority order for getting tokens:
  // 1. Session token from App Bridge (for embedded apps)
  // 2. Access token from database (for OAuth flow)
  // 3. Mock token for development with auth bypass

  // If session token is provided, use it directly
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

  // Check if this is development and we have auth bypass
  if (process.env.NODE_ENV === 'development' && process.env.SHOPIFY_AUTH_BYPASS === 'true') {
    // For development, return a mock token to allow the mock data flow to work
    console.log('🧪 Development mode: returning mock access token for shop:', shop)
    return 'mock_development_token_12345'
  }

  throw new Error(`Access token not found for shop: ${shop}. Please ensure the app is properly installed.`)
}

// Wrapper function that matches the expected interface
export async function shopifyGraphQL(query: string, variables: any, shop: string, sessionToken?: string) {
  try {
    // Get the access token for this shop
    const accessToken = await getShopifyAccessToken(shop, sessionToken)
    
    // Create ShopifyAPI instance
    const client = new ShopifyAPI(shop, accessToken)
    
    // Execute the query using the existing client
    // Note: We'll need to call the underlying GraphQL client directly
    // For now, let's create a simple wrapper that uses the existing methods
    
    console.log('🔍 Executing Shopify GraphQL query for shop:', shop)
    console.log('📝 Query variables:', variables)
    
    // If this is a product query, handle it specially
    if (query.includes('query getProduct') || query.includes('product(id: $id)')) {
      return await executeProductQuery(client, variables.id)
    }
    
    // For other queries, we'll need to extend the ShopifyAPI class
    // For now, throw an error to indicate we need to implement specific handlers
    throw new Error('GraphQL query type not yet implemented. Please implement specific handler.')
    
  } catch (error) {
    console.error('❌ Shopify GraphQL query failed:', error)
    throw error
  }
}

// Specialized product query handler
async function executeProductQuery(client: ShopifyAPI, productId: string) {
  // For development, we'll create a mock response that matches our expected structure
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Development mode: returning mock product data for:', productId)
    
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