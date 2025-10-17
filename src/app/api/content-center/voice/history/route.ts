import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  VoiceProfileHistoryResponse,
  BrandVoiceProfile
} from '@/types/content-center'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'

import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'



/**
 * GET /api/content-center/voice/history
 * Get last 3 voice profile versions for authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<VoiceProfileHistoryResponse>>> {
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

    // Using supabaseAdmin from @/lib/supabase

    // Get last 3 profiles
    const { data: profiles, error } = await supabase
      .from('brand_voice_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('profile_version', { ascending: false })
      .limit(3)

    if (error) {
      console.error('Error fetching voice profile history:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch voice profile history' },
        { status: 500 }
      )
    }

    const currentProfile = profiles?.find(p => p.is_current)

    return NextResponse.json({
      success: true,
      data: {
        profiles: profiles as BrandVoiceProfile[] || [],
        current_profile_id: currentProfile?.id || null
      }
    })

  } catch (error) {
    console.error('Error in GET /api/content-center/voice/history:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
