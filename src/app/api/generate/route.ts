import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Add CORS headers for Shopify extensions
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

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
    
    // Check if this is a Shopify extension request (no auth required)
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const isShopifyExtension = userAgent.includes('Shopify') || referer.includes('shopify') || referer.includes('localhost:3000') || referer.includes('localhost:3050') || process.env.SHOPIFY_AUTH_BYPASS === 'true'
    
    let storeId = null
    let store = null
    
    if (isShopifyExtension) {
      // For Shopify extensions, use a demo store configuration
      store = {
        id: 'shopify-extension-demo',
        current_usage: 0,
        usage_limits: 1000, // Allow plenty of usage for demo
        plan: 'demo'
      }
      storeId = store.id
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

    const body = await request.json()
    const { images, productTitle, category, brandVoice, targetLength, keywords } = body

    // Allow empty images for Shopify extensions (they may not have images yet)
    if (!isShopifyExtension && (!images || !Array.isArray(images) || images.length === 0)) {
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

    // Update usage count only for authenticated users
    if (!isShopifyExtension) {
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
          ai_tokens_used: result.tokenUsage.total,
        }, {
          onConflict: 'store_id,period',
        })
    }

    return NextResponse.json({
      success: true,
      data: result,
      usage: {
        current: isShopifyExtension ? 0 : store.current_usage + 1,
        limit: store.usage_limits,
        remaining: isShopifyExtension ? 1000 : store.usage_limits - (store.current_usage + 1),
      },
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}