# Thunder Text Authentication Improvement Plan

## Executive Summary

This document outlines critical improvements needed to align Thunder Text's authentication implementation with Shopify's modern embedded app standards. The review identified 6 major gaps that require immediate attention to ensure security, reliability, and compliance.

**Current State**: Partial implementation of token exchange with legacy OAuth patterns still present
**Target State**: Full compliance with Shopify's session token and token exchange authentication
**Timeline**: 4 weeks
**Risk Level**: HIGH - Security vulnerabilities present

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Critical Issues Identified](#critical-issues-identified)
3. [Improvement Roadmap](#improvement-roadmap)
4. [Implementation Details](#implementation-details)
5. [Testing Strategy](#testing-strategy)
6. [Migration Checklist](#migration-checklist)
7. [Success Metrics](#success-metrics)

---

## Current State Assessment

### Architecture Review Summary

| Component | Current Implementation | Compliance Status | Risk Level |
|-----------|----------------------|-------------------|------------|
| Session Token Retrieval | ✅ App Bridge integration | Compliant | Low |
| Token Validation | ⚠️ Basic JWT validation | Partial | HIGH |
| Token Exchange | ✅ Implemented | Compliant | Low |
| CORS Configuration | ❌ Wildcard origins | Non-compliant | CRITICAL |
| Token Refresh | ❌ Not implemented | Missing | Medium |
| Webhook Security | ❌ No HMAC validation | Non-compliant | CRITICAL |
| Error Handling | ⚠️ Inconsistent | Partial | Medium |
| Token Caching | ✅ 23-hour cache | Compliant | Low |

### File Structure Analysis

```
src/
├── app/
│   ├── api/
│   │   ├── auth/                    # ❌ Legacy OAuth (to be removed)
│   │   ├── shopify/
│   │   │   ├── auth/
│   │   │   │   └── token-exchange/  # ✅ Modern token exchange
│   │   │   └── products/
│   │   └── webhooks/                # ⚠️ Missing HMAC validation
│   └── components/
│       └── AppBridgeProvider.tsx    # ✅ Proper App Bridge setup
└── lib/
    ├── shopify-auth.ts              # ⚠️ Needs security improvements
    └── shopify/
        ├── token-exchange.ts        # ✅ Good implementation
        └── token-manager.ts         # ✅ Has caching

```

---

## Critical Issues Identified

### 🔴 Priority 1: Security Vulnerabilities

#### Issue #1: Timing Attack Vulnerability
**Location**: `/src/lib/shopify-auth.ts:144`
**Current Code**:
```typescript
const isValid = calculatedSignature === signature  // ❌ Vulnerable
```
**Impact**: Attackers can potentially forge session tokens through timing analysis
**Severity**: CRITICAL

#### Issue #2: Open CORS Policy
**Location**: `/src/app/api/generate/route.ts:6`
**Current Code**:
```typescript
'Access-Control-Allow-Origin': '*'  // ❌ Too permissive
```
**Impact**: Any website can make requests to your API
**Severity**: CRITICAL

#### Issue #3: Missing Webhook Validation
**Location**: `/src/app/api/webhooks/*`
**Current State**: No HMAC signature verification
**Impact**: Webhook endpoints can be called by anyone
**Severity**: CRITICAL

### 🟡 Priority 2: Architecture Issues

#### Issue #4: Mixed Authentication Patterns
**Location**: Multiple files
**Problem**: Both OAuth flow and token exchange exist simultaneously
**Impact**: Confusion, maintenance burden, potential security gaps
**Severity**: HIGH

#### Issue #5: No Token Refresh Mechanism
**Location**: Token management layer
**Problem**: Online tokens expire after 24 hours without recovery
**Impact**: API calls fail after token expiry
**Severity**: MEDIUM

#### Issue #6: Inconsistent Error Handling
**Location**: Throughout API routes
**Problem**: Different error patterns make debugging difficult
**Impact**: Poor developer experience, harder to maintain
**Severity**: MEDIUM

---

## Improvement Roadmap

### Week 1: Security Hardening (Critical)

#### Day 1-2: Fix Token Validation

**Task 1.1**: Implement timing-safe comparison
```typescript
// File: /src/lib/shopify-auth.ts
import { timingSafeEqual } from 'crypto'

function verifySessionToken(token: string): boolean {
  const [header, payload, signature] = token.split('.')

  // ... existing validation ...

  // Replace direct comparison with timing-safe version
  const expected = Buffer.from(calculatedSignature, 'base64url')
  const received = Buffer.from(signature, 'base64url')

  if (expected.length !== received.length) {
    return false
  }

  return timingSafeEqual(expected, received)
}
```

**Task 1.2**: Add comprehensive token validation
```typescript
interface TokenValidationResult {
  valid: boolean
  error?: string
  payload?: JWTPayload
}

async function validateSessionToken(
  token: string,
  options: ValidationOptions = {}
): Promise<TokenValidationResult> {
  // 1. Check token structure
  const parts = token.split('.')
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format' }
  }

  // 2. Decode and validate payload
  const payload = decodePayload(parts[1])

  // 3. Verify temporal claims
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) {
    return { valid: false, error: 'Token expired' }
  }

  if (payload.nbf && payload.nbf > now) {
    return { valid: false, error: 'Token not yet valid' }
  }

  // 4. Verify audience and issuer
  if (payload.aud !== process.env.SHOPIFY_API_KEY) {
    return { valid: false, error: 'Invalid audience' }
  }

  // 5. Verify signature (timing-safe)
  if (!verifySignature(token)) {
    return { valid: false, error: 'Invalid signature' }
  }

  return { valid: true, payload }
}
```

#### Day 3-4: Fix CORS Configuration

**Task 1.3**: Implement domain-specific CORS
```typescript
// File: /src/lib/middleware/cors.ts
export function createCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') || ''

  // Define allowed origins
  const allowedOrigins = [
    /^https:\/\/[a-zA-Z0-9-]+\.myshopify\.com$/,
    /^https:\/\/admin\.shopify\.com$/,
    process.env.SHOPIFY_APP_URL
  ]

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(origin)
    }
    return pattern === origin
  })

  if (!isAllowed) {
    // Return restrictive headers for unauthorized origins
    return {
      'Access-Control-Allow-Origin': 'null',
      'Access-Control-Allow-Methods': 'OPTIONS',
      'Access-Control-Max-Age': '0'
    }
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  }
}
```

#### Day 5: Add Webhook Security

**Task 1.4**: Implement HMAC validation middleware
```typescript
// File: /src/lib/middleware/webhook-validation.ts
import { createHmac, timingSafeEqual } from 'crypto'

export async function validateWebhook(
  request: Request,
  secret: string
): Promise<{ valid: boolean; body?: string; error?: string }> {
  // Get HMAC header
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
  if (!hmacHeader) {
    return { valid: false, error: 'Missing HMAC header' }
  }

  // Get raw body
  const body = await request.text()

  // Calculate expected HMAC
  const hash = createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  // Timing-safe comparison
  const expected = Buffer.from(hash, 'base64')
  const received = Buffer.from(hmacHeader, 'base64')

  if (expected.length !== received.length) {
    return { valid: false, error: 'Invalid HMAC length' }
  }

  const valid = timingSafeEqual(expected, received)

  if (!valid) {
    return { valid: false, error: 'Invalid HMAC signature' }
  }

  return { valid: true, body }
}

// Usage in webhook route
export async function POST(request: Request) {
  const validation = await validateWebhook(
    request,
    process.env.SHOPIFY_WEBHOOK_SECRET!
  )

  if (!validation.valid) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Process webhook with validation.body
  const webhookData = JSON.parse(validation.body!)
  // ... handle webhook
}
```

### Week 2: Architecture Cleanup

#### Day 6-7: Remove Legacy OAuth

**Task 2.1**: Delete legacy files
```bash
# Files to remove
rm -rf src/app/api/auth/route.ts
rm -rf src/app/api/auth/callback/
```

**Task 2.2**: Update authentication flow
```typescript
// File: /src/lib/auth/unified-auth.ts
export class ShopifyAuth {
  private tokenCache = new Map<string, CachedToken>()

  async authenticate(request: Request): Promise<AuthSession> {
    // 1. Extract session token
    const sessionToken = this.extractSessionToken(request)
    if (!sessionToken) {
      throw new AuthError('Missing session token', 'NO_SESSION_TOKEN')
    }

    // 2. Validate session token
    const validation = await validateSessionToken(sessionToken)
    if (!validation.valid) {
      throw new AuthError(validation.error!, 'INVALID_SESSION_TOKEN')
    }

    // 3. Get or exchange for access token
    const shop = validation.payload!.dest.replace('https://', '')
    const accessToken = await this.getOrExchangeToken(shop, sessionToken)

    // 4. Return authenticated session
    return {
      shop,
      accessToken,
      userId: validation.payload!.sub,
      scopes: validation.payload!.scope
    }
  }

  private async getOrExchangeToken(
    shop: string,
    sessionToken: string
  ): Promise<string> {
    // Check cache first
    const cached = this.tokenCache.get(shop)
    if (cached && !this.isExpired(cached)) {
      return cached.accessToken
    }

    // Exchange for new token
    const response = await this.exchangeToken(shop, sessionToken)

    // Cache the token
    this.cacheToken(shop, response)

    return response.access_token
  }
}
```

#### Day 8-10: Centralize Authentication

**Task 2.3**: Create authentication middleware
```typescript
// File: /src/lib/middleware/auth.ts
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const auth = new ShopifyAuth()
      const session = await auth.authenticate(request)

      // Create authenticated request
      const authRequest = Object.assign(request, {
        shopifySession: session
      }) as AuthenticatedRequest

      return handler(authRequest)
    } catch (error) {
      if (error instanceof AuthError) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Retry-Invalid-Session-Request': '1'
            }
          }
        )
      }

      // Log unexpected errors
      console.error('Authentication error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

// Usage in API routes
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const { shop, accessToken } = req.shopifySession
  // Your authenticated logic here
})
```

### Week 3: Reliability Improvements

#### Day 11-12: Implement Token Refresh

**Task 3.1**: Add automatic token refresh
```typescript
// File: /src/lib/auth/token-refresh.ts
export class TokenRefreshManager {
  private refreshTimers = new Map<string, NodeJS.Timeout>()

  scheduleRefresh(shop: string, expiresIn: number) {
    // Clear existing timer
    this.clearRefresh(shop)

    // Schedule refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000

    const timer = setTimeout(async () => {
      try {
        await this.refreshToken(shop)
      } catch (error) {
        console.error(`Failed to refresh token for ${shop}:`, error)
        // Retry with exponential backoff
        this.retryRefresh(shop, 1)
      }
    }, refreshTime)

    this.refreshTimers.set(shop, timer)
  }

  private async refreshToken(shop: string) {
    // Get fresh session token from App Bridge
    const sessionToken = await this.getSessionToken()

    // Exchange for new access token
    const response = await tokenExchange({
      shop,
      sessionToken,
      requestedTokenType: 'online'
    })

    // Update cache and database
    await this.updateToken(shop, response)

    // Schedule next refresh
    this.scheduleRefresh(shop, response.expires_in)
  }

  private retryRefresh(shop: string, attempt: number) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000)

    setTimeout(async () => {
      try {
        await this.refreshToken(shop)
      } catch (error) {
        if (attempt < 5) {
          this.retryRefresh(shop, attempt + 1)
        } else {
          console.error(`Max retries reached for ${shop}`)
        }
      }
    }, delay)
  }

  clearRefresh(shop: string) {
    const timer = this.refreshTimers.get(shop)
    if (timer) {
      clearTimeout(timer)
      this.refreshTimers.delete(shop)
    }
  }
}
```

#### Day 13-14: Add Request Retry Logic

**Task 3.2**: Implement intelligent retry mechanism
```typescript
// File: /src/lib/api/retry-client.ts
interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  retryOn?: number[]
  onRetry?: (attempt: number, error: any) => void
}

export class RetryableAPIClient {
  constructor(
    private baseURL: string,
    private getToken: () => Promise<string>,
    private options: RetryOptions = {}
  ) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      retryOn: [401, 429, 500, 502, 503, 504],
      ...options
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt = 0
  ): Promise<T> {
    try {
      // Get fresh token
      const token = await this.getToken()

      // Make request
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      // Check if we should retry
      if (
        !response.ok &&
        this.options.retryOn!.includes(response.status) &&
        attempt < this.options.maxRetries!
      ) {
        // Call retry callback
        this.options.onRetry?.(attempt + 1, response)

        // Calculate delay with exponential backoff
        const delay = this.options.retryDelay! * Math.pow(2, attempt)
        await this.sleep(delay)

        // Retry request
        return this.request<T>(endpoint, options, attempt + 1)
      }

      if (!response.ok) {
        throw new APIError(response.statusText, response.status)
      }

      return response.json()
    } catch (error) {
      // Network errors - retry if attempts remain
      if (attempt < this.options.maxRetries!) {
        this.options.onRetry?.(attempt + 1, error)

        const delay = this.options.retryDelay! * Math.pow(2, attempt)
        await this.sleep(delay)

        return this.request<T>(endpoint, options, attempt + 1)
      }

      throw error
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Usage
const client = new RetryableAPIClient(
  'https://shop.myshopify.com/admin/api/2025-01',
  async () => getSessionToken(),
  {
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error)
    }
  }
)
```

### Week 4: Monitoring & Testing

#### Day 15-16: Add Monitoring

**Task 4.1**: Implement authentication metrics
```typescript
// File: /src/lib/monitoring/auth-metrics.ts
export class AuthMetrics {
  private metrics = {
    tokenExchangeAttempts: 0,
    tokenExchangeSuccesses: 0,
    tokenExchangeFailures: 0,
    tokenValidationAttempts: 0,
    tokenValidationFailures: 0,
    tokenRefreshAttempts: 0,
    tokenRefreshSuccesses: 0,
    tokenRefreshFailures: 0,
    cacheHits: 0,
    cacheMisses: 0,
    webhookValidationAttempts: 0,
    webhookValidationFailures: 0
  }

  increment(metric: keyof typeof this.metrics) {
    this.metrics[metric]++

    // Log every 100 events
    const total = Object.values(this.metrics).reduce((a, b) => a + b, 0)
    if (total % 100 === 0) {
      this.flush()
    }
  }

  async flush() {
    // Send to monitoring service
    await fetch(process.env.MONITORING_ENDPOINT!, {
      method: 'POST',
      body: JSON.stringify({
        service: 'thunder-text',
        type: 'auth-metrics',
        timestamp: new Date().toISOString(),
        metrics: this.metrics
      })
    })

    console.log('📊 Auth Metrics:', this.metrics)
  }

  getMetrics() {
    return { ...this.metrics }
  }
}

// Global instance
export const authMetrics = new AuthMetrics()
```

**Task 4.2**: Add structured logging
```typescript
// File: /src/lib/logging/auth-logger.ts
export class AuthLogger {
  private context: Record<string, any> = {}

  setContext(context: Record<string, any>) {
    this.context = { ...this.context, ...context }
  }

  info(message: string, data?: Record<string, any>) {
    this.log('INFO', message, data)
  }

  warn(message: string, data?: Record<string, any>) {
    this.log('WARN', message, data)
  }

  error(message: string, error?: Error, data?: Record<string, any>) {
    this.log('ERROR', message, {
      ...data,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      }
    })
  }

  private log(
    level: string,
    message: string,
    data?: Record<string, any>
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      data,
      environment: process.env.NODE_ENV
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level}] ${message}`, data)
    }

    // Send to logging service in production
    if (process.env.NODE_ENV === 'production') {
      // Async send to avoid blocking
      this.sendToLoggingService(logEntry).catch(console.error)
    }
  }

  private async sendToLoggingService(entry: any) {
    // Implement your logging service integration
    // e.g., Datadog, LogRocket, Sentry
  }
}
```

#### Day 17-20: Comprehensive Testing

**Task 4.3**: Create test suite
```typescript
// File: /src/__tests__/auth/token-validation.test.ts
describe('Token Validation', () => {
  it('should reject expired tokens', async () => {
    const expiredToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) - 100
    })

    const result = await validateSessionToken(expiredToken)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token expired')
  })

  it('should reject tokens with invalid signature', async () => {
    const token = createMockToken({})
    const tamperedToken = token.slice(0, -1) + 'X'

    const result = await validateSessionToken(tamperedToken)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid signature')
  })

  it('should use timing-safe comparison', async () => {
    // Test that comparison takes consistent time
    const token1 = createMockToken({})
    const token2 = token1.slice(0, -10) + 'XXXXXXXXXX'

    const start1 = process.hrtime.bigint()
    await validateSessionToken(token1)
    const end1 = process.hrtime.bigint()

    const start2 = process.hrtime.bigint()
    await validateSessionToken(token2)
    const end2 = process.hrtime.bigint()

    const time1 = Number(end1 - start1)
    const time2 = Number(end2 - start2)

    // Times should be within 10% of each other
    expect(Math.abs(time1 - time2) / time1).toBeLessThan(0.1)
  })
})

