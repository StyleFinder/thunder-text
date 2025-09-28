import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { sessionToken } = await request.json()

    if (!sessionToken) {
      return NextResponse.json({
        error: 'No session token provided'
      }, { status: 400 })
    }

    // Decode the JWT without verification (for debugging)
    const parts = sessionToken.split('.')
    if (parts.length !== 3) {
      return NextResponse.json({
        error: 'Invalid JWT format',
        parts: parts.length,
        note: 'Session token should have 3 parts separated by dots'
      }, { status: 400 })
    }

    let header, payload
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
      payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    } catch (decodeError) {
      return NextResponse.json({
        error: 'Failed to decode JWT',
        message: decodeError instanceof Error ? decodeError.message : 'Unknown error',
        note: 'Session token might be corrupted or invalid'
      }, { status: 400 })
    }

    // Check token validity
    const now = Math.floor(Date.now() / 1000)
    const isExpired = payload.exp && payload.exp < now
    const notYetValid = payload.nbf && payload.nbf > now

    // Extract shop from dest
    const shopMatch = payload.dest?.match(/https:\/\/([^\/]+)/)
    const shop = shopMatch ? shopMatch[1] : null

    // Manual signature verification (without jsonwebtoken package)
    const clientSecret = process.env.SHOPIFY_API_SECRET
    let signatureValid = false
    let signatureError = null

    try {
      // For now, we'll skip signature verification and focus on other validations
      // The actual Token Exchange will validate the signature
      signatureValid = null // Unknown until we try Token Exchange
      signatureError = 'Signature verification skipped (will be checked during Token Exchange)'
    } catch (err) {
      signatureError = err instanceof Error ? err.message : 'Signature verification failed'
    }

    // Prepare diagnostic response
    const diagnostics = {
      tokenStructure: {
        valid: parts.length === 3,
        parts: parts.length,
        headerLength: parts[0].length,
        payloadLength: parts[1].length,
        signatureLength: parts[2].length
      },
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
        signatureValid,
        signatureError
      },
      environment: {
        hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
        apiKeyPreview: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.substring(0, 10) + '...',
        apiSecretLength: process.env.SHOPIFY_API_SECRET?.length
      },
      tokenExchange: {
        url: shop ? `https://${shop}/admin/oauth/access_token` : null,
        readyForExchange: !isExpired && !notYetValid && shop,
        issues: []
      },
      currentTime: new Date().toISOString(),
      currentTimestamp: now
    }

    // Identify issues
    if (isExpired) {
      diagnostics.tokenExchange.issues.push('❌ Token is expired (60-second lifetime)')
    }
    if (notYetValid) {
      diagnostics.tokenExchange.issues.push('❌ Token is not yet valid')
    }
    if (!payload.aud || payload.aud !== process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
      diagnostics.tokenExchange.issues.push(`❌ Audience mismatch - Expected: ${process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}, Got: ${payload.aud}`)
    }
    if (!shop) {
      diagnostics.tokenExchange.issues.push('❌ Could not extract shop domain from token')
    }

    if (diagnostics.tokenExchange.issues.length === 0) {
      diagnostics.tokenExchange.issues.push('✅ Token appears valid for exchange')
    }

    // If token is valid, attempt actual token exchange
    if (diagnostics.tokenExchange.readyForExchange && shop) {
      try {
        const exchangeResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
            client_secret: process.env.SHOPIFY_API_SECRET!,
            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
            subject_token: sessionToken,
            subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
            requested_token_type: 'urn:shopify:params:oauth:token-type:online-access-token'
          })
        })

        const exchangeText = await exchangeResponse.text()
        let exchangeData
        try {
          exchangeData = JSON.parse(exchangeText)
        } catch {
          exchangeData = exchangeText
        }

        diagnostics.tokenExchange.testResult = {
          status: exchangeResponse.status,
          statusText: exchangeResponse.statusText,
          success: exchangeResponse.ok,
          response: exchangeData
        }
      } catch (exchangeError) {
        diagnostics.tokenExchange.testResult = {
          error: 'Failed to test token exchange',
          message: exchangeError instanceof Error ? exchangeError.message : 'Unknown error'
        }
      }
    }

    return NextResponse.json(diagnostics)

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to analyze token',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST a session token to this endpoint to analyze it',
    example: {
      sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  })
}