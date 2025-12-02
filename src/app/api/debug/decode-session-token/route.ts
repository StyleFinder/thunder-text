import { NextRequest, NextResponse } from 'next/server'
import { guardDebugRoute } from '../_middleware-guard'

export async function POST(request: NextRequest) {
  const guardResponse = guardDebugRoute('/api/debug/decode-session-token');
  if (guardResponse) return guardResponse;
  try {
    const { sessionToken } = await request.json()

    if (!sessionToken) {
      return NextResponse.json({
        error: 'No session token provided'
      }, { status: 400 })
    }

    // Decode the JWT without verification (for debugging only)
    const parts = sessionToken.split('.')
    if (parts.length !== 3) {
      return NextResponse.json({
        error: 'Invalid JWT format',
        parts: parts.length
      }, { status: 400 })
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

    // Check expiry
    const now = Math.floor(Date.now() / 1000)
    const isExpired = payload.exp && payload.exp < now
    const notYetValid = payload.nbf && payload.nbf > now

    // Extract shop from dest
    const shopMatch = payload.dest?.match(/https:\/\/([^\/]+)/)
    const shop = shopMatch ? shopMatch[1] : null

    return NextResponse.json({
      header,
      payload: {
        ...payload,
        exp_human: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        nbf_human: payload.nbf ? new Date(payload.nbf * 1000).toISOString() : null,
        iat_human: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
      },
      validation: {
        isExpired,
        notYetValid,
        shop,
        audience: payload.aud,
        expectedAudience: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        audienceMatch: payload.aud === process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        issuer: payload.iss,
        subject: payload.sub,
        destination: payload.dest,
        timeRemaining: payload.exp ? payload.exp - now : null,
      },
      environment: {
        hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
        apiKeyPrefix: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.substring(0, 10) + '...',
      },
      tokenExchangeUrl: shop ? `https://${shop}/admin/oauth/access_token` : null,
      currentTime: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to decode token',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}