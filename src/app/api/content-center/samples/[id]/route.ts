import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ApiResponse,
  UpdateSampleRequest,
  ContentSample
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
 * PATCH /api/content-center/samples/:id
 * Update a sample (toggle active/inactive or update text)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<ContentSample>>> {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body: UpdateSampleRequest = await request.json()

    const supabase = getSupabaseClient()

    // Verify sample belongs to user
    const { data: existingSample, error: fetchError } = await supabase
      .from('content_samples')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingSample) {
      return NextResponse.json(
        { success: false, error: 'Sample not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Partial<ContentSample> = {}

    if (body.is_active !== undefined) {
      updates.is_active = body.is_active
    }

    if (body.sample_text !== undefined) {
      updates.sample_text = body.sample_text
      // Recalculate word count if text changed
      const wordCount = body.sample_text.trim().split(/\s+/).filter(w => w.length > 0).length
      updates.word_count = wordCount
    }

    if (body.sample_type !== undefined) {
      updates.sample_type = body.sample_type
    }

    // Update sample
    const { data: updatedSample, error: updateError } = await supabase
      .from('content_samples')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating sample:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update sample' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSample as ContentSample
    })

  } catch (error) {
    console.error('Error in PATCH /api/content-center/samples/:id:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/content-center/samples/:id
 * Delete a sample
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

    // Delete sample (RLS will ensure user owns it)
    const { error } = await supabase
      .from('content_samples')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting sample:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete sample' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })

  } catch (error) {
    console.error('Error in DELETE /api/content-center/samples/:id:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
