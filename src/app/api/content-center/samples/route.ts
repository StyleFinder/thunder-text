import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  CreateSampleRequest,
  CreateSampleResponse,
  ListSamplesResponse,
  ContentSample,
  InvalidWordCountError,
  SampleLimitError
} from '@/types/content-center'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { sanitizeAndValidateSample } from '@/lib/security/input-sanitization'

// Helper function to calculate word count
function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * GET /api/content-center/samples
 * List all samples for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ListSamplesResponse>>> {
  try {
    // Debug: Check environment variables
    console.log('[DEBUG] Environment check:', {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_KEY?.substring(0, 20) + '...',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    })

    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[DEBUG] Fetching samples for userId:', userId)

    // Rate limiting for read operations
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.READ)(request, userId)
    if (rateLimitCheck) return rateLimitCheck

    // Fetch all samples for user
    const { data: samples, error } = await supabaseAdmin
      .from('content_samples')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching samples:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch samples' },
        { status: 500 }
      )
    }

    const activeSamples = samples?.filter(s => s.is_active) || []

    return NextResponse.json({
      success: true,
      data: {
        samples: samples as ContentSample[],
        active_count: activeSamples.length,
        total_count: samples?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/content-center/samples:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/content-center/samples
 * Upload a new content sample
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<CreateSampleResponse>>> {
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
    if (rateLimitCheck) return rateLimitCheck

    const body: CreateSampleRequest = await request.json()

    // Validation
    if (!body.sample_text || !body.sample_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sample_text and sample_type' },
        { status: 400 }
      )
    }

    // Sanitize and validate input
    const validation = sanitizeAndValidateSample(body)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { sample_text, sample_type } = validation.sanitized!
    const wordCount = calculateWordCount(sample_text)

    // Check sample limit (trigger will also enforce this, but we check here for better error message)
    const { data: existingSamples } = await supabaseAdmin
      .from('content_samples')
      .select('id')
      .eq('user_id', userId)

    if (existingSamples && existingSamples.length >= 10) {
      throw new SampleLimitError()
    }

    // Insert sample
    const { data: sample, error } = await supabaseAdmin
      .from('content_samples')
      .insert({
        user_id: userId,
        sample_text,
        sample_type,
        word_count: wordCount,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating sample:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create sample' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        sample: sample as ContentSample,
        word_count: wordCount
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/content-center/samples:', error)

    if (error instanceof InvalidWordCountError || error instanceof SampleLimitError) {
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
