import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ApiResponse,
  GenerateVoiceProfileResponse,
  InsufficientSamplesError
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
 * POST /api/content-center/voice/generate
 * Generate a brand voice profile from active samples
 *
 * Note: OpenAI integration will be implemented in Task Group 1.5
 * For now, this is a placeholder that creates a mock profile
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<GenerateVoiceProfileResponse>>> {
  const startTime = Date.now()

  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseClient()

    // Fetch active samples
    const { data: samples, error: samplesError } = await supabase
      .from('content_samples')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (samplesError) {
      console.error('Error fetching samples:', samplesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch samples' },
        { status: 500 }
      )
    }

    // Validate minimum 3 active samples
    if (!samples || samples.length < 3) {
      throw new InsufficientSamplesError(samples?.length || 0, 3)
    }

    // TODO: Task Group 1.5 - Implement OpenAI voice profile generation
    // For now, create a placeholder profile
    const mockProfile = `Brand Voice Profile (Generated from ${samples.length} samples):

TONE CHARACTERISTICS:
- Primary: [AI will analyze tone from samples]
- Secondary: [AI will analyze secondary tone]
- Emotional Quality: [AI will analyze emotional quality]

WRITING STYLE:
- Sentence Length: [AI will analyze sentence patterns]
- Paragraph Structure: [AI will analyze paragraph structure]
- Punctuation: [AI will analyze punctuation usage]
- Contractions: [AI will analyze contraction frequency]

VOCABULARY PATTERNS:
- Preferred Terms: [AI will identify preferred vocabulary]
- Avoided Terms: [AI will identify avoided terms]
- Signature Phrases: [AI will extract signature phrases]
- Descriptive Style: [AI will analyze descriptive approach]

BRAND PERSONALITY:
- Voice Type: [AI will categorize voice type]
- Perspective: [AI will identify narrative perspective]
- Humor Level: [AI will assess humor usage]
- Authority: [AI will gauge authority tone]

FORMATTING PREFERENCES:
- Lists: [AI will analyze list usage]
- Headers: [AI will analyze header style]
- Emphasis: [AI will identify emphasis patterns]

NOTE: This is a placeholder profile. OpenAI integration coming in Task Group 1.5.`

    // Get current version number
    const { data: existingProfiles } = await supabase
      .from('brand_voice_profiles')
      .select('profile_version')
      .eq('user_id', userId)
      .order('profile_version', { ascending: false })
      .limit(1)

    const nextVersion = (existingProfiles?.[0]?.profile_version || 0) + 1

    // Mark all existing profiles as not current
    await supabase
      .from('brand_voice_profiles')
      .update({ is_current: false })
      .eq('user_id', userId)

    // Create new profile
    const { data: newProfile, error: profileError } = await supabase
      .from('brand_voice_profiles')
      .insert({
        user_id: userId,
        profile_text: mockProfile,
        profile_version: nextVersion,
        is_current: true,
        user_edited: false,
        sample_ids: samples.map(s => s.id)
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating voice profile:', profileError)
      return NextResponse.json(
        { success: false, error: 'Failed to create voice profile' },
        { status: 500 }
      )
    }

    const generationTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        profile: newProfile,
        generation_time_ms: generationTime
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/content-center/voice/generate:', error)

    if (error instanceof InsufficientSamplesError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
