import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ApiResponse,
  VoiceProfileHistoryResponse,
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

    const supabase = getSupabaseClient()

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
