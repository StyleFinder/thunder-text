import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'
import { getAccessToken } from '@/lib/shopify-auth'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const shop = searchParams.get('shop')

    if (!productId || !shop) {
      return NextResponse.json(
        { error: 'Missing productId or shop parameter' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📦 API: Fetching product data for prepopulation:', { productId, shop })

    // Get session token from Authorization header if provided
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    // Ensure shop has .myshopify.com
    const fullShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    console.log('🔍 Product prepopulation - fetching for:', {
      shop: fullShop,
      productId,
      hasSessionToken: !!sessionToken
    })

    // Get access token using proper Token Exchange
    let accessToken: string
    try {
      accessToken = await getAccessToken(fullShop, sessionToken)
      console.log('✅ Got access token')
    } catch (error) {
      console.error('❌ Failed to get access token:', error)
      return NextResponse.json({
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 401, headers: corsHeaders })
    }

    // Format product ID for GraphQL
    let formattedProductId = productId
    if (!productId.startsWith('gid://')) {
      formattedProductId = `gid://shopify/Product/${productId}`
    }

    console.log('📝 Formatted product ID:', formattedProductId)

    // GraphQL query for comprehensive product data
    const { GraphQLClient } = await import('graphql-request')
    const client = new GraphQLClient(
      `https://${fullShop}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    interface ImageNode {
      id: string
      url: string
      altText: string | null
      width: number
      height: number
    }

    interface CollectionNode {
      id: string
      title: string
      handle: string
    }

    interface VariantNode {
      id: string
      title: string
      price: string
      sku: string | null
    }

    interface MetafieldNode {
      id: string
      namespace: string
      key: string
      value: string
      type: string
    }

    interface ProductData {
      id: string
      title: string
      handle: string
      description: string
      descriptionHtml: string
      vendor: string
      productType: string
      tags: string[]
      seo: {
        title: string | null
        description: string | null
      }
      images: {
        edges: Array<{ node: ImageNode }>
      }
      collections: {
        edges: Array<{ node: CollectionNode }>
      }
      variants: {
        edges: Array<{ node: VariantNode }>
      }
      metafields: {
        edges: Array<{ node: MetafieldNode }>
      }
    }

    interface ProductResponse {
      product?: ProductData
    }

    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
          descriptionHtml
          vendor
          productType
          tags
          seo {
            title
            description
          }
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          collections(first: 10) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
              }
            }
          }
          metafields(first: 50) {
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    `

    console.log('🔍 Executing query with ID:', formattedProductId)

    const data = await client.request<ProductResponse>(query, { id: formattedProductId })

    if (!data?.product) {
      console.error('❌ No product found in response')
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const product = data.product

    // Transform to PrePopulatedProductData format
    const processedData = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      images: product.images.edges.map(({ node }: { node: ImageNode }) => ({
        url: node.url,
        altText: node.altText,
        width: node.width,
        height: node.height,
      })),
      category: {
        primary: product.productType || 'general',
        collections: product.collections.edges.map(({ node }: { node: CollectionNode }) => node.title),
      },
      variants: product.variants.edges.map(({ node }: { node: VariantNode }) => ({
        id: node.id,
        title: node.title,
        price: node.price,
        sku: node.sku,
      })),
      materials: {
        fabric: undefined,
        composition: [],
        careInstructions: [],
      },
      metafields: {
        sizing: undefined,
        specifications: undefined,
        features: undefined,
      },
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags,
      existingDescription: product.descriptionHtml,
      seoTitle: product.seo?.title,
      seoDescription: product.seo?.description,
    }

    console.log('✅ API: Successfully fetched and processed product data')
    return NextResponse.json(processedData, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ API: Error fetching product data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch product data' },
      { status: 500, headers: corsHeaders }
    )
  }
}