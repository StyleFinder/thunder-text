import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  CreateVoiceTemplateRequest,
  CreateVoiceTemplateResponse,
  VoiceProfileNotFoundError
} from '@/types/content-center'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { logger } from '@/lib/logger'



/**
 * POST /api/content-center/templates/from-voice
 * Create a product description template infused with user's brand voice
 *
 * Note: Template generation logic will be implemented in Phase 3
 * For now, this is a placeholder that creates a basic template
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<CreateVoiceTemplateResponse>>> {
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
    if (rateLimitCheck) return rateLimitCheck as NextResponse<ApiResponse<CreateVoiceTemplateResponse>>

    const body: CreateVoiceTemplateRequest = await request.json()

    // Validation
    if (!body.template_name || !body.product_category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: template_name and product_category' },
        { status: 400 }
      )
    }

    // Get current voice profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('brand_voice_profiles')
      .select('*')
      .eq('store_id', userId)
      .eq('is_current', true)
      .single()

    if (profileError || !profile) {
      throw new VoiceProfileNotFoundError()
    }

    // TODO: Phase 3 - Implement AI template generation
    // For now, create a placeholder template
    const systemPrompt = `You are creating a product description for a ${body.product_category} item.

BRAND VOICE PROFILE:
${profile.profile_text}

INSTRUCTIONS:
1. Use the brand voice characteristics above to match the owner's writing style
2. Highlight key features and benefits specific to ${body.product_category}
3. Include relevant details (materials, dimensions, care instructions where applicable)
4. Create emotional connection with target customers
5. Length: 150-250 words

NOTE: This is a placeholder template. AI template generation coming in Phase 3.`

    // Insert template into prompt_templates table
    const { data: template, error: templateError } = await supabaseAdmin
      .from('prompt_templates')
      .insert({
        store_id: userId,
        name: body.template_name,
        prompt: systemPrompt,
        is_voice_infused: true,
        voice_profile_id: profile.id
      })
      .select()
      .single()

    if (templateError) {
      logger.error('Error creating template:', templateError as Error, { component: 'from-voice' })
      return NextResponse.json(
        { success: false, error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        template_id: template.id,
        template_name: body.template_name,
        system_prompt: systemPrompt
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Error in POST /api/content-center/templates/from-voice:', error as Error, { component: 'from-voice' })

    if (error instanceof VoiceProfileNotFoundError) {
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
