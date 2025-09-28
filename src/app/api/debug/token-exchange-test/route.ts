import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionToken, shop } = body

    console.log('🧪 Token Exchange Debug Test:', {
      shop,
      hasSessionToken: !!sessionToken,
      sessionTokenLength: sessionToken?.length,
      hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.substring(0, 8) + '...',
      apiSecretFirst8: process.env.SHOPIFY_API_SECRET?.substring(0, 8) + '...',
    })

    if (!sessionToken || !shop) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
        missing: {
          sessionToken: !sessionToken,
          shop: !shop
        }
      }, { status: 400 })
    }

    // Ensure shop has .myshopify.com suffix
    const fullShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Try to decode the session token to see its contents
    try {
      const [header, payload, signature] = sessionToken.split('.')
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString())
      console.log('📋 Session token payload:', {
        iss: decodedPayload.iss,
        dest: decodedPayload.dest,
        aud: decodedPayload.aud,
        sub: decodedPayload.sub,
        exp: decodedPayload.exp,
        nbf: decodedPayload.nbf,
        iat: decodedPayload.iat,
        jti: decodedPayload.jti,
      })

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000)
      if (decodedPayload.exp && decodedPayload.exp < now) {
        return NextResponse.json({
          success: false,
          error: 'Session token is expired',
          expired: new Date(decodedPayload.exp * 1000).toISOString(),
          now: new Date().toISOString()
        })
      }

      // Check audience matches our API key
      if (decodedPayload.aud !== process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
        console.error('❌ Audience mismatch:', {
          tokenAud: decodedPayload.aud,
          expectedAud: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY
        })
      }
    } catch (error) {
      console.error('❌ Failed to decode session token:', error)
    }

    // Prepare Token Exchange request
    const tokenExchangeUrl = `https://${fullShop}/admin/oauth/access_token`
    const requestBody = {
      client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      client_secret: process.env.SHOPIFY_API_SECRET!,
      subject_token: sessionToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      requested_token_type: 'urn:shopify:params:oauth:token-type:online-access-token',
    }

    console.log('📤 Sending Token Exchange request:', {
      url: tokenExchangeUrl,
      clientId: requestBody.client_id,
      hasClientSecret: !!requestBody.client_secret,
      subjectTokenType: requestBody.subject_token_type,
      grantType: requestBody.grant_type,
    })

    // Perform Token Exchange
    const response = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('📥 Token Exchange response:', {
      status: response.status,
      statusText: response.statusText,
      responseText: responseText.substring(0, 200),
    })

    if (!response.ok) {
      // Try to parse as JSON for better error info
      try {
        const errorJson = JSON.parse(responseText)
        return NextResponse.json({
          success: false,
          error: 'Token Exchange failed',
          status: response.status,
          shopifyError: errorJson,
          debugInfo: {
            shop: fullShop,
            url: tokenExchangeUrl,
            hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
            hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
          }
        })
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Token Exchange failed',
          status: response.status,
          responseText: responseText.substring(0, 500),
          debugInfo: {
            shop: fullShop,
            url: tokenExchangeUrl,
          }
        })
      }
    }

    const tokenData = JSON.parse(responseText)

    return NextResponse.json({
      success: true,
      message: 'Token Exchange successful!',
      tokenData: {
        hasAccessToken: !!tokenData.access_token,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        hasAssociatedUser: !!tokenData.associated_user,
      }
    })

  } catch (error) {
    console.error('❌ Token Exchange test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}