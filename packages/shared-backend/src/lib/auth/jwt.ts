/**
 * JWT Authentication with App-Scoped Claims
 *
 * Critical security component for ThunderText/ACE separation.
 * Each JWT token includes which apps the user has access to.
 */

import jwt from 'jsonwebtoken'

// JWT Configuration
const JWT_SECRET = (process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET) as string
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or NEXTAUTH_SECRET must be set')
}

const JWT_EXPIRATION = '7d' // 7 days

// Supported apps in the platform
export type AppName = 'thundertext' | 'ace' | 'suite'

/**
 * JWT Claims Structure
 *
 * Standard claims:
 * - sub: user/shop ID
 * - iat: issued at timestamp
 * - exp: expiration timestamp
 *
 * Custom claims:
 * - apps: array of apps user has access to
 * - shopId: Shopify shop ID (if applicable)
 * - role: user role (admin, user)
 */
export interface JWTClaims {
  sub: string                    // User/Shop ID
  apps: AppName[]                // Apps user has access to
  shopId?: string                // Shopify shop ID
  role?: 'admin' | 'user'        // User role
  iat: number                    // Issued at (Unix timestamp)
  exp: number                    // Expires at (Unix timestamp)
}

/**
 * Generate JWT token with app-scoped claims
 *
 * @param userId - User or shop ID
 * @param apps - Array of apps user has access to
 * @param options - Additional claims (shopId, role)
 * @returns Signed JWT token
 *
 * @example
 * // User with ThunderText only
 * const token = createJWT('user-123', ['thundertext'])
 *
 * @example
 * // User with both apps (suite subscription)
 * const token = createJWT('user-456', ['thundertext', 'ace'])
 *
 * @example
 * // Admin with all apps
 * const token = createJWT('admin-789', ['suite'], { role: 'admin' })
 */
export function createJWT(
  userId: string,
  apps: AppName[],
  options?: {
    shopId?: string
    role?: 'admin' | 'user'
    expiresIn?: string
  }
): string {
  const claims: JWTClaims = {
    sub: userId,
    apps: apps,
    shopId: options?.shopId,
    role: options?.role || 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  }

  return jwt.sign(claims, JWT_SECRET)
}

/**
 * Verify and decode JWT token
 *
 * @param token - JWT token string
 * @returns Decoded claims or null if invalid
 *
 * @example
 * const claims = verifyJWT(req.headers.authorization?.replace('Bearer ', ''))
 * if (!claims) {
 *   return res.status(401).json({ error: 'Invalid token' })
 * }
 */
export function verifyJWT(token: string): JWTClaims | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    // Validate that decoded has required JWTClaims shape
    if (typeof decoded === 'object' && decoded !== null && 'apps' in decoded) {
      return decoded as JWTClaims
    }
    return null
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Check if JWT has access to specific app
 *
 * @param claims - Decoded JWT claims
 * @param appName - App to check access for
 * @returns True if user has access to app
 *
 * @example
 * const claims = verifyJWT(token)
 * if (!hasAppAccess(claims, 'thundertext')) {
 *   return res.status(403).json({ error: 'ThunderText subscription required' })
 * }
 */
export function hasAppAccess(
  claims: JWTClaims | null,
  appName: AppName
): boolean {
  if (!claims) return false

  // Suite subscription grants access to all apps
  if (claims.apps.includes('suite')) return true

  // Otherwise check if specific app is in the list
  return claims.apps.includes(appName)
}

/**
 * Get user's subscription tier based on apps
 *
 * @param claims - Decoded JWT claims
 * @returns Subscription tier
 *
 * @example
 * const tier = getSubscriptionTier(claims)
 * // Returns: 'suite' | 'thundertext' | 'ace' | 'free'
 */
export function getSubscriptionTier(
  claims: JWTClaims | null
): 'suite' | 'thundertext' | 'ace' | 'free' {
  if (!claims) return 'free'

  if (claims.apps.includes('suite')) return 'suite'
  if (claims.apps.includes('thundertext') && claims.apps.includes('ace')) {
    return 'suite' // Both apps = suite
  }
  if (claims.apps.includes('thundertext')) return 'thundertext'
  if (claims.apps.includes('ace')) return 'ace'

  return 'free'
}

/**
 * Refresh JWT token (extend expiration)
 *
 * @param token - Current JWT token
 * @returns New token with extended expiration or null if invalid
 */
export function refreshJWT(token: string): string | null {
  const claims = verifyJWT(token)
  if (!claims) return null

  // Create new token with same claims but new expiration
  return createJWT(claims.sub, claims.apps, {
    shopId: claims.shopId,
    role: claims.role,
  })
}
