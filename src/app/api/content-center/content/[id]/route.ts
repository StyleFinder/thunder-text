import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  GeneratedContent
} from '@/types/content-center'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'



/**
 * GET /api/content-center/content/:id
 * Get a specific content piece
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<GeneratedContent>>> {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting for read operations
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.READ)(request, userId)
    if (rateLimitCheck) return rateLimitCheck as NextResponse<ApiResponse<GeneratedContent>>

    const { id } = await params

    // Fetch content
    const { data: content, error } = await supabaseAdmin
      .from('generated_content')
      .select('*')
      .eq('id', id)
      .eq('store_id', userId)
      .single()

    if (error || !content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: content as GeneratedContent
    })

  } catch (error) {
    console.error('Error in GET /api/content-center/content/:id:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/content-center/content/:id
 * Delete a content piece
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting for write operations
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.WRITE)(request, userId)
    if (rateLimitCheck) return rateLimitCheck as NextResponse<ApiResponse<{ deleted: boolean }>>

    const { id } = await params

    // Delete content (RLS will ensure user owns it)
    const { error } = await supabaseAdmin
      .from('generated_content')
      .delete()
      .eq('id', id)
      .eq('store_id', userId)

    if (error) {
      console.error('Error deleting content:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })

  } catch (error) {
    console.error('Error in DELETE /api/content-center/content/:id:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
