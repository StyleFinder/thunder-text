import { NextRequest, NextResponse } from 'next/server'
import { 
  getSystemPrompt, 
  getCategoryTemplates, 
  getCategoryTemplate,
  getGlobalDefaultTemplate,
  updateSystemPrompt,
  updateCategoryTemplate,
  resetSystemPrompt,
  resetCategoryTemplate,
  type ProductCategory
} from '@/lib/prompts'

// GET /api/prompts - Get all prompts for a store
export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const category = searchParams.get('category') as ProductCategory

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Check if requesting global default template
    const getDefault = searchParams.get('get_default')
    if (getDefault === 'true') {
      const defaultTemplate = await getGlobalDefaultTemplate(storeId)
      return NextResponse.json({ default_template: defaultTemplate })
    }

    // If specific category requested, return just that template
    if (category) {
      const template = await getCategoryTemplate(storeId, category)
      return NextResponse.json({ category_template: template })
    }

    // Otherwise return system prompt and all category templates
    const [systemPrompt, categoryTemplates] = await Promise.all([
      getSystemPrompt(storeId),
      getCategoryTemplates(storeId)
    ])

    return NextResponse.json({
      system_prompt: systemPrompt,
      category_templates: categoryTemplates
    })

  } catch (error) {
    console.error('Error in GET /api/prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

// PUT /api/prompts - Update system prompt or category template
export async function PUT(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { store_id, type, content, name, template_id } = body

    if (!store_id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    let result = null

    if (type === 'system_prompt') {
      result = await updateSystemPrompt(store_id, content, name)
    } else if (type === 'category_template' && template_id) {
      // Update template by ID instead of category
      const { supabaseAdmin } = await import('@/lib/supabase')
      const { getStoreId } = await import('@/lib/prompts')

      // Convert shop domain to UUID if needed
      let actualStoreId = store_id
      if (store_id.includes('.myshopify.com') || !store_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const convertedId = await getStoreId(store_id)
        if (!convertedId) {
          return NextResponse.json(
            { error: 'Store not found' },
            { status: 404 }
          )
        }
        actualStoreId = convertedId
      }

      // Auto-generate category slug from template name if name changed
      const categorySlug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : undefined

      const { data, error } = await supabaseAdmin
        .from('category_templates')
        .update({
          ...(name && { name, category: categorySlug }),
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', template_id)
        .eq('store_id', actualStoreId)
        .select()
        .single()

      if (error) {
        console.error('Error updating template:', error)
        return null
      }

      result = data
    } else {
      return NextResponse.json(
        { error: 'Invalid type or missing template_id for template update' },
        { status: 400 }
      )
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Error in PUT /api/prompts:', error)
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    )
  }
}

// POST /api/prompts - Create new template
export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { store_id, type, content, name } = body

    if (!store_id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    if (type !== 'category_template' || !content || !name) {
      return NextResponse.json(
        { error: 'Missing required fields for template creation' },
        { status: 400 }
      )
    }

    // Import here to avoid circular dependencies
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { getStoreId } = await import('@/lib/prompts')

    // Convert shop domain to UUID if needed
    let actualStoreId = store_id
    if (store_id.includes('.myshopify.com') || !store_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const convertedId = await getStoreId(store_id)
      if (!convertedId) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }
      actualStoreId = convertedId
    }

    // Auto-generate category slug from template name
    const categorySlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

    // Create new template
    const { data, error } = await supabaseAdmin
      .from('category_templates')
      .insert({
        store_id: actualStoreId,
        category: categorySlug,
        name,
        content,
        is_default: false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error in POST /api/prompts:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}