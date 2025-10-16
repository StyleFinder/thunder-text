import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ApiResponse,
  CreateSampleRequest,
  CreateSampleResponse,
  ListSamplesResponse,
  ContentSample,
  InvalidWordCountError,
  SampleLimitError
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

// Helper function to calculate word count
function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

// Helper function to get user ID from request
async function getUserId(request: NextRequest): Promise<string | null> {
  const supabase = getSupabaseClient()

  // Get session token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  // Verify token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user.id
}

/**
 * GET /api/content-center/samples
 * List all samples for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ListSamplesResponse>>> {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseClient()

    // Fetch all samples for user
    const { data: samples, error } = await supabase
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

    const body: CreateSampleRequest = await request.json()
    const { sample_text, sample_type } = body

    // Validation
    if (!sample_text || !sample_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sample_text and sample_type' },
        { status: 400 }
      )
    }

    // Calculate word count
    const wordCount = calculateWordCount(sample_text)

    // Validate word count (500-5000)
    if (wordCount < 500 || wordCount > 5000) {
      throw new InvalidWordCountError(wordCount)
    }

    const supabase = getSupabaseClient()

    // Check sample limit (trigger will also enforce this, but we check here for better error message)
    const { data: existingSamples } = await supabase
      .from('content_samples')
      .select('id')
      .eq('user_id', userId)

    if (existingSamples && existingSamples.length >= 10) {
      throw new SampleLimitError()
    }

    // Insert sample
    const { data: sample, error } = await supabase
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
