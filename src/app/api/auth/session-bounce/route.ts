import { NextRequest, NextResponse } from 'next/server'

/**
 * Session token bounce page
 * This page loads App Bridge and redirects back with a session token
 * Used as a fallback when the session token is missing
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const host = searchParams.get('host')
  const returnUrl = searchParams.get('return_url') || '/enhance'

  if (!shop || !host) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Shopify API key not configured' },
      { status: 500 }
    )
  }

  // Return HTML that loads the app with proper parameters
  // This ensures App Bridge initializes correctly
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authenticating...</title>
      <script>
        // Immediately redirect with proper parameters
        // This ensures the app loads in the correct context
        const params = new URLSearchParams({
          shop: '${shop}',
          host: '${host}',
          embedded: '1',
          session: 'new'
        });

        // Add a timestamp to force a fresh load
        params.set('t', Date.now().toString());

        // Redirect to the return URL with all necessary parameters
        const redirectUrl = '${returnUrl}?' + params.toString();
        console.log('🔄 Session bounce: Redirecting to', redirectUrl);

        window.location.replace(redirectUrl);
      </script>
    </head>
    <body>
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
        <div style="text-align: center;">
          <h2>Establishing Shopify Session...</h2>
          <p>Redirecting you back to the app...</p>
        </div>
      </div>
    </body>
    </html>
  `

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  })
}