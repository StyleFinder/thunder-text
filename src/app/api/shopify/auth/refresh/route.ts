/**
 * API endpoint to refresh access token
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/shopify-auth'
import { tokenRefreshManager } from '@/lib/auth/token-refresh'
import { createCorsHeaders } from '@/lib/middleware/cors'

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: createCorsHeaders(request)
  })
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401, headers: corsHeaders }
      )
    }

    const sessionToken = authHeader.substring(7)

    // Verify session token
    const isValid = await verifySessionToken(sessionToken)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get shop from request body
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parameter required' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`🔄 Processing token refresh request for ${shop}`)

    // Handle the token refresh with the fresh session token
    const result = await tokenRefreshManager.handleClientTokenRefresh(
      shop,
      sessionToken
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Token refresh failed' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully'
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500, headers: corsHeaders }
    )
  }
}