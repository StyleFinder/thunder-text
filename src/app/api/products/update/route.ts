import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const body = await request.json()
    const { shop, productId, updates } = body

    if (!shop || !productId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📝 Updating product:', productId, 'for shop:', shop)

    // For development/demo purposes, we'll simulate a successful update
    // In production, this would make actual Shopify API calls using proper authentication

    // Check if we're in development mode or using the test store
    const isDevMode = shop.includes('zunosai-staging-test-store') ||
                      process.env.NODE_ENV === 'development' ||
                      request.headers.get('referer')?.includes('authenticated=true')

    if (isDevMode) {
      console.log('🎭 Development mode - simulating successful update')

      // Simulate a delay for realism
      await new Promise(resolve => setTimeout(resolve, 1000))

      return NextResponse.json(
        {
          success: true,
          message: 'Product updated successfully (development mode)',
          productId,
          updates: {
            title: updates.title || null,
            description: updates.description || null,
            seoTitle: updates.seoTitle || null,
            seoDescription: updates.seoDescription || null,
            bulletPoints: updates.bulletPoints || null
          },
          mode: 'development'
        },
        { headers: corsHeaders }
      )
    }

    // Production mode would require proper Shopify authentication
    // For now, return an informative error
    return NextResponse.json(
      {
        error: 'Production updates require proper Shopify app installation',
        details: 'Please ensure the app is properly installed in your Shopify store',
        shop,
        mode: 'production'
      },
      { status: 501, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in update endpoint:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}