// File: /src/__tests__/auth/token-exchange.test.ts
describe('Token Exchange', () => {
  it('should exchange session token for access token', async () => {
    const sessionToken = await getValidSessionToken()

    const response = await exchangeToken({
      shop: 'test-shop.myshopify.com',
      sessionToken,
      clientId: process.env.SHOPIFY_API_KEY!,
      clientSecret: process.env.SHOPIFY_API_SECRET!
    })

    expect(response.access_token).toBeDefined()
    expect(response.scope).toBeDefined()
  })

  it('should cache tokens appropriately', async () => {
    const shop = 'test-shop.myshopify.com'
    const token = 'test-token'

    setCachedToken(shop, token)

    const cached = getCachedToken(shop)
    expect(cached).toBe(token)

    // Fast-forward 24 hours
    jest.advanceTimersByTime(24 * 60 * 60 * 1000)

    const expired = getCachedToken(shop)
    expect(expired).toBeNull()
  })
})

// File: /src/__tests__/auth/webhook-validation.test.ts
describe('Webhook Validation', () => {
  it('should validate legitimate webhooks', async () => {
    const body = JSON.stringify({ shop: 'test.myshopify.com' })
    const secret = 'webhook-secret'
    const hmac = createHmac('sha256', secret)
      .update(body)
      .digest('base64')

    const request = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': hmac
      },
      body
    })

    const result = await validateWebhook(request, secret)

    expect(result.valid).toBe(true)
    expect(result.body).toBe(body)
  })

  it('should reject webhooks with invalid HMAC', async () => {
    const request = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': 'invalid-hmac'
      },
      body: JSON.stringify({ shop: 'test.myshopify.com' })
    })

    const result = await validateWebhook(request, 'webhook-secret')

    expect(result.valid).toBe(false)
  })
})
```

---

## Testing Strategy

### Test Coverage Requirements

| Component | Target Coverage | Priority | Test Types |
|-----------|----------------|----------|------------|
| Token Validation | 100% | CRITICAL | Unit, Security |
| Token Exchange | 95% | HIGH | Unit, Integration |
| CORS Middleware | 100% | CRITICAL | Unit, Security |
| Webhook Validation | 100% | CRITICAL | Unit, Security |
| Retry Logic | 90% | MEDIUM | Unit, Integration |
| Token Refresh | 90% | MEDIUM | Unit, Integration |
| Error Handling | 85% | LOW | Unit |

### E2E Test Scenarios

```typescript
// File: /src/__tests__/e2e/auth-flow.test.ts
describe('E2E Authentication Flow', () => {
  it('should complete full authentication flow', async () => {
    // 1. Initialize App Bridge
    const app = await initializeAppBridge()

    // 2. Get session token
    const sessionToken = await app.idToken()
    expect(sessionToken).toBeDefined()

    // 3. Make authenticated request
    const response = await fetch('/api/shopify/products', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    })

    expect(response.ok).toBe(true)

    // 4. Verify token exchange happened
    const data = await response.json()
    expect(data.products).toBeDefined()
  })

  it('should handle token expiry gracefully', async () => {
    // 1. Get initial token
    const token1 = await getSessionToken()

    // 2. Wait for expiry
    await sleep(61000) // 61 seconds

    // 3. Should get new token automatically
    const token2 = await getSessionToken()

    expect(token2).not.toBe(token1)

    // 4. Request should still work
    const response = await makeAuthenticatedRequest('/api/test')
    expect(response.ok).toBe(true)
  })
})
```

### Security Test Scenarios

```bash
# Security testing script
#!/bin/bash

