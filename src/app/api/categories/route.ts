import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

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
      logger.error('Shop lookup error in GET', shopError as Error, {
        component: 'categories-api',
        operation: 'GET',
        shop
      })
      return NextResponse.json(
        { error: 'Shop not found. Please ensure the app is installed.' },
        { status: 404 }
      )
    }

    // Get custom categories for this shop with hierarchical structure
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('custom_categories')
      .select('*')
      .eq('store_id', shopData.id)
      .order('sort_order, name')

    if (categoriesError) {
      logger.error('Categories fetch error', categoriesError as Error, {
        component: 'categories-api',
        operation: 'GET',
        storeId: shopData.id
      })
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
    logger.error('Categories API error', error as Error, {
      component: 'categories-api',
      operation: 'GET'
    })
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
      logger.error('Shop lookup error in POST', shopError as Error, {
        component: 'categories-api',
        operation: 'POST',
        shop
      })
      return NextResponse.json(
        { error: 'Shop not found. Please ensure the app is installed.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, description, isDefault = false, parentId = null, categoryLevel = 0, sortOrder = 0 } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category already exists for this shop and parent
    const { data: existingCategory } = await supabaseAdmin
      .from('custom_categories')
      .select('id')
      .eq('store_id', shopData.id)
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
        store_id: shopData.id,
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
      logger.error('Category creation error', createError as Error, {
        component: 'categories-api',
        operation: 'POST',
        categoryName: name,
        storeId: shopData.id
      })
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
    logger.error('Category creation API error', error as Error, {
      component: 'categories-api',
      operation: 'POST'
    })
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
      logger.error('Shop lookup error in PUT', shopError as Error, {
        component: 'categories-api',
        operation: 'PUT',
        shop
      })
      return NextResponse.json(
        { error: 'Shop not found. Please ensure the app is installed.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { id, name, description, isDefault = false } = body

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category ID and name are required' },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to this shop
    const { data: existingCategory } = await supabaseAdmin
      .from('custom_categories')
      .select('id')
      .eq('id', id)
      .eq('store_id', shopData.id)
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
      .eq('store_id', shopData.id)
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
      .eq('store_id', shopData.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Category update error', updateError as Error, {
        component: 'categories-api',
        operation: 'PUT',
        categoryId: id,
        storeId: shopData.id
      })
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
    logger.error('Category update API error', error as Error, {
      component: 'categories-api',
      operation: 'PUT'
    })
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
      logger.error('Shop lookup error in DELETE', shopError as Error, {
        component: 'categories-api',
        operation: 'DELETE',
        shop
      })
      return NextResponse.json(
        { error: 'Shop not found. Please ensure the app is installed.' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('id')

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to this shop
    const { data: existingCategory } = await supabaseAdmin
      .from('custom_categories')
      .select('id, name')
      .eq('id', categoryId)
      .eq('store_id', shopData.id)
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
      .eq('store_id', shopData.id)

    if (deleteError) {
      logger.error('Category deletion error', deleteError as Error, {
        component: 'categories-api',
        operation: 'DELETE',
        categoryId,
        storeId: shopData.id
      })
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
    logger.error('Category deletion API error', error as Error, {
      component: 'categories-api',
      operation: 'DELETE'
    })
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
