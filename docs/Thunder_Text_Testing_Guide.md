# Thunder Text Testing Guide: Complete Overview

This document provides a comprehensive guide to fully testing Thunder Text, including edge cases, best practices, and SaaS testing methodologies.

---

## 1. CI/CD Pipeline Status

### GitHub Actions Workflow ✅ COMPLETE

The CI/CD pipeline is fully configured and operational.

| Job                    | Status  | Duration | Triggers On          |
| ---------------------- | ------- | -------- | -------------------- |
| Unit & Integration     | ✅ Pass | ~1m 30s  | Push to main/develop |
| E2E Tests (Playwright) | ✅ Pass | ~6m 54s  | PR to main/develop   |
| PR Summary Comment     | ✅ Pass | Auto     | Pull requests only   |

### Branch Protection ✅ ENABLED

The `main` branch is protected with required status checks:

```
main branch protection:
├─ ✅ Required Status Checks:
│   ├─ "Unit & Integration Tests" - Must pass before merge
│   └─ "E2E Tests" - Must pass before merge
├─ ✅ Strict Updates: Branch must be up-to-date with main
├─ ✅ Force Push Blocked: Prevents history rewriting
└─ ✅ Branch Deletion Blocked: Prevents accidental deletion
```

### Environment Secrets (Preview)

All secrets are configured in GitHub Environment "Preview":

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY`
- `NEXTAUTH_SECRET`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`
- `DATABASE_URL`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`

---

## 2. Testing Infrastructure

### Testing Framework Stack

| Tool                  | Purpose           | Location                     |
| --------------------- | ----------------- | ---------------------------- |
| Jest 30               | Test runner       | `jest.config.js`             |
| React Testing Library | Component testing | `@testing-library/react`     |
| jest-dom              | DOM matchers      | `@testing-library/jest-dom`  |
| Node.js environment   | Integration tests | `jest.integration.config.js` |

### Test Scripts Available

```bash
# Unit Tests
npm test                        # Run all unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # Generate coverage report
npm run test:ci                # CI mode (no watch, with coverage)

# Integration Tests (real database)
npm run test:integration                                    # All integration tests
npm run test:integration -- --testPathPatterns="auth"       # Auth-related integration tests
npm run test:integration -- --testPathPatterns="shop"       # Shop-related integration tests

# Specific Test Suites
npm run test:auth              # Auth tests only (skips integration)
npm run test:auth:full         # Auth with integration tests
```

### Coverage Thresholds

Coverage thresholds are currently disabled in CI while test coverage improves.
Target thresholds for future enforcement:

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

---

## 3. Testing Pyramid for Thunder Text

```
        ┌─────────────────┐
        │   E2E Tests     │  10% - Full user workflows
        │   (Playwright)  │  94 tests (1 skipped)
        ├─────────────────┤
        │  Integration    │  30% - Database, API, OAuth
        │  Tests          │  Real Supabase connections
        ├─────────────────┤
        │   Unit Tests    │  60% - Functions, components
        │                 │  Fast, isolated, mocked
        └─────────────────┘
