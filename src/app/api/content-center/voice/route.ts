import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  GetVoiceProfileResponse,
  BrandVoiceProfile
} from '@/types/content-center'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'

/**
 * GET /api/content-center/voice
 * Get current voice profile for authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<GetVoiceProfileResponse>>> {
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

    // Get current voice profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('brand_voice_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single()

    // Get active sample count
    const { data: samples, error: samplesError } = await supabaseAdmin
      .from('content_samples')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (samplesError) {
      console.error('Error fetching samples:', samplesError)
    }

    const activeSampleCount = samples?.length || 0
    const hasSufficientSamples = activeSampleCount >= 3

    // If no profile found, that's okay - return null profile
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching voice profile:', profileError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch voice profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: profile as BrandVoiceProfile | null,
        has_sufficient_samples: hasSufficientSamples,
        active_sample_count: activeSampleCount
      }
    })

  } catch (error) {
    console.error('Error in GET /api/content-center/voice:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
