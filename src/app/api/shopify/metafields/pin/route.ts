import { NextRequest, NextResponse } from 'next/server'
import { ShopifyOfficialAPI } from '@/lib/shopify-official'
import { getShopToken } from '@/lib/shopify/token-manager'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const productId = url.searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter required' }, { status: 400 })
    }

    // Get access token for shop from database (production-ready authentication)
    const tokenResult = await getShopToken(shop)
    if (!tokenResult.success || !tokenResult.accessToken) {
      return NextResponse.json({
        error: 'Unauthorized - no valid access token. Please authenticate via Shopify OAuth.'
      }, { status: 401 })
    }
    const accessToken = tokenResult.accessToken

    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Initialize Shopify API
    const shopify = new ShopifyOfficialAPI(shopDomain, accessToken)

    // Important Google metafields to auto-pin
    const importantMetafields = [
      'google.google_product_category',
      'google.condition', 
      'google.gender',
      'google.material',
      'google.pattern',
      'thunder_text.meta_description'
    ]


    // Note: Unfortunately, Shopify doesn't provide a direct API to "pin" metafields
    // Pinning is a UI-only feature that stores user preferences
    // However, we can:
    // 1. Retrieve the metafields to verify they exist
    // 2. Return instructions for manual pinning
    // 3. In the future, potentially use Shopify Admin API extensions

    interface MetafieldNode {
      id: string
      namespace: string
      key: string
      value: string
      type: string
    }

    interface MetafieldsResponse {
      product?: {
        metafields?: {
          edges?: Array<{
            node: MetafieldNode
          }>
        }
      }
    }

    const metafieldQuery = `
      query getProductMetafields($id: ID!) {
        product(id: $id) {
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

    const response = await shopify.client.request<MetafieldsResponse>(metafieldQuery, {
      variables: { id: productId }
    })

    const metafields = response.data?.product?.metafields?.edges?.map((edge: { node: MetafieldNode }) => edge.node) || []
    const foundImportantMetafields = metafields.filter((mf: MetafieldNode) =>
      importantMetafields.includes(`${mf.namespace}.${mf.key}`)
    )


    return NextResponse.json({
      success: true,
      message: `Found ${foundImportantMetafields.length} important metafields`,
      metafields: foundImportantMetafields.map((mf: MetafieldNode) => ({
        namespace: mf.namespace,
        key: mf.key,
        value: mf.value
      })),
      instructions: [
        'To make these metafields visible on the product page:',
        '1. Go to the product in Shopify admin',
        '2. Scroll to the "Metafields" section',
        '3. Click "View all" to see all metafields',
        '4. Click the pin icon next to important metafields to make them visible'
      ],
      autoPin: false, // Not possible via API
      reason: 'Shopify does not provide API access to pin/unpin metafields - this is a UI-only feature'
    })

  } catch (error) {
    logger.error('❌ Error in metafield pinning:', error as Error, { component: 'pin' })
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process metafield pinning', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}