# Test CORS restrictions
echo "Testing CORS from unauthorized domain..."
curl -X POST https://thunder-text.vercel.app/api/generate \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -v

# Test webhook validation
echo "Testing webhook with invalid HMAC..."
curl -X POST https://thunder-text.vercel.app/api/webhooks/app-uninstalled \
  -H "X-Shopify-Hmac-Sha256: invalid-hmac" \
  -H "Content-Type: application/json" \
  -d '{"shop_domain": "test.myshopify.com"}' \
  -v

# Test timing attack resistance
echo "Testing timing attack resistance..."
node scripts/timing-attack-test.js
```

---

## Migration Checklist

### Pre-Migration

- [ ] Back up current authentication configuration
- [ ] Document all API endpoints using authentication
- [ ] Create rollback plan
- [ ] Set up monitoring for auth metrics
- [ ] Prepare incident response plan

### Phase 1: Security (Week 1)

- [ ] Implement timing-safe token validation
- [ ] Fix CORS configuration on all endpoints
- [ ] Add webhook HMAC validation
- [ ] Deploy to staging environment
- [ ] Run security test suite
- [ ] Monitor error rates for 24 hours

### Phase 2: Architecture (Week 2)

- [ ] Remove legacy OAuth endpoints
- [ ] Centralize authentication logic
- [ ] Update all API routes to use new middleware
- [ ] Test all authenticated endpoints
- [ ] Update documentation
- [ ] Deploy to production with feature flag

### Phase 3: Reliability (Week 3)

- [ ] Implement token refresh mechanism
- [ ] Add retry logic to API client
- [ ] Test token expiry scenarios
- [ ] Monitor token refresh success rate
- [ ] Update error handling across app
- [ ] Enable for 10% of traffic

### Phase 4: Monitoring (Week 4)

- [ ] Deploy authentication metrics
- [ ] Set up alerting thresholds
- [ ] Create performance dashboards
- [ ] Document troubleshooting guide
- [ ] Train support team
- [ ] Enable for 100% of traffic

### Post-Migration

- [ ] Monitor metrics for 1 week
- [ ] Address any issues found
- [ ] Update documentation
- [ ] Remove feature flags
- [ ] Archive old code
- [ ] Conduct retrospective

---

## Success Metrics

### Security Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Invalid token attempts | Unknown | <1% | Auth metrics |
| HMAC validation failures | N/A | <0.1% | Webhook logs |
| CORS violations | Unknown | <0.1% | Security logs |
| Timing attack resistance | None | 100% | Security audit |

### Reliability Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Auth success rate | ~95% | >99.5% | API metrics |
| Token refresh success | N/A | >99% | Auth metrics |
| API retry success | None | >95% | Client metrics |
| Avg auth latency | Unknown | <100ms | Performance monitoring |

### Business Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| User session drops | Unknown | <0.5% | Analytics |
| Support tickets (auth) | 5/week | <1/week | Support system |
| App review rating | 4.2 | >4.5 | Shopify App Store |
| Shopify compliance | Partial | 100% | Shopify audit |

---

## Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Token validation breaks existing flows | Medium | High | Feature flag rollout |
| CORS changes block legitimate requests | Low | High | Gradual rollout with monitoring |
| Performance degradation | Low | Medium | Load testing before deployment |
| Token refresh causes rate limits | Medium | Medium | Implement backoff strategy |

### Rollback Plan

```bash
# Quick rollback script
#!/bin/bash

