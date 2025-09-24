import { NextRequest, NextResponse } from 'next/server'
import { storeShopToken } from '@/lib/shopify/token-manager'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const shop = searchParams.get('shop') || 'zunosai-staging-test-store'
  
  console.log('Simple callback received:', { shop, code })
  
  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 })
  }
  
  try {
    // Exchange code for token
    const tokenUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code: code
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Token exchange failed:', error)
      throw new Error(`Token exchange failed: ${error}`)
    }
    
    const data = await response.json()
    const accessToken = data.access_token
    const scope = data.scope

    console.log('✅ Got access token:', accessToken.substring(0, 15) + '...')

    // Store the token in Supabase
    const storeResult = await storeShopToken(shop, accessToken, scope)

    if (!storeResult.success) {
      console.error('Failed to store token:', storeResult.error)
      // Continue anyway - token can still be copied manually
    } else {
      console.log('✅ Token stored in database for shop:', shop)
    }

    // Display token for copying (as backup)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Access Token Generated</title>
          <style>
            body { font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto; }
            .token { background: #f5f5f5; padding: 15px; border-radius: 8px; font-family: monospace; word-break: break-all; margin: 20px 0; }
            .success { color: #28a745; background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; }
            button { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 10px 0; }
            button:hover { background: #0056b3; }
            .step { background: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #007bff; }
          </style>
        </head>
        <body>
          <h1>🎉 Access Token Generated!</h1>
          <div class="success">Successfully obtained access token for ${shop}.myshopify.com</div>
          
          <h2>Your Access Token:</h2>
          <div class="token" id="token">${accessToken}</div>
          <button onclick="copyToken()">📋 Copy Token</button>
          
          <h2>Next Steps:</h2>
          <div class="step">1. Copy the access token above</div>
          <div class="step">2. Update your .env.local file:<br><code>SHOPIFY_ACCESS_TOKEN=${accessToken}</code></div>
          <div class="step">3. Restart your development server: <code>npm run dev</code></div>
          <div class="step">4. <a href="/create?shop=${shop}.myshopify.com&authenticated=true">Test product creation</a></div>
          
          <script>
            function copyToken() {
              navigator.clipboard.writeText('${accessToken}').then(() => {
                alert('Token copied to clipboard!');
              });
            }
          </script>
        </body>
      </html>
    `
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    })
    
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.json({ 
      error: 'Token exchange failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}