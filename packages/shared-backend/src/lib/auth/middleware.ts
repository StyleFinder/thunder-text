/**
 * API Middleware for App-Scoped Authorization
 *
 * Protects API routes by requiring specific app subscriptions.
 * Use this middleware to ensure users can only access their subscribed apps.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, hasAppAccess, type JWTClaims, type AppName } from './jwt'

/**
 * Standard API error response
 */
export interface APIError {
  error: string
  code: string
  details?: any
}

/**
 * Extract JWT token from request headers
 *
 * Supports:
 * - Authorization: Bearer <token>
 * - Cookie: token=<token>
 */
function extractToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try cookie fallback
  const cookieToken = request.cookies.get('token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

/**
 * Require authentication - any valid JWT
 *
 * @returns Middleware function that validates JWT and adds claims to request
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const claims = await requireAuth(request)
 *   if (!claims) {
 *     return NextResponse.json(
 *       { error: 'Authentication required' },
 *       { status: 401 }
 *     )
 *   }
 *   // ... use claims
 * }
 */
export async function requireAuth(
  request: NextRequest
): Promise<JWTClaims | null> {
  const token = extractToken(request)

  if (!token) {
    return null
  }

  const claims = verifyJWT(token)
  return claims
}

/**
 * Require specific app subscription
 *
 * @param appName - App that user must have access to
 * @returns Middleware function that validates app access
 *
 * @example
 * // ThunderText API endpoint
 * export async function POST(request: NextRequest) {
 *   const claims = await requireApp('thundertext')(request)
 *   if (claims instanceof NextResponse) return claims // Error response
 *
 *   // User has ThunderText access
 *   // ... handle request
 * }
 *
 * @example
 * // ACE API endpoint
 * export async function POST(request: NextRequest) {
 *   const claims = await requireApp('ace')(request)
 *   if (claims instanceof NextResponse) return claims
 *
 *   // User has ACE access
 *   // ... handle request
 * }
 */
export function requireApp(appName: AppName) {
  return async (
    request: NextRequest
  ): Promise<JWTClaims | NextResponse> => {
    // First, verify authentication
    const claims = await requireAuth(request)

    if (!claims) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          details: 'Please provide a valid JWT token',
        } as APIError,
        { status: 401 }
      )
    }

    // Check if user has access to requested app
    if (!hasAppAccess(claims, appName)) {
      const appNames: Record<AppName, string> = {
        thundertext: 'ThunderText',
        ace: 'ACE',
        suite: 'Suite',
      }

      return NextResponse.json(
        {
          error: `${appNames[appName]} subscription required`,
          code: 'APP_ACCESS_DENIED',
          details: {
            required_app: appName,
            user_apps: claims.apps,
            subscription_upgrade_url: '/pricing',
          },
        } as APIError,
        { status: 403 }
      )
    }

    // User has access
    return claims
  }
}

/**
 * Require admin role
 *
 * @example
 * export async function DELETE(request: NextRequest) {
 *   const claims = await requireAdmin(request)
 *   if (claims instanceof NextResponse) return claims
 *
 *   // User is admin
 *   // ... handle admin action
 * }
 */
export async function requireAdmin(
  request: NextRequest
): Promise<JWTClaims | NextResponse> {
  const claims = await requireAuth(request)

  if (!claims) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      } as APIError,
      { status: 401 }
    )
  }

  if (claims.role !== 'admin') {
    return NextResponse.json(
      {
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      } as APIError,
      { status: 403 }
    )
  }

  return claims
}

/**
 * Optional authentication - doesn't fail if no token
 *
 * Use this for endpoints that work differently for authenticated vs anonymous users
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const claims = await optionalAuth(request)
 *
 *   if (claims) {
 *     // User is logged in - return personalized data
 *   } else {
 *     // Anonymous user - return public data
 *   }
 * }
 */
export async function optionalAuth(
  request: NextRequest
): Promise<JWTClaims | null> {
  const token = extractToken(request)
  if (!token) return null

  return verifyJWT(token)
}

/**
 * Rate limiting helper - check if user can make request
 *
 * @param claims - JWT claims
 * @param endpoint - API endpoint being accessed
 * @returns True if rate limit allows request
 *
 * @example
 * const claims = await requireApp('thundertext')(request)
 * if (claims instanceof NextResponse) return claims
 *
 * if (!checkRateLimit(claims, '/api/generate')) {
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
 * }
 */
export function checkRateLimit(
  claims: JWTClaims,
  endpoint: string
): boolean {
  // TODO: Implement Redis-based rate limiting in Phase 3
  // For now, return true (no rate limiting)
  return true
}
