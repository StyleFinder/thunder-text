import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const shop = searchParams.get('shop')
  const hmac = searchParams.get('hmac')
  const timestamp = searchParams.get('timestamp')
  const code = searchParams.get('code')
  
  console.log('OAuth callback received:', { shop, code, hmac, timestamp })
  
  if (!shop || !code) {
    return NextResponse.json({ error: 'Missing shop or code parameter' }, { status: 400 })
  }
  
  try {
    // Exchange authorization code for access token
    const tokenUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`
    const tokenPayload = {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code: code
    }
    
    console.log('Exchanging code for token...')
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenPayload)
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return NextResponse.json({ error: 'Token exchange failed', details: errorText }, { status: 500 })
    }
    
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    
    console.log('✅ Successfully obtained access token:', accessToken.substring(0, 10) + '...')
    
    // For development, display the token so you can copy it
    if (process.env.NODE_ENV === 'development') {
      const tokenDisplayUrl = new URL('/token-display', request.url)
      tokenDisplayUrl.searchParams.set('token', accessToken)
      tokenDisplayUrl.searchParams.set('shop', shop)
      return NextResponse.redirect(tokenDisplayUrl)
    }
    
    // In production, you would store this in your database here
    // For now, redirect to dashboard
    const dashboardUrl = new URL('/dashboard', request.url)
    dashboardUrl.searchParams.set('shop', shop)
    dashboardUrl.searchParams.set('authenticated', 'true')
    
    return NextResponse.redirect(dashboardUrl)
    
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.json({ 
      error: 'OAuth failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}