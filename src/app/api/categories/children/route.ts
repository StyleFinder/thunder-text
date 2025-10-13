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
    const { supabaseAdmin } = await import('@/lib/supabase')

    // Thunder Text uses Shopify OAuth authentication
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const parentId = url.searchParams.get('parentId')

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Get shop ID from shops table using shop_domain
    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', fullShopDomain)
      .single()

    if (shopError || !shopData) {
      console.error('Shop lookup error:', shopError)
      return NextResponse.json(
        { error: 'Shop not found. Please ensure the app is installed.' },
        { status: 404 }
      )
    }

    // Get sub-categories for the specified parent
    let query = supabaseAdmin
      .from('custom_categories')
      .select('*')
      .eq('store_id', shopData.id)
      .order('sort_order, name')

    if (parentId && parentId !== 'null') {
      // Get children of specific parent
      query = query.eq('parent_id', parentId)
    } else {
      // Get top-level categories (no parent)
      query = query.is('parent_id', null)
    }

    const { data: categories, error: categoriesError } = await query

    if (categoriesError) {
      console.error('Categories children fetch error:', categoriesError)
      return NextResponse.json(
        { error: 'Failed to fetch category children' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    })

  } catch (error) {
    console.error('Categories children API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category children' },
      { status: 500 }
    )
  }
}
