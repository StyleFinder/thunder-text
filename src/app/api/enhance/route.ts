import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function POST(request: NextRequest) {
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
    const { auth } = await import('@/lib/auth')
    const { aiGenerator } = await import('@/lib/openai')
    const { supabaseAdmin } = await import('@/lib/supabase')

    // Check for session token in Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    console.log('🔐 Enhance API - Auth check:', {
      hasAuthHeader: !!authHeader,
      hasSessionToken: !!sessionToken,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    })

    // Check if this is a legitimate Shopify request
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const isShopifyRequest = userAgent.includes('Shopify') || referer.includes('.myshopify.com') || referer.includes('thunder-text')

    let storeId = null
    let store = null

    // For development/testing with authenticated=true flag
    const url = new URL(request.url)
    const isAuthenticatedDev = url.searchParams.get('authenticated') === 'true' ||
                              referer.includes('authenticated=true')

    if ((isShopifyRequest || referer.includes('vercel.app') || isAuthenticatedDev) && (sessionToken || isAuthenticatedDev)) {
      // For Shopify embedded app requests or authenticated development
      console.log('✅ Processing enhancement request (Shopify/Dev mode)')
      store = {
        id: 'shopify-embedded-app',
        current_usage: 0,
        usage_limits: 1000,
        plan: 'shopify'
      }
      storeId = store.id
    } else if (!sessionToken && !isAuthenticatedDev) {
      // No authentication provided
      console.error('❌ Authentication required - no token and not in dev mode')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    } else {
      // Regular authenticated request
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }

      // Get store information
      const { data: storeData, error: storeError } = await supabaseAdmin
        .from('stores')
        .select('id, current_usage, usage_limits, plan')
        .eq('id', session.user.id)
        .single()

      if (storeError || !storeData) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404, headers: corsHeaders }
        )
      }

      store = storeData
      storeId = store.id

      // Check usage limits for authenticated users
      if (store.current_usage >= store.usage_limits) {
        return NextResponse.json(
          { error: 'Usage limit exceeded. Please upgrade your plan.' },
          { status: 429, headers: corsHeaders }
        )
      }
    }

    // Parse FormData (since we're using FormData for image uploads)
    const formData = await request.formData()

    // Extract form data
    const productId = formData.get('productId') as string
    const shop = formData.get('shop') as string
    const template = formData.get('template') as string
    const parentCategory = formData.get('parentCategory') as string
    const availableSizing = formData.get('availableSizing') as string
    const fabricMaterial = formData.get('fabricMaterial') as string
    const occasionUse = formData.get('occasionUse') as string
    const targetAudience = formData.get('targetAudience') as string
    const keyFeatures = formData.get('keyFeatures') as string
    const additionalNotes = formData.get('additionalNotes') as string
    const enhancementOptions = JSON.parse(formData.get('enhancementOptions') as string || '{}')

    // Extract images - both existing URLs and new uploads
    const existingImages = formData.getAll('existingImages').map(img => String(img))
    const uploadedImages = formData.getAll('images') as File[]

    // Process uploaded images if any
    const processedImages = []

    // Add existing images
    for (const imgUrl of existingImages) {
      processedImages.push(imgUrl)
    }

    // Process new uploads (in a real app, you'd upload these to storage first)
    for (const file of uploadedImages) {
      if (file && file.size > 0) {
        // In production, upload to storage and get URL
        // For now, we'll convert to base64 for the AI
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const dataUri = `data:${file.type};base64,${base64}`
        processedImages.push(dataUri)
      }
    }

    // Generate enhanced description using AI
    const enhancedContent = await aiGenerator.enhanceProductDescription({
      productId,
      images: processedImages,
      template,
      productDetails: {
        parentCategory,
        availableSizing,
        fabricMaterial,
        occasionUse,
        targetAudience,
        keyFeatures,
        additionalNotes
      },
      enhancementOptions,
      storeId
    })

    // Update usage count for non-Shopify requests
    if (!isShopifyRequest) {
      await supabaseAdmin
        .from('stores')
        .update({
          current_usage: store.current_usage + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id)

      // Track usage metrics
      const today = new Date().toISOString().split('T')[0]
      await supabaseAdmin
        .from('usage_metrics')
        .upsert({
          store_id: store.id,
          period: today,
          generations_count: 1,
          ai_tokens_used: enhancedContent.tokenUsage?.total || 0,
        }, {
          onConflict: 'store_id,period',
        })
    }

    return NextResponse.json({
      success: true,
      data: enhancedContent,
      usage: {
        current: isShopifyRequest ? 0 : store.current_usage + 1,
        limit: store.usage_limits,
        remaining: isShopifyRequest ? 1000 : store.usage_limits - (store.current_usage + 1),
      },
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Enhancement API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    )
  }
}