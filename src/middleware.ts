import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname

  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()

    // Get origin from request
    const origin = request.headers.get('origin') || ''
    const referer = request.headers.get('referer') || ''

    // Check if it's a Shopify embedded request
    const isShopifyRequest = origin.includes('.myshopify.com') ||
                           origin.includes('admin.shopify.com') ||
                           referer.includes('.myshopify.com') ||
                           referer.includes('admin.shopify.com') ||
                           referer.includes('.spin.dev') ||
                           referer.includes('shopify.com')

    // For Shopify embedded apps, we need very permissive CORS
    // Always allow * for API routes to handle embedded context
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Shopify-Access-Token')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers })
    }

    return response
  }

  // Handle embedded app pages - include all possible routes
  if (pathname === '/' ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/embed') ||
      pathname.startsWith('/debug-token') ||
      pathname.startsWith('/create') ||
      pathname.startsWith('/products')) {
    const response = NextResponse.next()

    // Set frame-ancestors to allow embedding in Shopify admin
    // Include all possible Shopify domains
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com https://*.spin.dev;"
    )

    // Remove X-Frame-Options to allow embedding
    response.headers.delete('X-Frame-Options')

    // Add additional headers for embedding
    response.headers.set('X-Content-Type-Options', 'nosniff')

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/',
    '/dashboard/:path*',
    '/settings/:path*',
    '/create/:path*',
    '/products/:path*',
    '/debug-token/:path*',
    '/embed/:path*'
  ]
}