import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Token Exchange endpoint for embedded apps
// This exchanges a session token for an access token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionToken, shop } = body

    if (!sessionToken || !shop) {
      return NextResponse.json({
        success: false,
        error: 'Missing session token or shop parameter'
      }, { status: 400 })
    }

    console.log('🔄 Token Exchange requested for shop:', shop)

    // Prepare token exchange request
    const tokenExchangeUrl = `https://${shop}/admin/oauth/access_token`

    const exchangeBody = {
      client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      client_secret: process.env.SHOPIFY_API_SECRET!,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: sessionToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token'
    }

    console.log('📤 Sending token exchange request to Shopify')

    // Exchange session token for access token
    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(exchangeBody)
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Token exchange failed:', errorText)
      return NextResponse.json({
        success: false,
        error: 'Token exchange failed',
        details: errorText
      }, { status: tokenResponse.status })
    }

    const tokenData = await tokenResponse.json()
    console.log('✅ Token exchange successful, received access token')

    // Store the access token in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

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
      console.error('❌ Error storing token:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Failed to store access token'
      }, { status: 500 })
    }

    console.log('✅ Access token stored successfully for shop:', fullShopDomain)

    return NextResponse.json({
      success: true,
      message: 'Token exchange completed successfully',
      scope: tokenData.scope
    })

  } catch (error) {
    console.error('❌ Unexpected error in token exchange:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed'
    }, { status: 500 })
  }
}