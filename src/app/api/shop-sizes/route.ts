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

    // Get shop sizes for this shop
    const { data: shopSizes, error: sizesError } = await supabaseAdmin
      .from('shop_sizes')
      .select('*')
      .eq('store_id', shopData.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (sizesError) {
      console.error('Shop sizes fetch error:', sizesError)
      return NextResponse.json(
        { error: 'Failed to fetch shop sizes' },
        { status: 500 }
      )
    }

    // If no shop-specific sizes exist, return default sizes
    if (!shopSizes || shopSizes.length === 0) {
      const { data: defaultSizes, error: defaultError } = await supabaseAdmin
        .from('shop_sizes')
        .select('*')
        .eq('store_id', 'default')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name')

      if (defaultError) {
        console.error('Default sizes fetch error:', defaultError)
        return NextResponse.json(
          { error: 'Failed to fetch default sizes' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: defaultSizes || [],
        isDefault: true
      })
    }

    return NextResponse.json({
      success: true,
      data: shopSizes,
      isDefault: false
    })

  } catch (error) {
    console.error('Shop sizes API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shop sizes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { shop, name, sizes, is_default } = body

    if (!shop || !name || !sizes || !Array.isArray(sizes)) {
      return NextResponse.json(
        { error: 'Missing required fields: shop, name, sizes (array)' },
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

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabaseAdmin
        .from('shop_sizes')
        .update({ is_default: false })
        .eq('store_id', shopData.id)
        .eq('is_default', true)
    }

    // Insert new shop size
    const { data: newSize, error: insertError } = await supabaseAdmin
      .from('shop_sizes')
      .insert({
        store_id: shopData.id,
        name,
        sizes,
        is_default: is_default || false,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Shop size insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create shop size' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newSize
    })

  } catch (error) {
    console.error('Shop sizes create API error:', error)
    return NextResponse.json(
      { error: 'Failed to create shop size' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { shop, id, name, sizes, is_default } = body

    if (!shop || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: shop, id' },
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

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabaseAdmin
        .from('shop_sizes')
        .update({ is_default: false })
        .eq('store_id', shopData.id)
        .eq('is_default', true)
        .neq('id', id)
    }

    // Update shop size
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (sizes !== undefined) updateData.sizes = sizes
    if (is_default !== undefined) updateData.is_default = is_default

    const { data: updatedSize, error: updateError } = await supabaseAdmin
      .from('shop_sizes')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', shopData.id)
      .select()
      .single()

    if (updateError) {
      console.error('Shop size update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update shop size' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSize
    })

  } catch (error) {
    console.error('Shop sizes update API error:', error)
    return NextResponse.json(
      { error: 'Failed to update shop size' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const id = url.searchParams.get('id')

    if (!shop || !id) {
      return NextResponse.json(
        { error: 'Missing required parameters: shop, id' },
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

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabaseAdmin
      .from('shop_sizes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', shopData.id)

    if (deleteError) {
      console.error('Shop size delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete shop size' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Shop size deleted successfully'
    })

  } catch (error) {
    console.error('Shop sizes delete API error:', error)
    return NextResponse.json(
      { error: 'Failed to delete shop size' },
      { status: 500 }
    )
  }
}
