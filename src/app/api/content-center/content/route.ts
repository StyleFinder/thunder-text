import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  ListContentResponse,
  GeneratedContent,
  ContentFilterParams
} from '@/types/content-center'
import { getUserId, getSupabaseAdmin } from '@/lib/auth/content-center-auth'
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'

/**
 * GET /api/content-center/content
 * List generated content with pagination and filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ListContentResponse>>> {
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
    if (rateLimitCheck) return rateLimitCheck

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '20')
    const contentType = searchParams.get('content_type')
    const platform = searchParams.get('platform')
    const isSaved = searchParams.get('is_saved')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')

    const supabase = getSupabaseAdmin()

    // Build query
    let query = supabase
      .from('generated_content')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Apply filters
    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    if (platform) {
      query = query.eq('platform', platform)
    }

    if (isSaved !== null) {
      query = query.eq('is_saved', isSaved === 'true')
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    if (search) {
      query = query.or(`topic.ilike.%${search}%,generated_text.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: content, error, count } = await query

    if (error) {
      console.error('Error fetching content:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        content: content as GeneratedContent[],
        total_count: count || 0,
        page,
        page_size: pageSize
      }
    })

  } catch (error) {
    console.error('Error in GET /api/content-center/content:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
