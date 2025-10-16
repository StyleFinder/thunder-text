import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ApiResponse,
  GetVoiceProfileResponse,
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

    const supabase = getSupabaseClient()

    // Get current voice profile
    const { data: profile, error: profileError } = await supabase
      .from('brand_voice_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single()

    // Get active sample count
    const { data: samples, error: samplesError } = await supabase
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
