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
    const { auth } = await import('@/lib/auth')
    const { ShopifyAPI } = await import('@/lib/shopify')
    const { supabaseAdmin } = await import('@/lib/supabase')
    
    // Check for development bypass or proper session
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'
    
    let session = null
    let store = null
    
    if (authBypass && shop) {
      // Development mode bypass
      console.log('Using auth bypass for development - product-types')
      store = {
        shop_domain: shop,
        access_token: process.env.SHOPIFY_ACCESS_TOKEN || 'dev-token'
      }
    } else {
      // Production authentication - use shop domain from query param
      if (!shop) {
        return NextResponse.json(
          { error: 'Shop parameter required' },
          { status: 400, headers: corsHeaders }
        )
      }

      // Get store information using shop domain
      const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
      const { data: dbStore, error: storeError } = await supabaseAdmin
        .from('stores')
        .select('shop_domain, access_token')
        .eq('shop_domain', fullShopDomain)
        .single()

      if (storeError || !dbStore) {
        console.error('Store lookup error:', storeError)
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404, headers: corsHeaders }
        )
      }
      store = dbStore
    }

    if (!store) {
      return NextResponse.json(
        { error: 'Store configuration not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const shopify = new ShopifyAPI(store.shop_domain, store.access_token)
    
    // Get all products to extract unique product types
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '250') // Get more products to find all types
    
    const products = await shopify.getProducts(limit)
    
    // Extract unique product types from existing products
    const productTypes = new Set<string>()
    
    if (products?.products?.edges) {
      products.products.edges.forEach((edge: any) => {
        if (edge.node.productType && edge.node.productType.trim()) {
          productTypes.add(edge.node.productType.trim())
        }
      })
    }

    // Convert to array and sort
    const uniqueTypes = Array.from(productTypes).sort()

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