```

---

## 4. Edge Cases to Test

### Authentication & Sessions (CRITICAL)

1. **Token Expiry During Operations**
   - Shopify online tokens expire after 24 hours
   - Access tokens expire every 15 minutes
   - Test: Start bulk operation, expire token mid-process

2. **OAuth Edge Cases**
   - Invalid scopes requested
   - User denies permission
   - Token exchange failure
   - Reinstallation after uninstall

3. **Session Management**
   - Concurrent sessions in multiple tabs
   - Session cookie in iframe context (Shopify embed)
   - Session timeout during active use

### Data Validation Edge Cases

1. **Products Without Images** - AI requires at least one valid image
2. **Very Long Product Titles** (300+ chars) - Truncation handling
3. **Special Characters** - Unicode, emojis, accents: "Café ™ 🔥 中文"
4. **Empty/Null Fields** - Products with missing required data
5. **Malformed JSON** - API responses with unexpected structure

### AI Generation Edge Cases

1. **Network Failure During Generation** - Partial completion handling
2. **OpenAI Rate Limiting** - 429 responses, Retry-After header
3. **Timeout Scenarios** - Long-running AI operations (>30s)
4. **Invalid Image URLs** - Expired CDN links, 404 images
5. **RAG Retrieval Failures** - Best practices required, examples optional

### Multi-Tenant Security (CRITICAL)

1. **Cross-Tenant Data Access** - Shop A trying to access Shop B's data
2. **RLS Policy Enforcement** - Row Level Security for all tables
3. **Tenant ID Mismatch** - POST data with wrong store_id
4. **Service Role vs User Role** - Different permission levels

### Rate Limiting

| Endpoint Type    | Limit | Per  |
| ---------------- | ----- | ---- |
| GENERATION       | 100   | hour |
| READ             | 1000  | hour |
| WRITE            | 200   | hour |
| VOICE_GENERATION | 10    | hour |

---

## 5. Manual Testing Phases

### Phase 1: OAuth & Installation (CRITICAL)

- [ ] Fresh installation on new store
- [ ] Token refresh after 1 hour
- [ ] Uninstall/reinstall with GDPR webhook verification
- [ ] Permission scope validation

### Phase 2: Core Features (HIGH)

- [ ] Single product generation (<30 seconds)
- [ ] Bulk product processing (5 products, <5 minutes)
- [ ] Brand voice configuration persistence
- [ ] Content Center (upload, edit, delete)

### Phase 3: Edge Cases (HIGH)

- [ ] Product without images
- [ ] Very long product title (300+ chars)
- [ ] Special characters (Unicode, emojis)
- [ ] Network failure during generation
- [ ] Concurrent operations (multiple tabs)

### Phase 4: Performance (MEDIUM)

- [ ] Page load times <3 seconds
- [ ] Large catalog (100+ products)
- [ ] Image processing with 10+ high-res images

### Phase 5: Browser & Device (MEDIUM)

- [ ] Chrome, Safari, Firefox, Edge
- [ ] Mobile Safari (iOS), Chrome (Android)
- [ ] Responsive layout validation

### Phase 6: Embedded App (HIGH)

- [ ] Shopify admin iframe embedding
- [ ] Session cookies in embedded context
- [ ] App Bridge communication

---

## 6. Best Practices for SaaS Testing

### A. Unit Testing Best Practices

```typescript
// 1. Mock external dependencies
jest.mock('openai', () => ({ ... }));
jest.mock('@/lib/supabase', () => ({ ... }));

// 2. Test one thing per test
it('returns 401 when not authenticated', async () => { ... });

// 3. Use meaningful assertions
expect(response.status).toBe(401);
expect(data.error).toBe('Unauthorized');

// 4. Clean up after tests
afterEach(() => { jest.clearAllMocks(); });
```

### B. Integration Testing Best Practices

```typescript
// 1. Use real database for critical paths
// Integration tests connect to real Supabase

// 2. Isolate test data
const testShopId = `test-shop-${Date.now()}`;

// 3. Clean up test data
afterAll(async () => {
  await supabaseAdmin.from('shops').delete().eq('id', testShopId);
});

// 4. Test tenant isolation explicitly
it('Shop A cannot access Shop B data', async () => { ... });
```

### C. Security Testing Best Practices

1. **Authentication Tests**
   - Invalid/expired tokens
   - Missing authorization headers
   - Role escalation attempts

2. **Input Validation**
   - SQL injection attempts
   - XSS payloads
   - Path traversal attacks

3. **Rate Limiting**
   - Verify limits enforced
   - Check Retry-After headers

### D. Performance Testing Best Practices

1. **Response Time Targets**
   - Page loads: <3 seconds
   - AI generation: <30 seconds
   - API endpoints: <2 seconds

2. **Load Testing Scenarios**
   - Concurrent users (100+)
   - Bulk operations (100+ products)
   - Large file uploads (50MB)

---

## 7. E2E Testing with Playwright

### Setup

Playwright is now configured for end-to-end testing. Run E2E tests with:

```bash
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Run with Playwright UI
npm run test:e2e:headed    # Run in headed browser mode
npm run test:e2e:debug     # Run in debug mode
```

### E2E Test Coverage (94 tests, 1 skipped)

| Flow                      | Test File                        | Tests | Description                                                |
| ------------------------- | -------------------------------- | ----- | ---------------------------------------------------------- |
| Auth Setup                | `e2e/auth.setup.ts`              | 1     | One-time auth for reusable state                           |
| Signup                    | `e2e/auth.spec.ts`               | 6     | Form display, validation, account creation                 |
| Login                     | `e2e/auth.spec.ts`               | 6     | Form display, credentials, loading states                  |
| Accessibility             | `e2e/auth.spec.ts`               | 3     | Heading structure, label associations                      |
| Main Onboarding           | `e2e/onboarding.spec.ts`         | 16    | Welcome, Store Connect, Ad Platforms, Complete (1 skipped) |
| Content Center Onboarding | `e2e/onboarding.spec.ts`         | 9     | Voice profile setup flow                                   |
| Dashboard Access          | `e2e/onboarding.spec.ts`         | 1     | Authenticated dashboard access                             |
| Product Generation        | `e2e/product-generation.spec.ts` | 18    | Create Product page, forms, photo upload, navigation       |
| Content Center            | `e2e/content-center.spec.ts`     | 18    | Dashboard, Library, Generate, Voice Profile                |
| Billing/Settings          | `e2e/billing-settings.spec.ts`   | 19    | Settings page, AI Discovery, Connections, Upgrade banner   |

**Skipped Test**: `should allow filling optional profile fields` in `onboarding.spec.ts` - Flaky dropdown interaction timing in CI

### Configuration

- **Config file**: `playwright.config.ts`
- **Base URL**: `http://localhost:3050`
- **Browser**: Chromium (can enable Firefox, Safari)
- **Auto-starts dev server** in CI mode
- **Auth State**: Saved to `e2e/.auth/user.json` for test reuse

