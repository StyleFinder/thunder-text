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
    const { supabaseAdmin } = await import('@/lib/supabase')
    
    // Check for development bypass or proper session
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const parentId = url.searchParams.get('parentId')
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'
    
    let session = null
    let storeId = null
    
    if (authBypass && shop) {
      // Development mode bypass - use static UUID for consistency
      console.log('Using auth bypass for development - categories children')
      storeId = '550e8400-e29b-41d4-a716-446655440000'
    } else {
      // Production authentication
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      storeId = session.user.id
    }

    // Get sub-categories for the specified parent
    let query = supabaseAdmin
      .from('custom_categories')
      .select('*')
      .eq('store_id', storeId)
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