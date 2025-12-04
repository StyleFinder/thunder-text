# Authentication Testing Guide
**Date**: 2025-12-01
**Purpose**: Comprehensive guide to test Shopify authentication flow

## Table of Contents
1. [Manual Testing](#manual-testing)
2. [Automated Testing](#automated-testing)
3. [Integration Testing](#integration-testing)
4. [Security Testing](#security-testing)
5. [Troubleshooting](#troubleshooting)

---

## Manual Testing

### Prerequisites
- Shopify Partner account
- Development store installed with Thunder Text app
- ngrok or similar tunneling service running
- Access to browser DevTools

### Test 1: OAuth Installation Flow

**Purpose**: Verify initial app installation and token exchange

**Steps**:
1. Start local development server:
   ```bash
   npm run dev
   # Server runs on http://localhost:3050
   ```

2. Start ngrok tunnel:
   ```bash
   ngrok http 3050 --domain=thundertext-dev.ngrok.app
   ```

3. Update environment variables:
   ```bash
   SHOPIFY_APP_URL=https://thundertext-dev.ngrok.app
   SHOPIFY_REDIRECT_URI=https://thundertext-dev.ngrok.app/api/auth/shopify
   ```

4. Install app from Partner Dashboard:
   - Go to: https://partners.shopify.com/your-org/apps/your-app-id/test
   - Click "Select store" → Choose development store
   - Click "Install app"

5. **Expected Results**:
   - ✅ Redirected to Shopify OAuth consent screen
   - ✅ After approval, redirected to `/api/auth/shopify/callback`
   - ✅ Token exchange completes successfully
   - ✅ Access token stored in database
   - ✅ Redirected to app home page

6. **Verify in Database**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT
     shop_domain,
     shopify_scopes,
     is_active,
     installed_at
   FROM shops
   WHERE shop_domain = 'your-store.myshopify.com';
   ```

   Expected output:
   ```
   shop_domain              | shopify_scopes | is_active | installed_at
   your-store.myshopify.com | read_products,write_products,... | true | 2025-12-01...
   ```

### Test 2: Session Token Verification

**Purpose**: Verify App Bridge session token generation and verification

**Steps**:
1. Open app in Shopify Admin:
   ```
   https://admin.shopify.com/store/your-store/apps/thunder-text
   ```

2. Open Browser DevTools → Network tab

3. Navigate to any page (e.g., `/enhance`)

4. Inspect API requests:
   - Look for `Authorization: Bearer eyJ...` header
   - Copy the JWT token

5. Decode the token at [jwt.io](https://jwt.io):
   ```json
   {
     "iss": "https://your-store.myshopify.com/admin",
     "dest": "https://your-store.myshopify.com",
     "aud": "your-app-client-id",
     "sub": "user-id",
     "exp": 1733000000,
     "nbf": 1732999940,
     "iat": 1732999940,
     "jti": "session-id",
     "sid": "session-id"
   }
   ```

6. **Verify Fields**:
   - ✅ `iss` matches shop domain
   - ✅ `dest` matches shop domain
   - ✅ `aud` matches `NEXT_PUBLIC_SHOPIFY_API_KEY`
   - ✅ `exp` is ~60 seconds from `iat`

### Test 3: Token Exchange API

**Purpose**: Verify backend token exchange logic

**Steps**:
1. Get a valid session token from DevTools (Test 2, Step 4)

2. Test the token exchange endpoint:
   ```bash
   curl -X POST "http://localhost:3050/api/shopify/auth/token-exchange" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
     -d '{
       "shop": "your-store.myshopify.com",
       "sessionToken": "YOUR_SESSION_TOKEN"
     }'
   ```

3. **Expected Response** (200 OK):
   ```json
   {
     "success": true,
     "message": "Token exchange successful",
     "shop": "your-store.myshopify.com",
     "scope": "read_products,write_products,...",
     "user": {
       "id": 123456,
       "first_name": "John",
       "last_name": "Doe",
       "email": "john@example.com"
     }
   }
   ```

4. **Verify Token Stored**:
   ```sql
   SELECT
     shop_domain,
     shopify_access_token IS NOT NULL as has_token,
     updated_at
   FROM shops
   WHERE shop_domain = 'your-store.myshopify.com';
   ```

### Test 4: Protected API Routes

**Purpose**: Verify authentication is required for API endpoints

**Steps**:
1. Test without authentication:
   ```bash
   curl "http://localhost:3050/api/shopify/products?shop=your-store.myshopify.com"
   ```

   **Expected Response** (401 Unauthorized):
   ```json
   {
     "error": "Unauthorized - no valid access token. Please authenticate via Shopify OAuth."
   }
   ```

2. Test with valid session token:
   ```bash
   curl "http://localhost:3050/api/shopify/products?shop=your-store.myshopify.com" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

   **Expected Response** (200 OK):
   ```json
   {
     "products": [...]
   }
   ```

### Test 5: Token Caching

**Purpose**: Verify in-memory token cache reduces database queries

**Steps**:
1. Enable Supabase query logging (Supabase Dashboard → Logs)

2. Make first API request:
   ```bash
   curl "http://localhost:3050/api/shopify/products?shop=your-store.myshopify.com" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

   **Expected**: Database query to `get_shop_token` RPC

3. Make second API request (within 23 hours):
   ```bash
   curl "http://localhost:3050/api/shopify/products?shop=your-store.myshopify.com" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

   **Expected**: No database query (token served from cache)

4. Check server logs for:
   ```
   💾 Token cached for shop: your-store.myshopify.com
   ```

---

## Automated Testing

### Unit Tests

Create: `src/__tests__/auth/shopify-auth.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import crypto from 'crypto'

/**
 * Unit tests for Shopify authentication
 */
describe('Shopify Authentication', () => {
  const TEST_CLIENT_SECRET = 'test-secret-key-12345'
  const TEST_SHOP = 'test-store.myshopify.com'
  const TEST_CLIENT_ID = 'test-client-id'

  beforeEach(() => {
    // Set up test environment
    process.env.SHOPIFY_API_SECRET = TEST_CLIENT_SECRET
    process.env.NEXT_PUBLIC_SHOPIFY_API_KEY = TEST_CLIENT_ID
  })

  describe('Session Token Verification', () => {
    it('should verify valid session token signature', () => {
      // Create a test JWT token
      const header = Buffer.from(JSON.stringify({
        alg: 'HS256',
        typ: 'JWT'
      })).toString('base64url')

      const payload = Buffer.from(JSON.stringify({
        iss: `https://${TEST_SHOP}/admin`,
        dest: `https://${TEST_SHOP}`,
        aud: TEST_CLIENT_ID,
        sub: '1',
        exp: Math.floor(Date.now() / 1000) + 60,
        nbf: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        jti: '4f4997a5-ab92-421e-a954-b6680e9d2485',
        sid: 'session-id'
      })).toString('base64url')

      // Sign with HMAC-SHA256
      const signingInput = `${header}.${payload}`
      const hmac = crypto.createHmac('sha256', TEST_CLIENT_SECRET)
      hmac.update(signingInput)
      const signature = hmac.digest('base64url')

      const sessionToken = `${header}.${payload}.${signature}`

      // Import and test verification function
      const { verifySessionToken } = require('@/lib/shopify-auth')
      const isValid = verifySessionToken(sessionToken)

      expect(isValid).toBe(true)
    })

    it('should reject session token with invalid signature', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
      const payload = Buffer.from(JSON.stringify({
        iss: `https://${TEST_SHOP}/admin`,
        dest: `https://${TEST_SHOP}`,
        aud: TEST_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 60
      })).toString('base64url')

      // Invalid signature
      const invalidSignature = 'invalid-signature'
      const sessionToken = `${header}.${payload}.${invalidSignature}`

      const { verifySessionToken } = require('@/lib/shopify-auth')
      const isValid = verifySessionToken(sessionToken)

      expect(isValid).toBe(false)
    })

    it('should reject expired session token', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')

      // Token expired 1 hour ago
      const payload = Buffer.from(JSON.stringify({
        iss: `https://${TEST_SHOP}/admin`,
        dest: `https://${TEST_SHOP}`,
        aud: TEST_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 3660
      })).toString('base64url')

      const signingInput = `${header}.${payload}`
      const hmac = crypto.createHmac('sha256', TEST_CLIENT_SECRET)
      hmac.update(signingInput)
      const signature = hmac.digest('base64url')

      const sessionToken = `${header}.${payload}.${signature}`

      const { authenticateRequest } = require('@/lib/shopify-auth')

      // Create mock request
      const request = new Request('http://localhost:3050/api/test', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      expect(async () => {
        await authenticateRequest(request, { shop: TEST_SHOP })
      }).rejects.toThrow('Session token expired')
    })

    it('should validate required JWT fields', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')

      // Missing required fields
      const payload = Buffer.from(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 60
        // Missing: iss, dest, aud, sub
      })).toString('base64url')

      const signingInput = `${header}.${payload}`
      const hmac = crypto.createHmac('sha256', TEST_CLIENT_SECRET)
      hmac.update(signingInput)
      const signature = hmac.digest('base64url')

      const sessionToken = `${header}.${payload}.${signature}`

      const { authenticateRequest } = require('@/lib/shopify-auth')

      const request = new Request('http://localhost:3050/api/test', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })

      expect(async () => {
        await authenticateRequest(request, { shop: TEST_SHOP })
      }).rejects.toThrow('Invalid session token: missing required fields')
    })
  })

  describe('Token Manager', () => {
    it('should store and retrieve access token', async () => {
      const { storeShopToken, getShopToken } = require('@/lib/shopify/token-manager')

      // Store token
      const storeResult = await storeShopToken(
        TEST_SHOP,
        'test-access-token-12345',
        'read_products,write_products'
      )

      expect(storeResult.success).toBe(true)
      expect(storeResult.shopId).toBeDefined()

      // Retrieve token
      const getResult = await getShopToken(TEST_SHOP)

      expect(getResult.success).toBe(true)
      expect(getResult.accessToken).toBe('test-access-token-12345')
    })

    it('should return error for non-existent shop', async () => {
      const { getShopToken } = require('@/lib/shopify/token-manager')

      const result = await getShopToken('non-existent-store.myshopify.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No token found')
    })

    it('should cache tokens to reduce database queries', async () => {
      const { storeShopToken, getShopToken } = require('@/lib/shopify/token-manager')

      // Store token
      await storeShopToken(TEST_SHOP, 'cached-token-12345')

      // First retrieval - from database
      const firstResult = await getShopToken(TEST_SHOP)
      expect(firstResult.success).toBe(true)

      // Second retrieval - from cache (should be faster)
      const start = Date.now()
      const secondResult = await getShopToken(TEST_SHOP)
      const duration = Date.now() - start

      expect(secondResult.success).toBe(true)
      expect(secondResult.accessToken).toBe('cached-token-12345')
      expect(duration).toBeLessThan(10) // Should be very fast (< 10ms)
    })
  })
})
```

### Integration Tests

Create: `src/__tests__/integration/auth-flow.test.ts`

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration tests for end-to-end authentication flow
 * Requires Supabase connection
 */
describe('Authentication Flow Integration', () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const TEST_SHOP = 'integration-test-store.myshopify.com'

  beforeAll(async () => {
    // Clean up test data
    await supabase
      .from('shops')
      .delete()
      .eq('shop_domain', TEST_SHOP)
  })

  it('should complete OAuth flow and store token', async () => {
    // 1. Simulate app installation
    const installResponse = await fetch('http://localhost:3050/api/auth/shopify', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(installResponse.status).toBe(302) // Redirect to Shopify OAuth

    // 2. Simulate OAuth callback (after merchant approval)
    const callbackResponse = await fetch(
      `http://localhost:3050/api/auth/shopify/callback?` +
      `shop=${TEST_SHOP}&code=test-auth-code&state=test-state`,
      {
        method: 'GET'
      }
    )

    expect(callbackResponse.status).toBe(302) // Redirect to app

    // 3. Verify token stored in database
    const { data: shop } = await supabase
      .from('shops')
      .select('*')
      .eq('shop_domain', TEST_SHOP)
      .single()

    expect(shop).toBeDefined()
    expect(shop.shopify_access_token).toBeDefined()
    expect(shop.is_active).toBe(true)
  })

  it('should authenticate API requests with stored token', async () => {
    // Make authenticated API request
    const response = await fetch(
      `http://localhost:3050/api/shopify/products?shop=${TEST_SHOP}`,
      {
        headers: {
          'Authorization': 'Bearer <session-token>',
          'Content-Type': 'application/json'
        }
      }
    )

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.products).toBeDefined()
  })
})
```

### Run Tests

```bash
# Run all tests
npm test

