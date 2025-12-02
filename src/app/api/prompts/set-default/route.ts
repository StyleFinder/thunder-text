import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getStoreId } from '@/lib/prompts'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { store_id, template_id } = body

    if (!store_id || !template_id) {
      return NextResponse.json(
        { success: false, error: 'store_id and template_id are required' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin

    // Convert shop domain to UUID if needed
    let actualStoreId = store_id
    if (store_id.includes('.myshopify.com') || !store_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const convertedId = await getStoreId(store_id)
      if (!convertedId) {
        return NextResponse.json(
          { success: false, error: 'Store not found' },
          { status: 404 }
        )
      }
      actualStoreId = convertedId
    }

    // Set the store context for RLS
    const { error: rpcError } = await supabase.rpc('set_store_context', { store_uuid: actualStoreId })

    if (rpcError) {
      logger.error('Error setting store context:', rpcError as Error, { component: 'set-default' })
      return NextResponse.json(
        { success: false, error: 'Failed to set store context' },
        { status: 500 }
      )
    }

    // Check if template exists for this store
    const { data: existingTemplate, error: checkError } = await supabase
      .from('category_templates')
      .select('id')
      .eq('id', template_id)
      .eq('store_id', actualStoreId)
      .single()

    if (checkError || !existingTemplate) {
      logger.error('Error checking template:', checkError as Error, { component: 'set-default' })
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // First, unset ALL existing defaults for this store (only one should be default)
    const { error: unsetError } = await supabase
      .from('category_templates')
      .update({ is_default: false })
      .eq('store_id', actualStoreId)

    if (unsetError) {
      logger.error('Error unsetting defaults:', unsetError as Error, { component: 'set-default' })
      return NextResponse.json(
        { success: false, error: 'Failed to unset existing defaults' },
        { status: 500 }
      )
    }

    // Then set the specified template as default
    const { data: updatedTemplate, error } = await supabase
      .from('category_templates')
      .update({ is_default: true })
      .eq('id', template_id)
      .eq('store_id', actualStoreId)
      .select()
      .single()

    if (error) {
      logger.error('Error setting default template:', error as Error, { component: 'set-default' })
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
    logger.error('Set default template error:', error as Error, { component: 'set-default' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}