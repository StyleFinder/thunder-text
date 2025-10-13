import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
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

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parameter required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get shop information using shop domain from shops table (OAuth tokens)
    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    console.log('🔍 Looking up shop:', fullShopDomain)

    const { data: store, error: storeError } = await supabaseAdmin
      .from('shops')
      .select('shop_domain, access_token')
      .eq('shop_domain', fullShopDomain)
      .single()

    if (storeError || !store) {
      console.error('❌ Shop lookup error:', storeError)
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('✅ Shop found:', store.shop_domain)

    // Use Shopify GraphQL Admin API's productTypes query directly
    const query = `
      query GetProductTypes {
        productTypes(first: 250) {
          edges {
            node
          }
        }
      }
    `

    const shopifyApiUrl = `https://${store.shop_domain}/admin/api/2024-01/graphql.json`
    console.log('🔍 Calling Shopify GraphQL API:', shopifyApiUrl)

    const shopifyResponse = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.access_token,
      },
      body: JSON.stringify({ query }),
    })

    if (!shopifyResponse.ok) {
      console.error('❌ Shopify API error:', shopifyResponse.status, shopifyResponse.statusText)
      throw new Error(`Shopify API error: ${shopifyResponse.statusText}`)
    }

    const shopifyData = await shopifyResponse.json()
    console.log('✅ Shopify productTypes response:', shopifyData)

    // Extract product types from response
    const uniqueTypes = shopifyData.data?.productTypes?.edges?.map((edge: any) => edge.node) || []
    console.log('✅ Found product types:', uniqueTypes)

    return NextResponse.json({
      success: true,
      data: {
        productTypes: uniqueTypes,
        count: uniqueTypes.length
      },
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Shopify product types API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product types' },
      { status: 500, headers: corsHeaders }
    )
  }
}