# Run auth tests only
npm test -- shopify-auth

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

---

## Security Testing

### Test 1: Auth Bypass Prevention

**Purpose**: Verify build fails if bypass is enabled in production

```bash
# Should PASS in development
npm run build

# Should FAIL with bypass enabled in production
export NODE_ENV=production
export SHOPIFY_AUTH_BYPASS=true
npm run build

# Expected output:
# ❌ CRITICAL SECURITY ERROR
# SHOPIFY_AUTH_BYPASS is ENABLED in PRODUCTION!
# Build FAILED for security reasons.
```

### Test 2: Token Signature Tampering

**Purpose**: Verify tampered tokens are rejected

**Steps**:
1. Get a valid session token
2. Decode and modify the payload
3. Re-encode without proper signature
4. Attempt to use modified token

**Expected**: 401 Unauthorized with "Invalid session token signature"

### Test 3: Expired Token Handling

**Purpose**: Verify expired tokens are rejected

```bash
# Create expired token (exp in past)
curl -X POST "http://localhost:3050/api/shopify/auth/token-exchange" \
  -H "Authorization: Bearer <expired-token>" \
  -d '{"shop": "test-store.myshopify.com"}'

# Expected: 401 Unauthorized
# Error: "Session token expired"
```

### Test 4: Missing Authorization Header

