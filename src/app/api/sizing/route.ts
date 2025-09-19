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

    // Fetch sizing options for the store (both default and custom)
    const { data: sizingOptions, error } = await supabaseAdmin
      .from('custom_sizing')
      .select('*')
      .eq('store_id', storeId)
      .order('is_default', { ascending: false }) // Show defaults first, then custom
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Database error fetching sizing options:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sizing options' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sizingOptions || []
    })

  } catch (error) {
    console.error('Sizing fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sizing options' },
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

    const body = await request.json()
    const { name, sizes, is_default = false } = body

    if (!name || !sizes || !Array.isArray(sizes)) {
      return NextResponse.json(
        { error: 'Name and sizes array are required' },
        { status: 400 }
      )
    }

    // Create new custom sizing option
    const { data: newSizing, error } = await supabaseAdmin
      .from('custom_sizing')
      .insert({
        store_id: storeId,
        name: name.trim(),
        sizes: sizes.map(size => size.trim().toUpperCase()),
        is_default: is_default
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
    console.error('Sizing creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create sizing option' },
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

    const body = await request.json()
    const { id, name, sizes, is_default } = body

    if (!id || !name || !sizes || !Array.isArray(sizes)) {
      return NextResponse.json(
        { error: 'ID, name and sizes array are required' },
        { status: 400 }
      )
    }

    // Update existing sizing option
    const updateData = {
      name: name.trim(),
      sizes: sizes.map(size => size.trim().toUpperCase())
    }
    
    // Only update is_default if it's provided (to allow updating defaults)
    if (typeof is_default === 'boolean') {
      updateData.is_default = is_default
    }

    const { data: updatedSizing, error } = await supabaseAdmin
      .from('custom_sizing')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', storeId) // Ensure user can only update their own sizing options
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
    console.error('Sizing update error:', error)
    return NextResponse.json(
      { error: 'Failed to update sizing option' },
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
    const { auth } = await import('@/lib/auth')
    const { supabaseAdmin } = await import('@/lib/supabase')
    
    // Check for development bypass or proper session
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const sizingId = url.searchParams.get('id')
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

    if (!sizingId) {
      return NextResponse.json(
        { error: 'Sizing ID is required' },
        { status: 400 }
      )
    }

    // Delete sizing option
    const { data: deletedSizing, error } = await supabaseAdmin
      .from('custom_sizing')
      .delete()
      .eq('id', sizingId)
      .eq('store_id', storeId) // Ensure user can only delete their own sizing options
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
    console.error('Sizing deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete sizing option' },
      { status: 500 }
    )
  }
}