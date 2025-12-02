import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  ListContentResponse,
  GeneratedContent,
  ContentFilterParams
} from '@/types/content-center'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { logger } from '@/lib/logger'

/**
 * GET /api/content-center/content
 * List generated content with pagination, filtering, search, and sorting
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - page_size: Items per page (default: 20)
 * - content_type: Filter by content type
 * - platform: Filter by platform
 * - is_saved: Filter by saved status (true/false)
 * - saved_only: Show only saved content (true/false)
 * - date_from: Filter by creation date (from)
 * - date_to: Filter by creation date (to)
 * - search: Search in topic and content text
 * - sort_by: Sort field (created_at, updated_at, word_count, topic)
 * - sort_order: Sort order (asc, desc)
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
    if (rateLimitCheck) return rateLimitCheck as NextResponse<ApiResponse<ListContentResponse>>

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '20')
    const contentType = searchParams.get('content_type')
    const platform = searchParams.get('platform')
    const isSaved = searchParams.get('is_saved')
    const savedOnly = searchParams.get('saved_only') === 'true'
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // Build query
    let query = supabaseAdmin
      .from('generated_content')
      .select('*', { count: 'exact' })
      .eq('store_id', userId)

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

    if (savedOnly) {
      query = query.eq('is_saved', true)
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

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'word_count', 'topic']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const ascending = sortOrder === 'asc'

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    query = query
      .order(sortField, { ascending })
      .range(from, to)

    const { data: content, error, count } = await query

    if (error) {
      logger.error('Error fetching content:', error as Error, { component: 'content' })
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
    logger.error('Error in GET /api/content-center/content:', error as Error, { component: 'content' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
