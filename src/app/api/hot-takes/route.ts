import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/hot-takes
 * Fetch active hot takes for store owners
 * Query params: limit (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('hot_takes')
      .select('id, title, content, is_active, published_at, created_at, updated_at')
      .order('published_at', { ascending: false });

    // Only filter for active if not including inactive (store owners see active only)
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: hotTakes, error } = await query;

    if (error) {
      console.error('[Hot Takes API] Error fetching hot takes:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch hot takes',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: hotTakes || [],
    });
  } catch (error) {
    console.error('[Hot Takes API] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/hot-takes
 * Create new hot take (coaches only)
 * Body: { title, content }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Check if token is coach-token (mock authentication for now)
    // In production, this would validate against actual coach sessions
    if (token !== 'coach-token') {
      // Check if it's a store domain (store owners can't create hot takes)
      if (token.includes('.myshopify.com')) {
        return NextResponse.json({
          success: false,
          error: 'Only coaches can create hot takes',
        }, { status: 403 });
      }

      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { title, content } = body;

    // Validate required fields
    if (!title || !content || title.trim() === '' || content.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Title and content are required',
      }, { status: 400 });
    }

    // Create hot take
    const { data: hotTake, error } = await supabaseAdmin
      .from('hot_takes')
      .insert({
        title: title.trim(),
        content: content.trim(),
        is_active: true,
        published_at: new Date().toISOString(),
      })
      .select('id, title, content, is_active, published_at, created_at')
      .single();

    if (error) {
      console.error('[Hot Takes API] Error creating hot take:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json({
        success: false,
        error: `Failed to create hot take: ${error.message}`,
        details: error.details || error.hint,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: hotTake,
    }, { status: 201 });
  } catch (error) {
    console.error('[Hot Takes API] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
