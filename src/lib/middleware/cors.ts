/**
 * CORS middleware for Shopify embedded app
 * Restricts API access to authorized Shopify domains only
 */

export function createCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') || ''

  // Define allowed origins for Shopify embedded apps
  const allowedOrigins = [
    // Shopify admin domains
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/,
    /^https:\/\/admin\.shopify\.com$/,
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.spin\.dev$/,  // Shopify development stores
    // Our app domain
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'https://thunder-text-nine.vercel.app',
    // Development
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
  ].filter(Boolean)

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(origin)
    }
    return pattern === origin
  })

  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔒 CORS check:', { origin, isAllowed })
  }

  if (!isAllowed && origin) {
    // Return restrictive headers for unauthorized origins
    console.warn('⚠️ CORS violation attempt from:', origin)
    return {
      'Access-Control-Allow-Origin': 'null',
      'Access-Control-Allow-Methods': 'OPTIONS',
      'Access-Control-Max-Age': '0'
    }
  }

  // Return permissive headers for allowed origins
  return {
    'Access-Control-Allow-Origin': origin || '*', // Use * only for no-origin requests
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  }
}

/**
 * Handle preflight OPTIONS requests
 */
export function handleCorsPreflightRequest(request: Request): Response {
  const headers = createCorsHeaders(request)

  return new Response(null, {
    status: 204,
    headers
  })
}

/**
 * Apply CORS headers to a response
 */
export function applyCorsHeaders(response: Response, request: Request): Response {
  const corsHeaders = createCorsHeaders(request)

  // Clone response and add CORS headers
  const newHeaders = new Headers(response.headers)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) newHeaders.set(key, value as string)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}