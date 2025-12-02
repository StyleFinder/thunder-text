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
import { logger } from '@/lib/logger'

// Helper function to calculate word count
function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Extract shop domain from Authorization header or query parameter
 * Supports both embedded app (Authorization header) and external calls (query param)
 */
function getShopDomain(request: NextRequest): string | null {
  // Try Authorization header first (embedded app pattern)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }

  // Fallback to query parameter
  return request.nextUrl.searchParams.get('shop')
}

/**
 * GET /api/content-center/samples
 * List all samples for the authenticated shop
 * PATTERN MATCHES: shop-sizes/route.ts (WORKING MODULE)
 */
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const shop = getShopDomain(request)

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Missing shop parameter or Authorization header' },
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
      .eq('store_id', shopData.id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching samples:', error as Error, { component: 'samples' })
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
    logger.error('Error in GET /api/content-center/samples:', error as Error, { component: 'samples' })
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
    const shop = getShopDomain(request)

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Missing shop parameter or Authorization header' },
        { status: 400, headers: corsHeaders }
      )
    }

    const body: CreateSampleRequest = await request.json()
    const { sample_text, sample_type } = body

    if (!sample_text || !sample_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sample_text, sample_type' },
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
      .eq('store_id', shopData.id)

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
        store_id: shopData.id,
        sample_text: sanitizedText,
        sample_type: sanitizedType,
        word_count: wordCount,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating sample:', error as Error, { component: 'samples' })
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
    logger.error('Error in POST /api/content-center/samples:', error as Error, { component: 'samples' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}