### Project Structure

```
projects:
├── setup           # Runs first - authenticates and saves state
├── auth-tests      # Unauthenticated tests (signup/login flows)
└── chromium        # Authenticated tests (onboarding, workflows)
                    # Depends on 'setup', uses storageState
```

---

## 8. Current Testing Gaps

### Missing Test Coverage

1. ~~**E2E Tests** - No Playwright/Cypress setup~~ ✅ DONE
2. **Test Fixtures** - No centralized test data factory
3. **Load Testing** - No stress testing framework
4. **Visual Testing** - No snapshot/regression tests

### Integration Test Coverage by Tier

#### Tier 1: Critical/Security Endpoints

| Endpoint                            | Test File                         | Tests | Notes                                                  |
| ----------------------------------- | --------------------------------- | ----- | ------------------------------------------------------ |
| `POST /api/auth/signup`             | `auth-signup.test.ts`             | 21    | Email validation, password hashing, duplicate handling |
| `POST /api/auth/login`              | `auth-login.test.ts`              | 6     | Credential validation, session creation                |
| `POST /api/auth/token`              | `auth-token.test.ts`              | 6     | JWT generation, token validation                       |
| `GET /api/billing/subscription`     | `billing-subscription.test.ts`    | 7     | Status retrieval, trial detection                      |
| `POST /api/billing/create-checkout` | `billing-create-checkout.test.ts` | 9     | Stripe session creation, plan validation               |
| Multi-tenant isolation              | `tenant-isolation.test.ts`        | 12    | Cross-tenant data protection via RLS                   |

#### Tier 2: Core Feature Endpoints

| Endpoint                            | Test File                   | Tests | Notes                                      |
| ----------------------------------- | --------------------------- | ----- | ------------------------------------------ |
| `GET /api/shop/profile`             | `shop-profile.test.ts`      | 12    | Profile retrieval, auth validation         |
| `PUT /api/shop/profile`             | `shop-profile.test.ts`      | 12    | Profile updates, field validation          |
| `GET /api/business-profile`         | `business-profile.test.ts`  | 12    | Business profile retrieval                 |
| `GET /api/onboarding/status`        | `onboarding-status.test.ts` | 7     | Onboarding completion tracking             |
| `POST /api/aie/generate`            | `aie-generate.test.ts`      | 20    | Parameter validation, platform/goal checks |
| `POST /api/generate`                | `generate.test.ts`          | 7     | AI generation validation                   |
| `POST /api/content-center/generate` | `content-generate.test.ts`  | 20    | Content generation (behavioral docs)       |

#### Tier 3: BHB Coaching Endpoints

| Endpoint                                | Test File                  | Tests | Notes                                     |
| --------------------------------------- | -------------------------- | ----- | ----------------------------------------- |
| `GET /api/bhb/insights`                 | `bhb-insights.test.ts`     | 8     | Performance tier calculation tests        |
| `GET/PATCH /api/bhb/shops/[id]/profile` | `bhb-shop-profile.test.ts` | ~20   | Validation rules for store_type, platform |
| `GET/POST/DELETE /api/coach/notes`      | `coach-notes.test.ts`      | ~15   | Coach notes CRUD behavioral docs          |

