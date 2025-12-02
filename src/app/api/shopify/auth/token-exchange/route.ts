import { NextRequest, NextResponse } from 'next/server'
import { exchangeToken } from '@/lib/shopify/token-exchange'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'
import { logger } from '@/lib/logger'

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

// POST /api/shopify/auth/token-exchange
// Exchange a Shopify session token for an access token
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const body = await request.json()
    const { shop, sessionToken } = body

    if (!shop || !sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: shop and sessionToken'
        },
        { status: 400, headers: corsHeaders }
      )
    }


    // Get API credentials from environment
    const clientId = process.env.SHOPIFY_API_KEY
    const clientSecret = process.env.SHOPIFY_API_SECRET

    if (!clientId || !clientSecret) {
      logger.error('❌ Missing Shopify API credentials in environment', undefined, { component: 'token-exchange' })
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error - missing API credentials'
        },
        { status: 500, headers: corsHeaders }
      )
    }

    // Exchange the session token for an access token
    const tokenResponse = await exchangeToken({
      shop,
      sessionToken,
      clientId,
      clientSecret,
      requestedTokenType: 'offline' // Offline for persistent access
    })


    // Return success - the access token is already saved in the database
    return NextResponse.json({
      success: true,
      scope: tokenResponse.scope,
      expiresIn: tokenResponse.expires_in || 'permanent',
      message: 'Token exchange successful'
    }, { headers: corsHeaders })

  } catch (error) {
    logger.error('❌ Token exchange error:', error as Error, { component: 'token-exchange' })

    // Determine appropriate error response
    let statusCode = 500
    let errorMessage = 'Token exchange failed'

    if (error instanceof Error) {
      if (error.message.includes('Invalid session token')) {
        statusCode = 401
        errorMessage = 'Invalid or expired session token'
      } else if (error.message.includes('Invalid client credentials')) {
        statusCode = 403
        errorMessage = 'Invalid API credentials'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode, headers: corsHeaders }
    )
  }
}