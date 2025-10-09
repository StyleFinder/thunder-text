import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { type ProductCategory } from '@/lib/prompts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { store_id, category } = body

    if (!store_id || !category) {
      return NextResponse.json(
        { success: false, error: 'store_id and category are required' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin

    // Set the store context for RLS
    const { error: rpcError } = await supabase.rpc('set_store_context', { store_uuid: store_id })

    if (rpcError) {
      console.error('Error setting store context:', rpcError)
      return NextResponse.json(
        { success: false, error: 'Failed to set store context' },
        { status: 500 }
      )
    }

    // Check if any templates exist for this category and store
    const { data: existingTemplates, error: checkError } = await supabase
      .from('category_templates')
      .select('id')
      .eq('store_id', store_id)
      .eq('category', category)

    if (checkError) {
      console.error('Error checking templates:', checkError)
      return NextResponse.json(
        { success: false, error: 'Failed to check existing templates' },
        { status: 500 }
      )
    }

    if (!existingTemplates || existingTemplates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No templates found for this category' },
        { status: 404 }
      )
    }

    // First, unset ALL existing defaults for this store (only one should be default)
    const { error: unsetError } = await supabase
      .from('category_templates')
      .update({ is_default: false })
      .eq('store_id', store_id)

    if (unsetError) {
      console.error('Error unsetting defaults:', unsetError)
      return NextResponse.json(
        { success: false, error: 'Failed to unset existing defaults' },
        { status: 500 }
      )
    }

    // Then set the current template as default (there should only be one per category)
    const { data: updatedTemplate, error } = await supabase
      .from('category_templates')
      .update({ is_default: true })
      .eq('store_id', store_id)
      .eq('category', category)
      .select()
      .single()

    if (error) {
      console.error('Error setting default template:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to set template as default' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedTemplate
    })

  } catch (error) {
    console.error('Set default template error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}