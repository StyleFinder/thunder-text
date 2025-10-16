import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ApiResponse,
  GeneratedContent
} from '@/types/content-center'

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper function to get user ID from request
async function getUserId(request: NextRequest): Promise<string | null> {
  const supabase = getSupabaseClient()
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user.id
}

/**
 * GET /api/content-center/content/:id
 * Get a specific content piece
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<GeneratedContent>>> {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const supabase = getSupabaseClient()

    // Fetch content
    const { data: content, error } = await supabase
      .from('generated_content')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
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
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const supabase = getSupabaseClient()

    // Delete content (RLS will ensure user owns it)
    const { error } = await supabase
      .from('generated_content')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

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
