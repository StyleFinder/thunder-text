import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Helper to get store UUID from shop domain
async function getStoreId(shopDomain: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single()

    if (error || !data) {
      console.error('Error finding store:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error in getStoreId:', error)
    return null
  }
}

// GET /api/sizing - Get all sizing options for a store
export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    let storeId = searchParams.get('store_id')

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Convert shop domain to UUID if needed
    if (storeId.includes('.myshopify.com') || !storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const convertedId = await getStoreId(storeId)
      if (!convertedId) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }
      storeId = convertedId
    }

    // Fetch all sizing options for the store
    const { data: sizingOptions, error } = await supabaseAdmin
      .from('size_options')
      .select('*')
      .eq('store_id', storeId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Database error fetching sizing options:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sizing options' },
        { status: 500 }
      )
    }

    // Filter active sizing options (client-side filter to avoid schema cache issues)
    const activeSizingOptions = (sizingOptions || []).filter((opt: any) => opt.is_active !== false)

    return NextResponse.json({
      success: true,
      data: activeSizingOptions
    })

  } catch (error) {
    console.error('Error in GET /api/sizing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sizing options' },
      { status: 500 }
    )
  }
}

// POST /api/sizing - Create new sizing option
export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    let { store_id, name, sizes, is_default } = body

    if (!store_id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    if (!name || !sizes || !Array.isArray(sizes)) {
      return NextResponse.json(
        { error: 'Name and sizes array are required' },
        { status: 400 }
      )
    }

    // Convert shop domain to UUID if needed
    if (store_id.includes('.myshopify.com') || !store_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const convertedId = await getStoreId(store_id)
      if (!convertedId) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }
      store_id = convertedId
    }

    // Auto-capitalize sizes
    const capitalizedSizes = sizes.map((size: string) => size.trim().toUpperCase())

    // If this is being set as default, unset any existing defaults
    if (is_default) {
      await supabaseAdmin
        .from('size_options')
        .update({ is_default: false })
        .eq('store_id', store_id)
        .eq('is_default', true)
    }

    // Create new sizing option
    const { data: newSizing, error } = await supabaseAdmin
      .from('size_options')
      .insert({
        store_id,
        name: name.trim(),
        sizes: capitalizedSizes,
        is_default: is_default || false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating sizing option:', error)
      return NextResponse.json(
        { error: 'Failed to create sizing option' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newSizing
    })

  } catch (error) {
    console.error('Error in POST /api/sizing:', error)
    return NextResponse.json(
      { error: 'Failed to create sizing option' },
      { status: 500 }
    )
  }
}

// PUT /api/sizing - Update existing sizing option
export async function PUT(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    let { store_id, sizing_id, name, sizes, is_default } = body

    if (!store_id || !sizing_id) {
      return NextResponse.json(
        { error: 'Store ID and Sizing ID are required' },
        { status: 400 }
      )
    }

    if (!name || !sizes || !Array.isArray(sizes)) {
      return NextResponse.json(
        { error: 'Name and sizes array are required' },
        { status: 400 }
      )
    }

    // Convert shop domain to UUID if needed
    if (store_id.includes('.myshopify.com') || !store_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const convertedId = await getStoreId(store_id)
      if (!convertedId) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }
      store_id = convertedId
    }

    // Auto-capitalize sizes
    const capitalizedSizes = sizes.map((size: string) => size.trim().toUpperCase())

    // If this is being set as default, unset any existing defaults
    if (is_default) {
      await supabaseAdmin
        .from('size_options')
        .update({ is_default: false })
        .eq('store_id', store_id)
        .eq('is_default', true)
        .neq('id', sizing_id) // Don't unset the one we're updating
    }

    // Update sizing option
    const { data: updatedSizing, error } = await supabaseAdmin
      .from('size_options')
      .update({
        name: name.trim(),
        sizes: capitalizedSizes,
        is_default: is_default !== undefined ? is_default : false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sizing_id)
      .eq('store_id', store_id)
      .select()
      .single()

    if (error) {
      console.error('Database error updating sizing option:', error)
      return NextResponse.json(
        { error: 'Failed to update sizing option' },
        { status: 500 }
      )
    }

    if (!updatedSizing) {
      return NextResponse.json(
        { error: 'Sizing option not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSizing
    })

  } catch (error) {
    console.error('Error in PUT /api/sizing:', error)
    return NextResponse.json(
      { error: 'Failed to update sizing option' },
      { status: 500 }
    )
  }
}

// DELETE /api/sizing - Delete sizing option
export async function DELETE(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    let storeId = searchParams.get('store_id')
    const sizingId = searchParams.get('sizing_id')

    if (!storeId || !sizingId) {
      return NextResponse.json(
        { error: 'Store ID and Sizing ID are required' },
        { status: 400 }
      )
    }

    // Convert shop domain to UUID if needed
    if (storeId.includes('.myshopify.com') || !storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const convertedId = await getStoreId(storeId)
      if (!convertedId) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }
      storeId = convertedId
    }

    // Delete sizing option (hard delete to avoid schema cache issues)
    const { data: deletedSizing, error} = await supabaseAdmin
      .from('size_options')
      .delete()
      .eq('id', sizingId)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) {
      console.error('Database error deleting sizing option:', error)
      return NextResponse.json(
        { error: 'Failed to delete sizing option' },
        { status: 500 }
      )
    }

    if (!deletedSizing) {
      return NextResponse.json(
        { error: 'Sizing option not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: deletedSizing
    })

  } catch (error) {
    console.error('Error in DELETE /api/sizing:', error)
    return NextResponse.json(
      { error: 'Failed to delete sizing option' },
      { status: 500 }
    )
  }
}
