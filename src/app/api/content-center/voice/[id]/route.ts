import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ApiResponse,
  UpdateVoiceProfileRequest,
  BrandVoiceProfile
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
 * PATCH /api/content-center/voice/:id
 * Edit a voice profile (marks it as user_edited)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<BrandVoiceProfile>>> {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body: UpdateVoiceProfileRequest = await request.json()

    if (!body.profile_text) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: profile_text' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Verify profile belongs to user
    const { data: existingProfile, error: fetchError } = await supabase
      .from('brand_voice_profiles')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingProfile) {
      return NextResponse.json(
        { success: false, error: 'Voice profile not found' },
        { status: 404 }
      )
    }

    // Update profile with edited text
    const { data: updatedProfile, error: updateError } = await supabase
      .from('brand_voice_profiles')
      .update({
        profile_text: body.profile_text,
        user_edited: true
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating voice profile:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update voice profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile as BrandVoiceProfile
    })

  } catch (error) {
    console.error('Error in PATCH /api/content-center/voice/:id:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
