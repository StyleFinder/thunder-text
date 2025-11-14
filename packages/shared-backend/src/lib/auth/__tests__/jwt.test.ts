/**
 * JWT Authentication Tests
 * Tests app-scoped JWT token creation, verification, and access control
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import {
  createJWT,
  verifyJWT,
  hasAppAccess,
  getSubscriptionTier,
  refreshJWT,
  type JWTClaims,
  type AppName,
} from '../jwt'

describe('JWT Authentication', () => {
  // Mock environment for testing
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jwt-testing'
  })

  describe('createJWT', () => {
    it('should create JWT with thundertext app access', () => {
      const token = createJWT('user-123', ['thundertext'], {
        shopId: 'shop-456',
        role: 'user',
      })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should create JWT with ACE app access', () => {
      const token = createJWT('user-789', ['ace'], {
        shopId: 'shop-abc',
        role: 'user',
      })

      const claims = verifyJWT(token)
      expect(claims).toBeDefined()
      expect(claims?.apps).toEqual(['ace'])
      expect(claims?.sub).toBe('user-789')
      expect(claims?.shopId).toBe('shop-abc')
    })

    it('should create JWT with suite access (both apps)', () => {
      const token = createJWT('user-suite', ['suite'])

      const claims = verifyJWT(token)
      expect(claims).toBeDefined()
      expect(claims?.apps).toEqual(['suite'])
    })

    it('should create JWT with multiple app access', () => {
      const token = createJWT('user-multi', ['thundertext', 'ace'])

      const claims = verifyJWT(token)
      expect(claims).toBeDefined()
      expect(claims?.apps).toContain('thundertext')
      expect(claims?.apps).toContain('ace')
    })

    it('should set default role to user', () => {
      const token = createJWT('user-default', ['thundertext'])

      const claims = verifyJWT(token)
      expect(claims?.role).toBe('user')
    })

    it('should accept admin role', () => {
      const token = createJWT('admin-123', ['thundertext'], {
        role: 'admin',
      })

      const claims = verifyJWT(token)
      expect(claims?.role).toBe('admin')
    })

    it('should set expiration timestamp', () => {
      const token = createJWT('user-exp', ['thundertext'])

      const claims = verifyJWT(token)
      expect(claims?.exp).toBeGreaterThan(claims?.iat!)
      expect(claims?.exp).toBeLessThanOrEqual(
        claims?.iat! + 7 * 24 * 60 * 60 + 1
      ) // 7 days + 1 sec buffer
    })
  })

  describe('verifyJWT', () => {
    it('should verify valid JWT', () => {
      const token = createJWT('user-valid', ['thundertext'])

      const claims = verifyJWT(token)
      expect(claims).toBeDefined()
      expect(claims?.sub).toBe('user-valid')
    })

    it('should return null for invalid JWT', () => {
      const claims = verifyJWT('invalid.jwt.token')
      expect(claims).toBeNull()
    })

    it('should return null for malformed JWT', () => {
      const claims = verifyJWT('not-a-jwt')
      expect(claims).toBeNull()
    })

    it('should return null for empty string', () => {
      const claims = verifyJWT('')
      expect(claims).toBeNull()
    })
  })

  describe('hasAppAccess', () => {
    it('should allow access to thundertext with thundertext subscription', () => {
      const token = createJWT('user-tt', ['thundertext'])
      const claims = verifyJWT(token)

      expect(hasAppAccess(claims, 'thundertext')).toBe(true)
    })

    it('should deny access to ACE with thundertext subscription', () => {
      const token = createJWT('user-tt', ['thundertext'])
      const claims = verifyJWT(token)

      expect(hasAppAccess(claims, 'ace')).toBe(false)
    })

    it('should allow access to ACE with ACE subscription', () => {
      const token = createJWT('user-ace', ['ace'])
      const claims = verifyJWT(token)

      expect(hasAppAccess(claims, 'ace')).toBe(true)
    })

    it('should deny access to thundertext with ACE subscription', () => {
      const token = createJWT('user-ace', ['ace'])
      const claims = verifyJWT(token)

      expect(hasAppAccess(claims, 'thundertext')).toBe(false)
    })

    it('should allow access to both apps with suite subscription', () => {
      const token = createJWT('user-suite', ['suite'])
      const claims = verifyJWT(token)

      expect(hasAppAccess(claims, 'thundertext')).toBe(true)
      expect(hasAppAccess(claims, 'ace')).toBe(true)
      expect(hasAppAccess(claims, 'suite')).toBe(true)
    })

    it('should allow access to both apps with individual subscriptions', () => {
      const token = createJWT('user-both', ['thundertext', 'ace'])
      const claims = verifyJWT(token)

      expect(hasAppAccess(claims, 'thundertext')).toBe(true)
      expect(hasAppAccess(claims, 'ace')).toBe(true)
    })

    it('should return false for null claims', () => {
      expect(hasAppAccess(null, 'thundertext')).toBe(false)
      expect(hasAppAccess(null, 'ace')).toBe(false)
      expect(hasAppAccess(null, 'suite')).toBe(false)
    })
  })

  describe('getSubscriptionTier', () => {
    it('should return "thundertext" for thundertext-only subscription', () => {
      const token = createJWT('user-tt', ['thundertext'])
      const claims = verifyJWT(token)

      expect(getSubscriptionTier(claims)).toBe('thundertext')
    })

    it('should return "ace" for ACE-only subscription', () => {
      const token = createJWT('user-ace', ['ace'])
      const claims = verifyJWT(token)

      expect(getSubscriptionTier(claims)).toBe('ace')
    })

    it('should return "suite" for suite subscription', () => {
      const token = createJWT('user-suite', ['suite'])
      const claims = verifyJWT(token)

      expect(getSubscriptionTier(claims)).toBe('suite')
    })

    it('should return "suite" for both individual subscriptions', () => {
      const token = createJWT('user-both', ['thundertext', 'ace'])
      const claims = verifyJWT(token)

      expect(getSubscriptionTier(claims)).toBe('suite')
    })

    it('should return "free" for null claims', () => {
      expect(getSubscriptionTier(null)).toBe('free')
    })
  })

  describe('refreshJWT', () => {
    it('should create new token with same claims but new timestamps', async () => {
      const originalToken = createJWT('user-refresh', ['thundertext'], {
        shopId: 'shop-123',
        role: 'user',
      })

      // Wait 1 second to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const refreshedToken = refreshJWT(originalToken)
      expect(refreshedToken).toBeDefined()

      const originalClaims = verifyJWT(originalToken)
      const refreshedClaims = verifyJWT(refreshedToken!)

      // Same core claims
      expect(refreshedClaims?.sub).toBe(originalClaims?.sub)
      expect(refreshedClaims?.apps).toEqual(originalClaims?.apps)
      expect(refreshedClaims?.shopId).toBe(originalClaims?.shopId)
      expect(refreshedClaims?.role).toBe(originalClaims?.role)

      // New timestamps
      expect(refreshedClaims?.iat).toBeGreaterThan(originalClaims?.iat!)
      expect(refreshedClaims?.exp).toBeGreaterThan(originalClaims?.exp!)
    })

    it('should return null for invalid token', () => {
      const refreshedToken = refreshJWT('invalid.token.here')
      expect(refreshedToken).toBeNull()
    })
  })

  describe('App Isolation Scenarios', () => {
    it('ThunderText user cannot access ACE data', () => {
      const token = createJWT('thundertext-user', ['thundertext'], {
        shopId: 'shop-123',
      })
      const claims = verifyJWT(token)

      // Can access thundertext
      expect(hasAppAccess(claims, 'thundertext')).toBe(true)

      // Cannot access ace
      expect(hasAppAccess(claims, 'ace')).toBe(false)

      // Tier is thundertext
      expect(getSubscriptionTier(claims)).toBe('thundertext')
    })

    it('ACE user cannot access ThunderText data', () => {
      const token = createJWT('ace-user', ['ace'], {
        shopId: 'shop-456',
      })
      const claims = verifyJWT(token)

      // Can access ace
      expect(hasAppAccess(claims, 'ace')).toBe(true)

      // Cannot access thundertext
      expect(hasAppAccess(claims, 'thundertext')).toBe(false)

      // Tier is ace
      expect(getSubscriptionTier(claims)).toBe('ace')
    })

    it('Suite user can access all app data', () => {
      const token = createJWT('suite-user', ['suite'], {
        shopId: 'shop-789',
      })
      const claims = verifyJWT(token)

      // Can access all apps
      expect(hasAppAccess(claims, 'thundertext')).toBe(true)
      expect(hasAppAccess(claims, 'ace')).toBe(true)
      expect(hasAppAccess(claims, 'suite')).toBe(true)

      // Tier is suite
      expect(getSubscriptionTier(claims)).toBe('suite')
    })

    it('Admin role preserved across apps', () => {
      const token = createJWT('admin-user', ['thundertext', 'ace'], {
        role: 'admin',
      })
      const claims = verifyJWT(token)

      expect(claims?.role).toBe('admin')
      expect(hasAppAccess(claims, 'thundertext')).toBe(true)
      expect(hasAppAccess(claims, 'ace')).toBe(true)
    })
  })
})
