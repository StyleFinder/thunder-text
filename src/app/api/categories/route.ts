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
    
    let session = null
    let storeId = null
    
    if (authBypass && shop) {
      // Development mode bypass - use static UUID for consistency
      console.log('Using auth bypass for development - categories')
      // Use static development UUID that matches the one in our database
      storeId = '550e8400-e29b-41d4-a716-446655440000'
    } else {
      // Production authentication
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      storeId = session.user.id
    }

    // Get custom categories for this store with hierarchical structure
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('category_hierarchy')
      .select('*')
      .eq('store_id', storeId)
      .order('sort_order, name')

    if (categoriesError) {
      console.error('Categories fetch error:', categoriesError)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    })

  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
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
    
    let session = null
    let storeId = null
    
    if (authBypass && shop) {
      // Development mode bypass - use static UUID for consistency
      console.log('Using auth bypass for development - categories POST')
      // Use static development UUID that matches the one in our database
      storeId = '550e8400-e29b-41d4-a716-446655440000'
    } else {
      // Production authentication
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      storeId = session.user.id
    }

    const body = await request.json()
    const { name, description, isDefault = false, parentId = null, categoryLevel = 0, sortOrder = 0 } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category already exists for this store and parent
    const { data: existingCategory } = await supabaseAdmin
      .from('custom_categories')
      .select('id')
      .eq('store_id', storeId)
      .eq('name', name.trim())
      .eq('parent_id', parentId)
      .single()

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      )
    }

    // Create the category
    const { data: category, error: createError } = await supabaseAdmin
      .from('custom_categories')
      .insert({
        store_id: storeId,
        name: name.trim(),
        description: description?.trim() || null,
        is_default: isDefault,
        parent_id: parentId,
        category_level: categoryLevel,
        sort_order: sortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Category creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: category,
    })

  } catch (error) {
    console.error('Category creation API error:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
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
    
    let session = null
    let storeId = null
    
    if (authBypass && shop) {
      // Development mode bypass - use static UUID for consistency
      console.log('Using auth bypass for development - categories PUT')
      // Use static development UUID that matches the one in our database
      storeId = '550e8400-e29b-41d4-a716-446655440000'
    } else {
      // Production authentication
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      storeId = session.user.id
    }

    const body = await request.json()
    const { id, name, description, isDefault = false } = body

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category ID and name are required' },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to this store
    const { data: existingCategory } = await supabaseAdmin
      .from('custom_categories')
      .select('id')
      .eq('id', id)
      .eq('store_id', storeId)
      .single()

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if another category with the same name exists (excluding current one)
    const { data: duplicateCategory } = await supabaseAdmin
      .from('custom_categories')
      .select('id')
      .eq('store_id', storeId)
      .eq('name', name.trim())
      .neq('id', id)
      .single()

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      )
    }

    // Update the category
    const { data: category, error: updateError } = await supabaseAdmin
      .from('custom_categories')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        is_default: isDefault,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (updateError) {
      console.error('Category update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: category,
    })

  } catch (error) {
    console.error('Category update API error:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
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
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'
    
    let session = null
    let storeId = null
    
    if (authBypass && shop) {
      // Development mode bypass - use static UUID for consistency
      console.log('Using auth bypass for development - categories DELETE')
      // Use static development UUID that matches the one in our database
      storeId = '550e8400-e29b-41d4-a716-446655440000'
    } else {
      // Production authentication
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      storeId = session.user.id
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('id')

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to this store
    const { data: existingCategory } = await supabaseAdmin
      .from('custom_categories')
      .select('id, name')
      .eq('id', categoryId)
      .eq('store_id', storeId)
      .single()

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Delete the category
    const { error: deleteError } = await supabaseAdmin
      .from('custom_categories')
      .delete()
      .eq('id', categoryId)
      .eq('store_id', storeId)

    if (deleteError) {
      console.error('Category deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Category "${existingCategory.name}" deleted successfully`,
    })

  } catch (error) {
    console.error('Category deletion API error:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}