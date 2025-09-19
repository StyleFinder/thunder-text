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
    const { store_id, type, content, name, category } = body

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
    } else if (type === 'category_template' && category) {
      result = await updateCategoryTemplate(store_id, category, content, name)
    } else {
      return NextResponse.json(
        { error: 'Invalid type or missing category for template update' },
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

// POST /api/prompts/reset - Reset prompts to defaults
export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { store_id, type, category } = body

    if (!store_id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    let result = null

    if (type === 'system_prompt') {
      result = await resetSystemPrompt(store_id)
    } else if (type === 'category_template' && category) {
      result = await resetCategoryTemplate(store_id, category)
    } else {
      return NextResponse.json(
        { error: 'Invalid type or missing category for template reset' },
        { status: 400 }
      )
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to reset prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Error in POST /api/prompts/reset:', error)
    return NextResponse.json(
      { error: 'Failed to reset prompt' },
      { status: 500 }
    )
  }
}