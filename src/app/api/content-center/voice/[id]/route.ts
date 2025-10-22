import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  UpdateVoiceProfileRequest,
  BrandVoiceProfile
} from '@/types/content-center'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'

import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'



/**
 * PATCH /api/content-center/voice/:id
 * Edit a voice profile (marks it as user_edited)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<BrandVoiceProfile>>> {
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
    if (rateLimitCheck) return rateLimitCheck as NextResponse<ApiResponse<BrandVoiceProfile>>

    const { id } = await params
    const body: UpdateVoiceProfileRequest = await request.json()

    if (!body.profile_text) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: profile_text' },
        { status: 400 }
      )
    }

    // Using supabaseAdmin from @/lib/supabase
    const supabase = supabaseAdmin

    // Verify profile belongs to user
    const { data: existingProfile, error: fetchError } = await supabase
      .from('brand_voice_profiles')
      .select('*')
      .eq('id', id)
      .eq('store_id', userId)
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
      .eq('store_id', userId)
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
