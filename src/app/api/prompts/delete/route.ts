import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getStoreId } from '@/lib/prompts'
import { logger } from '@/lib/logger'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { store_id, template_id } = body

    if (!store_id || !template_id) {
      return NextResponse.json(
        { success: false, error: 'Missing store_id or template_id' },
        { status: 400 }
      )
    }

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

    // Delete the template
    const { error: deleteError } = await supabaseAdmin
      .from('category_templates')
      .delete()
      .eq('id', template_id)
      .eq('store_id', actualStoreId)

    if (deleteError) {
      logger.error('Error deleting template:', deleteError as Error, { component: 'delete' })
      return NextResponse.json(
        { success: false, error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    logger.error('Error in DELETE /api/prompts/delete:', error as Error, { component: 'delete' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
