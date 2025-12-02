import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  GenerateVoiceProfileResponse,
  InsufficientSamplesError,
  ContentSample
} from '@/types/content-center'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'

import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { generateVoiceProfile, validateVoiceProfile } from '@/lib/services/voice-profile-generator'
import { logger } from '@/lib/logger'

/**
 * POST /api/content-center/voice/generate
 * Generate a brand voice profile from active samples using OpenAI
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

    // Rate limiting for voice generation (most expensive operation)
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.VOICE_GENERATION)(request, userId)
    if (rateLimitCheck) return rateLimitCheck as NextResponse<ApiResponse<GenerateVoiceProfileResponse>>

    // Fetch active samples
    const { data: samples, error: samplesError } = await supabaseAdmin
      .from('content_samples')
      .select('*')
      .eq('store_id', userId)
      .eq('is_active', true)

    if (samplesError) {
      logger.error('Error fetching samples:', samplesError as Error, { component: 'generate' })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch samples' },
        { status: 500 }
      )
    }

    // Validate minimum 3 active samples
    if (!samples || samples.length < 3) {
      throw new InsufficientSamplesError(samples?.length || 0, 3)
    }

    // Generate voice profile using OpenAI
    const { profileText, tokensUsed, generationTimeMs } = await generateVoiceProfile(
      samples as ContentSample[]
    )

    // Validate profile quality
    const validation = validateVoiceProfile(profileText)
    if (!validation.valid) {
      logger.error('Generated profile failed quality validation:', validation.issues, undefined, { component: 'generate' })
      // Still save the profile but log the issues
    }

    // Get current version number
    const { data: existingProfiles } = await supabaseAdmin
      .from('brand_voice_profiles')
      .select('profile_version')
      .eq('store_id', userId)
      .order('profile_version', { ascending: false })
      .limit(1)

    const nextVersion = (existingProfiles?.[0]?.profile_version || 0) + 1

    // Mark all existing profiles as not current
    await supabaseAdmin
      .from('brand_voice_profiles')
      .update({ is_current: false })
      .eq('store_id', userId)

    // Create new profile
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('brand_voice_profiles')
      .insert({
        store_id: userId,
        profile_text: profileText,
        profile_version: nextVersion,
        is_current: true,
        user_edited: false,
        sample_ids: samples.map(s => s.id)
      })
      .select()
      .single()

    if (profileError) {
      logger.error('Error creating voice profile:', profileError as Error, { component: 'generate' })
      return NextResponse.json(
        { success: false, error: 'Failed to create voice profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: newProfile,
        generation_time_ms: generationTimeMs,
        tokens_used: tokensUsed,
        samples_analyzed: samples.length
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Error in POST /api/content-center/voice/generate:', error as Error, { component: 'generate' })

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
