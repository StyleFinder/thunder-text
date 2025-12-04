# Authentication Testing - Quick Start
**Last Updated**: 2025-12-01

## Running Tests

### Quick Commands

```bash
# Run all authentication tests
npm run test:auth

# Run complete auth flow verification
npm run test:auth-flow

# Run unit tests with watch mode
npm run test:watch

# Run integration tests (requires Supabase)
npm run test:integration

# Run all tests with coverage
npm run test:coverage
```

### Manual Testing

#### 1. Test OAuth Installation Flow
```bash
# 1. Start dev server
npm run dev

# 2. Start ngrok
ngrok http 3050 --domain=thundertext-dev.ngrok.app

# 3. Install app from Partner Dashboard
# https://partners.shopify.com/your-org/apps/your-app/test

# 4. Verify token stored
# Check Supabase: SELECT * FROM shops WHERE shop_domain = 'your-store.myshopify.com';
```

#### 2. Test Protected API Routes
```bash
# Without auth (should fail)
curl "http://localhost:3050/api/shopify/products?shop=your-store.myshopify.com"
# Expected: 401 Unauthorized

# With session token (should succeed)
curl "http://localhost:3050/api/shopify/products?shop=your-store.myshopify.com" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
# Expected: 200 OK with product data
```

#### 3. Test Build Security Check
```bash
# Should pass
npm run build

# Should fail with bypass enabled
export NODE_ENV=production
export SHOPIFY_AUTH_BYPASS=true
npm run build
# Expected: Build fails with security error
```

## Test Files

| Test Type | Location | Purpose |
|-----------|----------|---------|
| Unit Tests | [src/__tests__/auth/shopify-auth.test.ts](../src/__tests__/auth/shopify-auth.test.ts) | JWT verification, token validation |
| Integration Tests | [src/__tests__/auth/token-manager.test.ts](../src/__tests__/auth/token-manager.test.ts) | Database operations, caching |
| E2E Script | [scripts/test-auth-flow.sh](../scripts/test-auth-flow.sh) | Complete flow verification |
| Security Check | [scripts/check-auth-bypass.js](../scripts/check-auth-bypass.js) | Build-time validation |

## What Each Test Verifies

### Unit Tests (`shopify-auth.test.ts`)
- ✅ Session token signature verification
- ✅ JWT payload validation
- ✅ Expiration checking
- ✅ Required fields validation
- ✅ Shop domain matching
- ✅ Audience (client ID) validation
- ✅ Security edge cases

### Integration Tests (`token-manager.test.ts`)
- ✅ Token storage in database
- ✅ Token retrieval from database
- ✅ In-memory caching (23-hour TTL)
- ✅ Concurrent request handling
- ✅ Upsert logic (update existing tokens)
- ✅ Shop deactivation (soft delete)

### E2E Script (`test-auth-flow.sh`)
- ✅ Environment configuration
- ✅ Server health check
- ✅ Database connectivity
- ✅ Protected route authentication
- ✅ Auth bypass disabled
- ✅ No hardcoded tokens
- ✅ Token exchange endpoint

## Expected Test Results

### ✅ All Tests Passing
```
PASS  src/__tests__/auth/shopify-auth.test.ts
  ✓ Session token signature verification (15ms)
  ✓ JWT payload validation (8ms)
  ✓ Token expiration checking (5ms)

PASS  src/__tests__/auth/token-manager.test.ts
  ✓ Token storage (250ms)
  ✓ Token retrieval (120ms)
  ✓ Token caching (80ms)

Test Suites: 2 passed, 2 total
Tests:       18 passed, 18 total
```

### ✅ E2E Script Success
```
╔════════════════════════════════════════════════════════╗
║     Shopify Authentication Flow Testing Script        ║
╚════════════════════════════════════════════════════════╝

▶ Test 1: Checking environment configuration
✓ Environment configuration valid

▶ Test 2: Checking if server is running
✓ Server is running on http://localhost:3050

...

╔════════════════════════════════════════════════════════╗
║                    Test Summary                        ║
╚════════════════════════════════════════════════════════╝

✓ All authentication tests passed!
```

## Troubleshooting Failed Tests

### Issue: "Session token signature verification failed"
**Fix**: Verify `SHOPIFY_API_SECRET` matches Partner Dashboard

### Issue: "No token found for shop"
**Fix**: Complete OAuth installation flow first

### Issue: "SKIP_INTEGRATION_TESTS: Skipping tests"
**Fix**: Set `SKIP_INTEGRATION_TESTS=false` or remove variable

### Issue: "Database connection failed"
**Fix**: Check Supabase credentials in `.env.local`

## Pre-Production Checklist

Run all tests before deploying:

```bash
# 1. Security check
npm run build

# 2. Unit tests
npm run test:auth

# 3. Integration tests
SKIP_INTEGRATION_TESTS=false npm run test:integration

# 4. E2E verification
npm run test:auth-flow

# 5. Type checking
npm run type-check
```

All should pass with ✅ before production deployment.

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Authentication Tests
  run: |
    npm run test:auth
    npm run test:auth-flow
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}
    SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY }}
    SHOPIFY_API_SECRET: ${{ secrets.SHOPIFY_API_SECRET }}
```

## Resources

- **Full Guide**: [AUTHENTICATION_TESTING_GUIDE.md](./AUTHENTICATION_TESTING_GUIDE.md)
- **Cleanup Summary**: [AUTHENTICATION_CLEANUP_SUMMARY.md](./AUTHENTICATION_CLEANUP_SUMMARY.md)
- **Shopify Docs**: [Token Exchange](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange)
