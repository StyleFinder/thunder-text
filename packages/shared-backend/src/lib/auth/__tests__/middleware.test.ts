/**
 * API Middleware Tests
 * Tests app-scoped middleware for protecting API routes
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuth,
  requireApp,
  requireAdmin,
  optionalAuth,
} from '../middleware'
import { createJWT } from '../jwt'

describe('API Middleware', () => {
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jwt-testing'
  })

  // Helper to create mock request with Authorization header
  function createMockRequest(token?: string): NextRequest {
    const headers = new Headers()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    return new NextRequest('http://localhost:3000/api/test', {
      headers,
    })
  }

  describe('requireAuth', () => {
    it('should return claims for valid JWT', async () => {
      const token = createJWT('user-123', ['thundertext'])
      const request = createMockRequest(token)

      const claims = await requireAuth(request)

      expect(claims).toBeDefined()
      expect(claims?.sub).toBe('user-123')
      expect(claims?.apps).toEqual(['thundertext'])
    })

    it('should return null for missing Authorization header', async () => {
      const request = createMockRequest()

      const claims = await requireAuth(request)

      expect(claims).toBeNull()
    })

    it('should return null for invalid JWT', async () => {
      const request = createMockRequest('invalid.jwt.token')

      const claims = await requireAuth(request)

      expect(claims).toBeNull()
    })

    it('should extract token from Bearer scheme', async () => {
      const token = createJWT('user-bearer', ['ace'])
      const request = createMockRequest(token)

      const claims = await requireAuth(request)

      expect(claims).toBeDefined()
      expect(claims?.sub).toBe('user-bearer')
    })
  })

  describe('requireApp', () => {
    it('should allow access with correct app subscription', async () => {
      const token = createJWT('user-tt', ['thundertext'])
      const request = createMockRequest(token)

      const middleware = requireApp('thundertext')
      const result = await middleware(request)

      // Should return claims, not NextResponse
      expect(result).not.toBeInstanceOf(NextResponse)
      expect((result as any).sub).toBe('user-tt')
    })

    it('should deny access without authentication', async () => {
      const request = createMockRequest()

      const middleware = requireApp('thundertext')
      const result = await middleware(request)

      // Should return 401 Unauthorized
      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe('Authentication required')
      expect(json.code).toBe('AUTH_REQUIRED')
    })

    it('should deny access to ACE without ACE subscription', async () => {
      const token = createJWT('user-tt', ['thundertext'])
      const request = createMockRequest(token)

      const middleware = requireApp('ace')
      const result = await middleware(request)

      // Should return 403 Forbidden
      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('ACE subscription required') // Match actual error message capitalization
      expect(json.code).toBe('APP_ACCESS_DENIED')
      expect(json.details.required_app).toBe('ace')
      expect(json.details.user_apps).toEqual(['thundertext'])
    })

    it('should allow suite users to access thundertext', async () => {
      const token = createJWT('user-suite', ['suite'])
      const request = createMockRequest(token)

      const middleware = requireApp('thundertext')
      const result = await middleware(request)

      // Should return claims
      expect(result).not.toBeInstanceOf(NextResponse)
      expect((result as any).apps).toEqual(['suite'])
    })

    it('should allow suite users to access ACE', async () => {
      const token = createJWT('user-suite', ['suite'])
      const request = createMockRequest(token)

      const middleware = requireApp('ace')
      const result = await middleware(request)

      // Should return claims
      expect(result).not.toBeInstanceOf(NextResponse)
      expect((result as any).apps).toEqual(['suite'])
    })

    it('should allow users with both subscriptions', async () => {
      const token = createJWT('user-both', ['thundertext', 'ace'])
      const request = createMockRequest(token)

      const middlewareThunderText = requireApp('thundertext')
      const resultThunderText = await middlewareThunderText(request)
      expect(resultThunderText).not.toBeInstanceOf(NextResponse)

      const middlewareACE = requireApp('ace')
      const resultACE = await middlewareACE(request)
      expect(resultACE).not.toBeInstanceOf(NextResponse)
    })
  })

  describe('requireAdmin', () => {
    it('should allow access for admin users', async () => {
      const token = createJWT('admin-123', ['thundertext'], {
        role: 'admin',
      })
      const request = createMockRequest(token)

      const result = await requireAdmin(request)

      // Should return claims
      expect(result).not.toBeInstanceOf(NextResponse)
      expect((result as any).role).toBe('admin')
    })

    it('should deny access for non-admin users', async () => {
      const token = createJWT('user-123', ['thundertext'], {
        role: 'user',
      })
      const request = createMockRequest(token)

      const result = await requireAdmin(request)

      // Should return 403 Forbidden
      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('Admin access required')
      expect(json.code).toBe('ADMIN_REQUIRED')
    })

    it('should deny access without authentication', async () => {
      const request = createMockRequest()

      const result = await requireAdmin(request)

      // Should return 401 Unauthorized
      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(401)
    })
  })

  describe('optionalAuth', () => {
    it('should return claims for authenticated users', async () => {
      const token = createJWT('user-optional', ['thundertext'])
      const request = createMockRequest(token)

      const claims = await optionalAuth(request)

      expect(claims).toBeDefined()
      expect(claims?.sub).toBe('user-optional')
    })

    it('should return null for unauthenticated users', async () => {
      const request = createMockRequest()

      const claims = await optionalAuth(request)

      expect(claims).toBeNull()
    })

    it('should return null for invalid JWT', async () => {
      const request = createMockRequest('invalid.token')

      const claims = await optionalAuth(request)

      expect(claims).toBeNull()
    })
  })

  describe('App Isolation Integration', () => {
    it('ThunderText API endpoint blocks ACE users', async () => {
      const token = createJWT('ace-user', ['ace'])
      const request = createMockRequest(token)

      const middleware = requireApp('thundertext')
      const result = await middleware(request)

      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.details.required_app).toBe('thundertext')
      expect(json.details.user_apps).toEqual(['ace'])
    })

    it('ACE API endpoint blocks ThunderText users', async () => {
      const token = createJWT('tt-user', ['thundertext'])
      const request = createMockRequest(token)

      const middleware = requireApp('ace')
      const result = await middleware(request)

      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.details.required_app).toBe('ace')
      expect(json.details.user_apps).toEqual(['thundertext'])
    })

    it('Suite users can access all app endpoints', async () => {
      const token = createJWT('suite-user', ['suite'])
      const request = createMockRequest(token)

      // Test ThunderText endpoint
      const ttMiddleware = requireApp('thundertext')
      const ttResult = await ttMiddleware(request)
      expect(ttResult).not.toBeInstanceOf(NextResponse)

      // Test ACE endpoint
      const aceMiddleware = requireApp('ace')
      const aceResult = await aceMiddleware(request)
      expect(aceResult).not.toBeInstanceOf(NextResponse)
    })

    it('Admin users with app access can access admin endpoints', async () => {
      const token = createJWT('admin-user', ['thundertext', 'ace'], {
        role: 'admin',
      })
      const request = createMockRequest(token)

      // Should pass admin check
      const adminResult = await requireAdmin(request)
      expect(adminResult).not.toBeInstanceOf(NextResponse)

      // Should pass app checks
      const ttMiddleware = requireApp('thundertext')
      const ttResult = await ttMiddleware(request)
      expect(ttResult).not.toBeInstanceOf(NextResponse)

      const aceMiddleware = requireApp('ace')
      const aceResult = await aceMiddleware(request)
      expect(aceResult).not.toBeInstanceOf(NextResponse)
    })
  })
})
