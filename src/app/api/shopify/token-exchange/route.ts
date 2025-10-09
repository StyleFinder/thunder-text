import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

// Token Exchange endpoint for embedded apps
// This exchanges a session token for an access token
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const body = await request.json()
    const { sessionToken, shop } = body

    console.log('🔄 [TOKEN-EXCHANGE] Starting token exchange process')
    console.log('📥 [TOKEN-EXCHANGE] Request body:', {
      hasSessionToken: !!sessionToken,
      sessionTokenLength: sessionToken?.length,
      sessionTokenPrefix: sessionToken?.substring(0, 20) + '...',
      shop,
      shopDomain: shop?.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    })

    if (!sessionToken || !shop) {
      console.error('❌ [TOKEN-EXCHANGE] Missing required parameters:', {
        hasSessionToken: !!sessionToken,
        hasShop: !!shop
      })
      return NextResponse.json({
        success: false,
        error: 'Missing session token or shop parameter'
      }, { status: 400, headers: corsHeaders })
    }

    console.log('🔑 [TOKEN-EXCHANGE] Environment variables check:', {
      hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      apiKeyPrefix: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.substring(0, 8),
      apiKeyLength: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.length,
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      apiSecretPrefix: process.env.SHOPIFY_API_SECRET?.substring(0, 8),
      apiSecretLength: process.env.SHOPIFY_API_SECRET?.length,
      allEnvVars: Object.keys(process.env).filter(k => k.includes('SHOPIFY') || k.includes('SUPABASE'))
    })

    // Prepare token exchange request
    const tokenExchangeUrl = `https://${shop}/admin/oauth/access_token`

    const exchangeBody = {
      client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      client_secret: process.env.SHOPIFY_API_SECRET!,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: sessionToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      requested_token_type: 'urn:shopify:params:oauth:token-type:online-access-token'
    }

    console.log('📤 [TOKEN-EXCHANGE] Sending token exchange request to Shopify:', {
      url: tokenExchangeUrl,
      method: 'POST',
      clientIdPrefix: exchangeBody.client_id?.substring(0, 8),
      clientIdLength: exchangeBody.client_id?.length,
      hasSecret: !!exchangeBody.client_secret,
      secretLength: exchangeBody.client_secret?.length,
      grantType: exchangeBody.grant_type,
      sessionTokenPrefix: sessionToken.substring(0, 20) + '...',
      sessionTokenLength: sessionToken.length,
      requestedTokenType: exchangeBody.requested_token_type,
      timestamp: new Date().toISOString()
    })

    // Exchange session token for access token
    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(exchangeBody)
    })

    console.log('📨 [TOKEN-EXCHANGE] Shopify API response:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok,
      headers: Object.fromEntries(tokenResponse.headers.entries()),
      timestamp: new Date().toISOString()
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ [TOKEN-EXCHANGE] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText,
        errorTextLength: errorText.length,
        shop,
        fullShopDomain: shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`,
        requestUrl: tokenExchangeUrl,
        hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
        timestamp: new Date().toISOString()
      })

      // Try to parse Shopify's error response
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson.error_description || errorJson.error || errorText
      } catch (e) {
        // Not JSON, use raw text
      }

      return NextResponse.json({
        success: false,
        error: `Token exchange failed: ${errorDetails}`,
        details: errorText,
        debugInfo: {
          shop,
          status: tokenResponse.status,
          hasCredentials: {
            apiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
            apiSecret: !!process.env.SHOPIFY_API_SECRET
          }
        }
      }, { status: tokenResponse.status, headers: corsHeaders })
    }

    const tokenData = await tokenResponse.json()
    console.log('✅ [TOKEN-EXCHANGE] Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      accessTokenLength: tokenData.access_token?.length,
      accessTokenPrefix: tokenData.access_token?.substring(0, 20) + '...',
      scope: tokenData.scope,
      expiresIn: tokenData.expires_in,
      associatedUser: tokenData.associated_user,
      timestamp: new Date().toISOString()
    })

    // Store the access token in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('💾 [TOKEN-EXCHANGE] Preparing to store in Supabase:', {
      hasUrl: !!supabaseUrl,
      urlValue: supabaseUrl,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      usingKey: process.env.SUPABASE_SERVICE_KEY ? 'service' : 'anon',
      allSupabaseEnvVars: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    })

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [TOKEN-EXCHANGE] Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlValue: supabaseUrl,
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      })
      return NextResponse.json({
        success: false,
        error: 'Supabase configuration missing - check environment variables'
      }, { status: 500, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    console.log('💾 [TOKEN-EXCHANGE] Upserting token to database:', {
      shop: fullShopDomain,
      hasAccessToken: !!tokenData.access_token,
      scope: tokenData.scope,
      timestamp: new Date().toISOString()
    })

    const { error: dbError } = await supabase
      .from('shops')
      .upsert({
        shop_domain: fullShopDomain,
        access_token: tokenData.access_token,
        scope: tokenData.scope || '',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_domain'
      })

    if (dbError) {
      console.error('❌ [TOKEN-EXCHANGE] Error storing token in database:', {
        error: dbError,
        errorMessage: dbError.message,
        errorCode: dbError.code,
        errorDetails: dbError.details,
        shop: fullShopDomain,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to store access token',
        details: dbError.message
      }, { status: 500, headers: corsHeaders })
    }

    console.log('✅ [TOKEN-EXCHANGE] Access token stored successfully:', {
      shop: fullShopDomain,
      scope: tokenData.scope,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Token exchange completed successfully',
      scope: tokenData.scope
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ [TOKEN-EXCHANGE] Unexpected error in token exchange:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500, headers: corsHeaders })
  }
}