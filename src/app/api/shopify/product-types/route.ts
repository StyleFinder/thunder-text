import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
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
      // Production authentication
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // Get store information
      const { data: dbStore, error: storeError } = await supabaseAdmin
        .from('stores')
        .select('shop_domain, access_token')
        .eq('id', session.user.id)
        .single()

      if (storeError || !dbStore) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }
      store = dbStore
    }

    if (!store) {
      return NextResponse.json(
        { error: 'Store configuration not found' },
        { status: 404 }
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
    })

  } catch (error) {
    console.error('Shopify product types API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product types' },
      { status: 500 }
    )
  }
}