import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function POST(request: NextRequest) {
  // Use secure CORS headers that restrict to Shopify domains
  const corsHeaders = createCorsHeaders(request)

  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503, headers: corsHeaders }
    )
  }

  try {
    // Dynamic imports to avoid loading during build
    const { aiGenerator } = await import('@/lib/openai')
    
    // Check for session token in Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    // Check if this is a legitimate Shopify request
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const isShopifyRequest = userAgent.includes('Shopify') || referer.includes('.myshopify.com')

    // Thunder Text uses Shopify OAuth authentication, not session-based auth
    // Authentication is handled via shop parameter and access token from database
    if (!isShopifyRequest && !sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    console.log('✅ Processing generation request (Shopify/Embedded mode)')
    const storeId = 'shopify-embedded-app'

    const body = await request.json()
    const { images, productTitle, category, brandVoice, targetLength, keywords } = body

    // Allow empty images for Shopify requests (they may not have images yet during extension)
    if (!isShopifyRequest && (!images || !Array.isArray(images) || images.length === 0)) {
      return NextResponse.json(
        { error: 'Images are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Generate product description
    const result = await aiGenerator.generateProductDescription({
      images: images || [],
      productTitle,
      category,
      brandVoice,
      targetLength,
      keywords,
      storeId: storeId,
    })

    return NextResponse.json({
      success: true,
      data: result,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}