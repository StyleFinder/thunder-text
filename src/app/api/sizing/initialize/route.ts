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
    const { auth } = await import('@/lib/auth')
    const { supabaseAdmin } = await import('@/lib/supabase')
    
    // Check for development bypass or proper session
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'
    
    let storeId = null
    
    if (authBypass && shop) {
      // Development mode bypass - use static UUID
      storeId = '550e8400-e29b-41d4-a716-446655440000'
    } else {
      // Production authentication
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      storeId = session.user.id
    }

    // Check if default sizing options already exist
    const { data: existingDefaults, error: checkError } = await supabaseAdmin
      .from('custom_sizing')
      .select('id')
      .eq('store_id', storeId)
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
      store_id: storeId,
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