/**
 * Debug Endpoint Protection Middleware
 *
 * Ensures debug endpoints are completely disabled in production
 * and require secure token authentication in development.
 *
 * Usage in debug routes:
 * ```typescript
 * import { protectDebugEndpoint } from '@/lib/middleware/debug-protection'
 *
 * export async function GET(request: NextRequest) {
 *   const authCheck = protectDebugEndpoint(request)
 *   if (authCheck) return authCheck // Returns 404 in prod or 401 if unauthorized
 *
 *   // Your debug endpoint logic here
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Protect debug endpoints from production access
 *
 * @param request - Next.js request object
 * @returns NextResponse if access denied, null if access granted
 */
export function protectDebugEndpoint(request: NextRequest): NextResponse | null {
  // SECURITY: Completely disable all debug endpoints in production
  if (process.env.NODE_ENV === 'production') {
    // Return 404 instead of 401 to not reveal endpoint existence
    return new NextResponse('Not Found', { status: 404 })
  }

  // In development, require secure debug token
  const debugToken = process.env.DEBUG_SECRET_TOKEN || 'dev-only-insecure-token'
  const providedToken = request.headers.get('x-debug-token')

  if (providedToken !== debugToken) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Valid debug token required. Set DEBUG_SECRET_TOKEN environment variable.',
      },
      { status: 401 }
    )
  }

  // Access granted
  return null
}

/**
 * Log debug endpoint access for security monitoring
 */
export function logDebugAccess(endpoint: string, request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    console.log(`[DEBUG ACCESS] ${endpoint}`, {
      ip,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    })
  }
}