# 1. Revert to previous version
git revert --no-commit HEAD~1
git commit -m "Rollback: Authentication changes"

# 2. Deploy immediately
npm run deploy:emergency

# 3. Clear caches
npm run cache:clear

# 4. Notify team
./scripts/notify-rollback.sh "Authentication rollback completed"
```

---

## Appendix A: Environment Variables

```env
# Required for authentication
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
SHOPIFY_APP_URL=https://thunder-text-nine.vercel.app

# Token management
TOKEN_CACHE_DURATION=82800000  # 23 hours in ms
TOKEN_REFRESH_BUFFER=300000    # 5 minutes in ms

# Monitoring (optional)
MONITORING_ENDPOINT=https://your-monitoring-service.com/metrics
LOG_LEVEL=info

# Feature flags
ENABLE_NEW_AUTH=false
ENABLE_TOKEN_REFRESH=false
ENABLE_RETRY_LOGIC=false
```

---

## Appendix B: Error Codes

| Code | Description | User Action | Dev Action |
|------|-------------|-------------|------------|
| NO_SESSION_TOKEN | Missing session token | Reload the app | Check App Bridge |
| INVALID_SESSION_TOKEN | Token validation failed | Reload the app | Check token format |
| SESSION_TOKEN_EXPIRED | Token past expiry time | Get new token | Automatic retry |
| INVALID_SIGNATURE | HMAC verification failed | Reload the app | Check client secret |
| TOKEN_EXCHANGE_FAILED | Could not get access token | Retry request | Check credentials |
| WEBHOOK_INVALID_HMAC | Webhook signature invalid | N/A | Check webhook secret |
| CORS_VIOLATION | Request from unauthorized origin | N/A | Check origin domain |

---

## Appendix C: Migration Communication

### Stakeholder Communication

**Email Template:**
```
Subject: Thunder Text Authentication Upgrade - Action Required

Dear Team,

We are upgrading Thunder Text's authentication system to improve security and reliability.

Timeline: [Start Date] - [End Date]
Impact: Minimal - Feature flags will ensure gradual rollout
Action Required: Monitor error rates during rollout week

Key Improvements:
- Enhanced security with timing-safe validations
- Automatic token refresh (no more expired token errors)
- Better error messages and retry logic
- Full Shopify compliance

Please review the documentation at: [Doc Link]

Contact: [Your Name] for questions
```

### Customer Communication

**In-App Notification:**
```
We're upgrading our security!

You might need to re-authenticate once during the next week.
This one-time inconvenience will provide you with:
✓ Faster, more reliable connections
✓ Enhanced security
✓ Fewer authentication errors

No action needed - the app will guide you if required.
```

---

## Document Version

- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Author**: Senior Engineering Team
- **Review Status**: Ready for Implementation
- **Next Review**: Post Week 1 Implementation

---

*This document is a living guide and will be updated as implementation progresses.*