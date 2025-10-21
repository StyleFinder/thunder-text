import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { auth } = await import('@/lib/auth')
    const { ShopifyOfficialAPI } = await import('@/lib/shopify-official')
    
    // Check for development bypass or proper session
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const productId = url.searchParams.get('productId')
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'
    
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }
    
    let storeData = null
    
    if (authBypass && shop) {
      console.log('Using auth bypass for metafield pinning')
      const testStore = process.env.SHOPIFY_TEST_STORE || 'zunosai-staging-test-store'
      storeData = {
        shop_domain: `${testStore}.myshopify.com`,
        access_token: process.env.SHOPIFY_ACCESS_TOKEN || 'dev-token'
      }
    } else {
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (!storeData) {
      return NextResponse.json({ error: 'Store configuration not found' }, { status: 400 })
    }

    // Initialize Shopify API
    const shopify = new ShopifyOfficialAPI(storeData.shop_domain, storeData.access_token)

    // Important Google metafields to auto-pin
    const importantMetafields = [
      'google.google_product_category',
      'google.condition', 
      'google.gender',
      'google.material',
      'google.pattern',
      'thunder_text.meta_description'
    ]

    console.log(`🔧 Auto-pinning important metafields for product ${productId}...`)

    // Note: Unfortunately, Shopify doesn't provide a direct API to "pin" metafields
    // Pinning is a UI-only feature that stores user preferences
    // However, we can:
    // 1. Retrieve the metafields to verify they exist
    // 2. Return instructions for manual pinning
    // 3. In the future, potentially use Shopify Admin API extensions

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

    const response = await shopify.client.request(metafieldQuery, {
      variables: { id: productId }
    })

    interface MetafieldNode {
      id: string
      namespace: string
      key: string
      value: string
      type: string
    }

    const metafields = response.data?.product?.metafields?.edges?.map((edge: { node: MetafieldNode }) => edge.node) || []
    const foundImportantMetafields = metafields.filter((mf: MetafieldNode) =>
      importantMetafields.includes(`${mf.namespace}.${mf.key}`)
    )

    console.log(`✅ Found ${foundImportantMetafields.length}/${importantMetafields.length} important metafields`)

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
    console.error('❌ Error in metafield pinning:', error)
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