### Test Summary Statistics

- **Total Test Suites**: 18 (all passing)
- **Total Tests**: 260 passing, 9 todo
- **Coverage Areas**: Authentication, Authorization, Billing, Profiles, AI Generation, Coaching

### Important Testing Notes

#### ESM + Jest Mocking Limitations

The `@jest/globals` ESM imports don't work well with `jest.MockedFunction` type casting. Tests that require mocking `getServerSession` or complex dependencies are written as **behavioral documentation** that tests pure functions and validates expected response structures without calling real endpoints with mocked auth.

#### Test Store Configuration

Tests use real Supabase data via `src/__tests__/utils/test-constants.ts`:

```typescript
export const TEST_SHOP = {
  domain: "zunosai-staging-test-store.myshopify.com",
  name: "zunosai-staging-test-store",
};
```

### Recommended Additions

1. ~~Add Playwright for critical user flows~~ ✅ DONE
2. Create test data factories for consistency
3. Implement API contract tests
4. Add performance benchmarks to CI
5. Convert behavioral documentation tests to real endpoint tests when Jest ESM mocking improves
6. Add E2E tests for: onboarding flow, product generation, content center

---

## 9. Test Execution Checklist

### Before Each Release

- [ ] Run full test suite: `npm run test:ci`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Check coverage report: `npm run test:coverage`
- [ ] Complete manual testing guide phases 1-3
- [ ] Verify no console errors in browser

### Before Shopify Submission

- [ ] All critical manual tests pass
- [ ] 80%+ code coverage achieved
- [ ] GDPR webhooks verified
- [ ] OAuth flow tested on fresh store
- [ ] Performance benchmarks met

---

## 10. Key Files Reference

### Test Configuration

- `/Users/bigdaddy/projects/thunder-text/jest.config.js`
- `/Users/bigdaddy/projects/thunder-text/jest.integration.config.js`
- `/Users/bigdaddy/projects/thunder-text/jest.setup.js`

### Test Files

- `src/__tests__/auth/` - Authentication tests
- `src/__tests__/security/` - RLS & tenant isolation
- `src/__tests__/components/` - React component tests
- `src/__tests__/lib/` - Library/utility tests
- `src/__tests__/integration/api/` - API endpoint integration tests
- `src/__tests__/utils/` - Test helpers and constants
- `e2e/` - Playwright E2E tests

### Documentation

- `/Users/bigdaddy/projects/thunder-text/docs/TESTING.md`
- `/Users/bigdaddy/projects/thunder-text/claudedocs/MANUAL_TESTING_GUIDE.md`

---

## Summary

Thunder Text has a comprehensive testing foundation with Jest 30, React Testing Library, Playwright E2E, and thorough integration tests. **CI/CD is fully operational with branch protection enabled.**

### Current Test Coverage

- **18 integration test suites** covering all API tiers (260 tests)
- **94 E2E tests** covering authentication, onboarding, and workflow flows
- **3 tiers covered**: Critical/Security, Core Features, BHB Coaching

### Testing Stack

| Type        | Framework  | Tests | Command                    |
| ----------- | ---------- | ----- | -------------------------- |
| Unit        | Jest + RTL | ~100+ | `npm test`                 |
| Integration | Jest       | 260   | `npm run test:integration` |
| E2E         | Playwright | 94    | `npm run test:e2e`         |
| Load        | k6         | -     | `npm run test:load`        |

### Completed Milestones ✅

1. ✅ **CI/CD Pipeline** - GitHub Actions workflow operational
2. ✅ **Branch Protection** - main branch requires passing tests
3. ✅ **E2E Tests** - 94 Playwright tests covering auth, onboarding, workflows
4. ✅ **Integration Tests** - 260 tests across all API tiers
5. ✅ **Multi-tenant Isolation** - RLS testing via tenant-isolation.test.ts
6. ✅ **AI Generation Validation** - Covered in aie-generate, generate tests
7. ✅ **Load Testing Framework** - k6 smoke tests ready for production testing

### Remaining Gaps

