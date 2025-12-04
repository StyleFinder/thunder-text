import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'
import { logger } from '@/lib/logger'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    logger.error('❌ Supabase not configured', undefined, { component: 'product-types' })
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503, headers: corsHeaders }
    )
  }

  try {
    // Dynamic imports to avoid loading during build
    const { supabaseAdmin } = await import('@/lib/supabase')

    // Get shop domain from query param
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    console.log('📋 Shop parameter received:', shop)

    if (!shop) {
      logger.error('❌ No shop parameter provided', undefined, { component: 'product-types' })
      return NextResponse.json(
        { error: 'Shop parameter required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get shop information using shop domain from shops table (OAuth tokens)
    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    console.log('📊 Query:', `SELECT shop_domain, shopify_access_token, shopify_access_token_legacy FROM shops WHERE shop_domain = '${fullShopDomain}'`)

    const { data: store, error: storeError } = await supabaseAdmin
      .from('shops')
      .select('shop_domain, shopify_access_token, shopify_access_token_legacy')
      .eq('shop_domain', fullShopDomain)
      .single()

    if (storeError || !store) {
      logger.error('❌ Shop lookup error:', undefined, { 
        error: storeError,
        searchedDomain: fullShopDomain,
        storeData: store
      , component: 'product-types' })
      return NextResponse.json(
        {
          error: 'Shop not found',
          details: {
            searchedDomain: fullShopDomain,
            message: storeError?.message || 'No store data returned'
          }
        },
        { status: 404, headers: corsHeaders }
      )
    }

    const accessToken = store.shopify_access_token || store.shopify_access_token_legacy
    if (!accessToken) {
      logger.error(`No access token found for shop: ${fullShopDomain}`, undefined, { component: 'product-types' })
      return NextResponse.json(
        { error: 'Shop access token not configured' },
        { status: 500, headers: corsHeaders }
      )
    }


    // Query all products and extract unique product types
    // Note: Shopify doesn't have a direct productTypes query, we need to get them from products
    const query = `
      query GetProductTypes {
        products(first: 250) {
          edges {
            node {
              productType
            }
          }
        }
      }
    `

    const shopifyApiUrl = `https://${store.shop_domain}/admin/api/2024-01/graphql.json`

    const shopifyResponse = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query }),
    })

    if (!shopifyResponse.ok) {
      logger.error(`Shopify API error: ${shopifyResponse.status} ${shopifyResponse.statusText}`, undefined, { component: 'product-types' })
      throw new Error(`Shopify API error: ${shopifyResponse.statusText}`)
    }

    const shopifyData = await shopifyResponse.json()

    interface ProductEdge {
      node: {
        productType: string | null
      }
    }

    // Extract unique product types from all products
    const productTypes = shopifyData.data?.products?.edges?.map((edge: ProductEdge) => edge.node.productType).filter(Boolean) || []
    const uniqueTypes = Array.from(new Set(productTypes)).sort()

    return NextResponse.json({
      success: true,
      data: {
        productTypes: uniqueTypes,
        count: uniqueTypes.length
      },
    }, { headers: corsHeaders })

  } catch (error) {
    logger.error('Shopify product types API error:', error as Error, { component: 'product-types' })
    return NextResponse.json(
      { error: 'Failed to fetch product types' },
      { status: 500, headers: corsHeaders }
    )
  }
}