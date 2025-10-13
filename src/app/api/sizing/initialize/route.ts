import { NextRequest, NextResponse } from 'next/server'

// Default sizing options that should be available to all stores
const DEFAULT_SIZING_OPTIONS = [
  { name: 'One Size', sizes: ['One Size'] },
  { name: 'XS - XL', sizes: ['XS', 'S', 'M', 'L', 'XL'] },
  { name: 'XS - XXL', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { name: 'XS - XXXL', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
  { name: 'Numeric (6-16)', sizes: ['6', '8', '10', '12', '14', '16'] },
  { name: 'Numeric (28-44)', sizes: ['28', '30', '32', '34', '36', '38', '40', '42', '44'] },
  { name: 'Children (2T-14)', sizes: ['2T', '3T', '4T', '5T', '6', '7', '8', '10', '12', '14'] }
]

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

    // Check if default sizing options already exist
    const { data: existingDefaults, error: checkError } = await supabaseAdmin
      .from('custom_sizing')
      .select('id')
      .eq('store_id', shopData.id)
      .eq('is_default', true)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing defaults:', checkError)
      return NextResponse.json({ error: 'Failed to check existing defaults' }, { status: 500 })
    }

    if (existingDefaults && existingDefaults.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Default sizing options already exist',
        skipped: true
      })
    }

    // Insert default sizing options
    const defaultsToInsert = DEFAULT_SIZING_OPTIONS.map(option => ({
      store_id: shopData.id,
      name: option.name,
      sizes: option.sizes,
      is_default: true
    }))

    const { data: insertedDefaults, error: insertError } = await supabaseAdmin
      .from('custom_sizing')
      .insert(defaultsToInsert)
      .select()

    if (insertError) {
      console.error('Database error inserting default sizing options:', insertError)
      return NextResponse.json(
        { error: 'Failed to initialize default sizing options' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Default sizing options initialized successfully',
      data: insertedDefaults,
      count: insertedDefaults?.length || 0
    })

  } catch (error) {
    console.error('Sizing initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize sizing options' },
      { status: 500 }
    )
  }
}
