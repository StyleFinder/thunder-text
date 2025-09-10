import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { shop, scopes } = await request.json()
    
    if (!shop || !scopes) {
      return NextResponse.json({ error: 'Missing shop or scopes' }, { status: 400 })
    }
    
    // For development: Use GraphQL Admin API to create a session token
    // This requires your app to be installed on the store
    
    const authUrl = `https://${shop}/admin/oauth/authorize`
    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_API_KEY!,
      scope: scopes,
      redirect_uri: `${process.env.SHOPIFY_APP_URL}/api/auth/callback`,
      state: 'development',
      response_type: 'code'
    })
    
    return NextResponse.json({
      message: 'Please visit the authorization URL to get your token',
      authUrl: `${authUrl}?${params.toString()}`,
      instructions: [
        '1. Visit the authorization URL above',
        '2. Authorize the app in your Shopify admin', 
        '3. You will receive an authorization code',
        '4. Exchange that code for an access token'
      ]
    })
    
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({ 
      error: 'Token generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}