**Purpose**: Verify proper error handling for missing auth

```bash
curl "http://localhost:3050/api/shopify/products?shop=test-store.myshopify.com"

# Expected: 401 Unauthorized
# Error: "No session token provided - authentication required"
```

### Test 5: Invalid Shop Domain

**Purpose**: Verify shop validation

```bash
curl "http://localhost:3050/api/shopify/products?shop=invalid-shop" \
  -H "Authorization: Bearer <valid-token>"

# Expected: 401 Unauthorized
# Error: "Session token shop mismatch"
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "Session token signature verification failed"

**Cause**: Client secret mismatch

**Solution**:
1. Verify `SHOPIFY_API_SECRET` matches app secret in Partner Dashboard
2. Check if using correct environment (dev vs prod app)
3. Ensure client secret hasn't changed

#### Issue 2: "No session token provided"

**Cause**: App Bridge not generating tokens

**Solution**:
1. Verify app is loaded within Shopify Admin iframe
2. Check `NEXT_PUBLIC_SHOPIFY_API_KEY` is set correctly
3. Ensure App Bridge is initialized in `AppBridgeProvider`

#### Issue 3: "No token found for shop"

**Cause**: OAuth flow not completed

**Solution**:
1. Reinstall app from Partner Dashboard
2. Verify database connection
3. Check Supabase RLS policies allow service role writes

#### Issue 4: Token exchange fails with 401

**Cause**: Invalid session token or app credentials

**Solution**:
1. Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
2. Check if app is approved in Partner Dashboard
3. Ensure shop domain is correct format

### Debug Checklist

- [ ] `SHOPIFY_API_KEY` matches Partner Dashboard
- [ ] `SHOPIFY_API_SECRET` is correct
- [ ] `NEXT_PUBLIC_SHOPIFY_API_KEY` is set for client-side
- [ ] App URL matches actual deployment URL
- [ ] Redirect URI is whitelisted in Partner Dashboard
- [ ] Supabase connection is working
- [ ] RLS policies allow service role access
- [ ] App Bridge is initialized correctly
- [ ] Session tokens are being generated in browser
- [ ] Token exchange endpoint is reachable

### Enable Debug Logging

Add to `.env.local` for detailed logs:

```bash
# Enable authentication debug logging
DEBUG=shopify:auth
NODE_ENV=development
```

Check server logs for:
```
🔐 Using client secret for verification (first 8 chars): c7fa2886...
✅ Session token verified successfully
💾 Token cached for shop: your-store.myshopify.com
```

---

## Testing Checklist

### Pre-Production Testing

- [ ] OAuth installation flow works
- [ ] Session token verification passes
- [ ] Token exchange succeeds
- [ ] Access tokens are stored in database
- [ ] Token caching reduces database queries
- [ ] Protected routes require authentication
- [ ] Invalid tokens are rejected
- [ ] Expired tokens are rejected
- [ ] Build fails with auth bypass in production
- [ ] No hardcoded credentials in code
- [ ] RLS policies protect shop data
- [ ] Error messages don't leak sensitive info

### Post-Deployment Verification

- [ ] OAuth redirects to correct URL
- [ ] App loads in Shopify Admin without errors
- [ ] API requests succeed with session tokens
- [ ] Sentry shows no auth errors
- [ ] Database contains shop tokens
- [ ] No bypass flags in production environment
- [ ] Security check passes in build logs

---

## Next Steps

1. **Set up CI/CD testing**: Run auth tests on every deployment
2. **Monitor auth failures**: Track in Sentry with alerts
3. **Implement rate limiting**: Prevent brute force attacks
4. **Add token refresh logic**: Handle expired tokens gracefully
5. **Document OAuth for users**: Help merchants troubleshoot auth issues

## References

- [Shopify Session Tokens](https://shopify.dev/docs/api/app-bridge-library/reference/session-token)
- [Token Exchange Guide](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange)
- [JWT Verification](https://jwt.io)
- [Testing Guide](./AUTHENTICATION_CLEANUP_SUMMARY.md)