1. **ESM mocking limitations** - Some tests are behavioral docs, not real endpoint tests
2. **In-memory rate limiting** - Needs Redis for production
3. **Flaky E2E test** - 1 skipped (dropdown timing in CI)
4. **E2E Flow Outcome Tests** - E2E tests verify UI elements but not backend state changes (see `E2E_TEST_COVERAGE_MATRIX.md`)

### Critical E2E Gap Discovered (December 2025)

During bug investigation, we found that E2E tests only test UI elements, not flow outcomes:

- **Bug 1**: Login always redirected to `/welcome` regardless of `onboarding_completed` status
- **Bug 2**: `/api/onboarding/complete` was using wrong DB column (`shop_domain` instead of `id`)

**Root Cause**: E2E tests didn't verify:

1. Correct redirect URL based on user state
2. Database state changes after completing flows

**Solution**: See `docs/E2E_TEST_COVERAGE_MATRIX.md` for comprehensive test coverage requirements.

---

## 11. Next Steps

### Completed This Sprint ✅

| Task                           | Status     | Notes                                    |
| ------------------------------ | ---------- | ---------------------------------------- |
| ~~Fix flaky E2E test~~         | ⏭️ Skipped | Intentionally skipped per user decision  |
| ~~Enable coverage thresholds~~ | ✅ Done    | Set to 0.5-1% baseline, excludes backend |
| ~~E2E: Product generation~~    | ✅ Done    | `product-generation.spec.ts`             |
| ~~E2E: Content center~~        | ✅ Done    | `content-center.spec.ts`                 |
| ~~Load testing framework~~     | ✅ Done    | k6 smoke test in `load-tests/`           |

### Load Testing

```bash
# Local smoke test (5 VUs, 40s) - for code validation only
npm run test:load

# Production load test (50 VUs, 2.5min) - run after Shopify approval
BASE_URL=https://app.zunos.com npm run test:load
```

**Important**:

- Local dev server is single-threaded and cannot handle concurrent load (expected)
- **Run production load test on `app.zunos.com` after Shopify approval** to validate 50+ concurrent users
- Production (Render) with auto-scaling will provide accurate performance metrics

### Short-Term (Next 2-4 Weeks)

| Task                          | Why                                            | Effort   |
| ----------------------------- | ---------------------------------------------- | -------- |
| **E2E Flow Outcome Tests**    | Verify redirects based on user state           | **HIGH** |
| **E2E DB State Verification** | Verify database changes after completing flows | **HIGH** |
| **Cross-Role E2E Tests**      | Verify role separation (coach vs store)        | Medium   |
| Test data factory             | Centralized fixture generation                 | Medium   |
| API contract tests            | Validate request/response schemas              | Medium   |
| Performance benchmarks        | Track response times in CI                     | Medium   |
| Increase coverage thresholds  | Raise from 1% toward 80% as tests added        | Low      |

**Priority**: E2E Flow Outcome Tests should be completed FIRST - see `docs/E2E_TEST_COVERAGE_MATRIX.md`

### Long-Term (Future Sprints)

| Task                       | Why                                        | Effort           |
| -------------------------- | ------------------------------------------ | ---------------- |
| ~~Load testing framework~~ | ~~Validate performance under stress~~      | ~~High~~ ✅ Done |
| Visual regression tests    | Catch UI changes with snapshots            | High             |
| Redis rate limiting        | Production-ready rate limiting             | High             |
| Convert behavioral tests   | Real endpoint tests when Jest ESM improves | Medium           |

### Bug Fix Note

During test development, a bug was discovered and fixed in `/api/onboarding/status`:

- The route was querying `shops` table by `shop_domain` using the UUID returned from `getUserId()`
- Fixed to query by `id` column since `getUserId()` returns the shop UUID, not domain

---

## 12. Security Remediation Roadmap

Based on the **Alan Knox Technical Assessment** (December 12, 2025), conducted on branch `feature/ad-account-selector` which predates recent security improvements.

### Assessment Summary

| Area                    | Rating | Notes                                         |
| ----------------------- | ------ | --------------------------------------------- |
| Software Best Practices | B      | Good foundation                               |
| Architecture            | B+     | Sophisticated AI pipeline                     |
| Security                | C+     | Excellent utilities, inconsistent application |
| Scalability             | B      | Ready for growth                              |
| Billing/Operations      | C      | Edge cases unhandled                          |
| API Consistency         | C-     | Multiple response formats                     |

### Items Already Addressed ✅

