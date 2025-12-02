import { NextRequest, NextResponse } from 'next/server'
import { guardDebugRoute } from '../_middleware-guard'

// This endpoint tests Token Exchange with a mock session token to get the exact error
export async function POST(request: NextRequest) {
  const guardResponse = guardDebugRoute('/api/debug/test-raw-token-exchange');
  if (guardResponse) return guardResponse;
  try {
    const body = await request.json()
    const { sessionToken, shop } = body

    if (!sessionToken || !shop) {
      return NextResponse.json({
        error: 'Missing sessionToken or shop parameter'
      }, { status: 400 })
    }

    // Log the exact request we're making
    const tokenExchangeUrl = `https://${shop}/admin/oauth/access_token`

    const exchangeBody = {
      client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      client_secret: process.env.SHOPIFY_API_SECRET!,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: sessionToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      requested_token_type: 'urn:shopify:params:oauth:token-type:online-access-token'
    }

    // Make the actual Token Exchange request
    const response = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Thunder-Text-App/1.0'
      },
      body: JSON.stringify(exchangeBody)
    })

    const responseText = await response.text()

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    // Return detailed debugging information
    return NextResponse.json({
      request: {
        url: tokenExchangeUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: {
          client_id: exchangeBody.client_id,
          client_secret: '[REDACTED]',
          grant_type: exchangeBody.grant_type,
          subject_token: '[SESSION_TOKEN]',
          subject_token_type: exchangeBody.subject_token_type,
          requested_token_type: exchangeBody.requested_token_type
        }
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData
      },
      diagnostics: {
        credentialsConfigured: {
          apiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
          apiKeyLength: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.length,
          apiSecret: !!process.env.SHOPIFY_API_SECRET,
          apiSecretLength: process.env.SHOPIFY_API_SECRET?.length
        },
        sessionTokenInfo: {
          length: sessionToken.length,
          hasThreeParts: sessionToken.split('.').length === 3,
          preview: sessionToken.substring(0, 20) + '...'
        },
        shopInfo: {
          domain: shop,
          isMyshopify: shop.includes('.myshopify.com')
        }
      },
      possibleCauses: getPossibleCauses(response.status, responseData)
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error in test',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

function getPossibleCauses(status: number, responseData: {
  error?: string
  error_description?: string
}): string[] {
  const causes = []

  if (status === 400) {
    causes.push('Invalid or expired session token')
    causes.push('Session token not properly signed')
    causes.push('Token already used (tokens are single-use)')

    if (responseData?.error === 'invalid_client') {
      causes.push('Client credentials (API key or secret) are incorrect')
      causes.push('App not installed in this shop')
    }

    if (responseData?.error === 'invalid_grant') {
      causes.push('Session token is expired (60-second lifetime)')
      causes.push('Session token was already exchanged')
      causes.push('Session token is for a different app')
    }
  }

  if (status === 401) {
    causes.push('Invalid API key or secret')
    causes.push('App not properly installed')
    causes.push('Credentials do not match Partners Dashboard')
  }

  if (status === 403) {
    causes.push('App does not have permission for Token Exchange')
    causes.push('Shop has restricted this app')
  }

  if (status === 404) {
    causes.push('Token Exchange endpoint not available for this shop')
    causes.push('Shop domain is incorrect')
  }

  return causes
}