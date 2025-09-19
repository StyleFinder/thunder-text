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
    await supabase.rpc('set_store_context', { store_uuid: store_id })

    // First, unset ALL existing defaults for this store (only one should be default)
    await supabase
      .from('category_templates')
      .update({ is_default: false })
      .eq('store_id', store_id)

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