| Finding                            | Status   | Evidence                               |
| ---------------------------------- | -------- | -------------------------------------- |
| No branch protection               | ✅ Fixed | `main` requires passing CI checks      |
| CI/CD disconnected from deployment | ✅ Fixed | GitHub Actions workflow operational    |
| No RLS integration tests           | ✅ Fixed | `rls-integration.test.ts` (576+ lines) |
| No multi-tenant isolation tests    | ✅ Fixed | `tenant-isolation.test.ts` (12 tests)  |
| No load testing framework          | ✅ Fixed | k6 smoke tests in `load-tests/`        |
| No E2E testing infrastructure      | ✅ Fixed | 94 Playwright tests                    |
| Limited integration test coverage  | ✅ Fixed | 260 tests across 18 suites             |

### Day 1 Critical Fixes (IMMEDIATE)

| Issue                                 | Risk     | File                                   | Fix Required                                            |
| ------------------------------------- | -------- | -------------------------------------- | ------------------------------------------------------- |
| Usage check grants unlimited on error | CRITICAL | `src/lib/billing/usage.ts:54-61`       | Return `canProceed: false` on DB error                  |
| Stripe webhook idempotency missing    | CRITICAL | `src/app/api/webhooks/stripe/route.ts` | Check for duplicate `stripe_event_id` before processing |
| Dev-token bypass in production        | CRITICAL | 4 files (see audit)                    | Remove dev token authentication patterns                |
| Usage counter race condition          | HIGH     | `src/lib/billing/usage.ts:136-160`     | Use atomic increment instead of GET+UPDATE              |

### Week 1 Priorities

| Issue                                  | Risk   | Action Required                                  |
| -------------------------------------- | ------ | ------------------------------------------------ |
| Add `logger.setUser()` to routes       | MEDIUM | Add user context to authenticated route handlers |
| Complete API route auth audit          | HIGH   | Verify all 151 routes have appropriate auth      |
| Facebook webhook verification          | HIGH   | Add signature verification to Facebook webhooks  |
| Verify subscription status enforcement | HIGH   | Ensure expired subscriptions block access        |

### 30-Day Goals

| Issue                         | Risk   | Action Required                             |
| ----------------------------- | ------ | ------------------------------------------- |
| GDPR deletion endpoint        | HIGH   | Implement `/api/gdpr/customer-data-request` |
| Feature flag infrastructure   | MEDIUM | Add LaunchDarkly or similar                 |
| CORS header audit             | HIGH   | Ensure all routes have proper CORS headers  |
| Database transaction wrappers | MEDIUM | Wrap multi-step operations in transactions  |

### 60-Day Goals

| Issue                      | Risk   | Action Required                     |
| -------------------------- | ------ | ----------------------------------- |
| Complete security coverage | HIGH   | Auth on all high-risk routes        |
| 50% test coverage          | MEDIUM | Increase from current baseline      |
| Monitoring dashboards      | MEDIUM | Set up observability infrastructure |
| Accessibility (WCAG)       | MEDIUM | Begin accessibility implementation  |

### Code Locations for Critical Fixes

```typescript
// 1. Usage check error fallback - src/lib/billing/usage.ts:49-61
// CURRENT (vulnerable):
if (error || !shop) {
  return { canProceed: true, ... }; // ⚠️ Grants access on error
}
// FIX: Return canProceed: false on error

// 2. Usage counter race condition - src/lib/billing/usage.ts:136-160
// CURRENT (race condition):
const { data: shop } = await supabase.from("shops").select(column)...
await supabase.from("shops").update({ [column]: currentValue + 1 })...
// FIX: Use Supabase RPC with atomic increment

// 3. Stripe webhook idempotency - src/app/api/webhooks/stripe/route.ts
// CURRENT: Logs event but doesn't check for duplicates
// FIX: Query billing_events for stripe_event_id before processing

// 4. Dev token bypass - check these files:
// - src/app/api/generate/create/route.ts
// - src/app/api/facebook/oauth/callback/route.ts
// - src/app/api/facebook/oauth/disconnect/route.ts
// - src/lib/shopify-auth.ts
```

### Tracking Progress

Track remediation progress in this document. When a fix is implemented:

1. Move the item from "Critical Fixes" to "Items Already Addressed"
2. Add the commit hash or PR number as evidence
3. Update the corresponding integration test if applicable
