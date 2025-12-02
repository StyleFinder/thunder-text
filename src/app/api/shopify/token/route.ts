import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Modern Token Exchange API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionToken, shop } = body

    if (!sessionToken || !shop) {
      return NextResponse.json({
        error: 'Missing required parameters',
        details: { sessionToken: !!sessionToken, shop: !!shop }
      }, { status: 400 })
    }


    // Prepare Token Exchange request
    const tokenExchangeParams = {
      client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      client_secret: process.env.SHOPIFY_API_SECRET!,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: sessionToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token'
    }

    // Make Token Exchange request directly to Shopify
    const tokenUrl = `https://${shop}/admin/oauth/access_token`

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(tokenExchangeParams)
    })

    const responseData = await tokenResponse.text()

    if (!tokenResponse.ok) {
      logger.error('[Token Exchange] Failed:', responseData as Error, { component: 'token' })

      // Parse error if it's JSON
      try {
        const errorData = JSON.parse(responseData)
        return NextResponse.json({
          error: 'Token exchange failed',
          details: errorData,
          status: tokenResponse.status
        }, { status: tokenResponse.status })
      } catch {
        return NextResponse.json({
          error: 'Token exchange failed',
          details: responseData,
          status: tokenResponse.status
        }, { status: tokenResponse.status })
      }
    }

    const tokenData = JSON.parse(responseData)

    // TODO: Store the access token in your database
    // For now, return it to the client (in production, store it securely)
    return NextResponse.json({
      success: true,
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
      shop
    })

  } catch (error) {
    logger.error('[Token Exchange] Error:', error as Error, { component: 'token' })
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: 'Token Exchange API',
    status: 'ready',
    configured: {
      apiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      apiSecret: !!process.env.SHOPIFY_API_SECRET,
    }
  })
}