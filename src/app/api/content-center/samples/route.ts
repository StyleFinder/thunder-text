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
import { supabaseAdmin } from '@/lib/supabase'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'
import { sanitizeAndValidateSample } from '@/lib/security/input-sanitization'

// Helper function to calculate word count
function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * GET /api/content-center/samples
 * List all samples for the authenticated shop
 * PATTERN MATCHES: shop-sizes/route.ts (WORKING MODULE)
 */
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Missing shop parameter' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get shop ID from shop domain
    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', fullShopDomain)
      .single()

    if (shopError || !shopData) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Fetch all samples for shop
    const { data: samples, error } = await supabaseAdmin
      .from('content_samples')
      .select('*')
      .eq('user_id', shopData.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching samples:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch samples' },
        { status: 500, headers: corsHeaders }
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
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Error in GET /api/content-center/samples:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/content-center/samples
 * Upload a new content sample
 * PATTERN MATCHES: shop-sizes/route.ts (WORKING MODULE)
 */
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const body: CreateSampleRequest = await request.json()
    const { shop, sample_text, sample_type } = body

    if (!shop || !sample_text || !sample_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: shop, sample_text, sample_type' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get shop ID from shop domain
    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', fullShopDomain)
      .single()

    if (shopError || !shopData) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Sanitize and validate input
    const validation = sanitizeAndValidateSample({ sample_text, sample_type })
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400, headers: corsHeaders }
      )
    }

    const sanitizedText = validation.sanitized!.sample_text
    const sanitizedType = validation.sanitized!.sample_type
    const wordCount = calculateWordCount(sanitizedText)

    // Check sample limit
    const { data: existingSamples } = await supabaseAdmin
      .from('content_samples')
      .select('id')
      .eq('user_id', shopData.id)

    if (existingSamples && existingSamples.length >= 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 10 samples allowed' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Insert sample
    const { data: sample, error } = await supabaseAdmin
      .from('content_samples')
      .insert({
        user_id: shopData.id,
        sample_text: sanitizedText,
        sample_type: sanitizedType,
        word_count: wordCount,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating sample:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create sample' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        sample: sample as ContentSample,
        word_count: wordCount
      }
    }, { status: 201, headers: corsHeaders })

  } catch (error) {
    console.error('Error in POST /api/content-center/samples:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}
