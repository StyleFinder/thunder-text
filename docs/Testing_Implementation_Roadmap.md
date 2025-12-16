# Testing Implementation Roadmap for Thunder Text

**For**: Junior developers new to SaaS testing
**Approach**: Progressive skill-building with immediate value
**Timeline**: 4-6 weeks (part-time)

---

## Philosophy: The "Test What Matters First" Approach

As a junior dev, you might feel overwhelmed by all the testing types. Here's the secret: **you don't need 100% coverage to ship quality software**. You need to test:

1. **What breaks = angry customers** (Authentication, payments, data loss)
2. **What's hard to test manually** (Edge cases, race conditions)
3. **What changes frequently** (Core features under active development)

Let's build your skills progressively while protecting the most critical paths first.

---

## Phase 1: Foundation (Week 1)
**Goal**: Understand the existing tests and run them confidently

### Day 1-2: Get Comfortable with the Test Suite

**Tasks**:
1. Run the existing tests and understand the output
2. Read through 2-3 existing test files to understand patterns
3. Break a test intentionally and see how it fails

**Commands to master**:
```bash
# Run all tests - watch the output carefully
cd /Users/bigdaddy/projects/thunder-text
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npm test -- src/__tests__/auth/shopify-auth.test.ts

# Run tests matching a pattern
npm test -- --testPathPattern="auth"

# See verbose output (helpful for debugging)
npm test -- --verbose
```

**Study these existing tests**:
- `src/__tests__/auth/shopify-auth.test.ts` - Authentication patterns
- `src/__tests__/security/tenant-isolation.test.ts` - Security testing
- `src/__tests__/components/HomePage.test.tsx` - Component testing

**Checkpoint**: You should be able to:
- [ ] Run all tests and explain what passed/failed
- [ ] Run a single test file
- [ ] Explain what one test is checking

### Day 3-4: Understand Test Structure

**The Anatomy of a Test**:
```typescript
// 1. DESCRIBE - Group related tests
describe('POST /api/content-center/generate', () => {

  // 2. SETUP - Run before each test (clean slate)
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 3. TEST - One specific scenario
  it('returns 401 when not authenticated', async () => {
    // ARRANGE - Set up the test conditions
    const request = createMockRequest('/api/content-center/generate', {
      method: 'POST',
      body: { topic: 'Summer sale' },
    });

    // ACT - Do the thing you're testing
    const response = await POST(request);
    const data = await response.json();

    // ASSERT - Check the results
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  // 4. CLEANUP - Run after tests (optional)
  afterAll(() => {
    // Clean up test data
  });
});
```

**The AAA Pattern** (Arrange-Act-Assert):
- **Arrange**: Set up test data, mocks, conditions
- **Act**: Call the function/API you're testing
- **Assert**: Verify the results match expectations

**Checkpoint**: You should be able to:
- [ ] Identify the AAA pattern in existing tests
- [ ] Explain what `beforeEach`, `afterAll`, `describe`, `it` do
- [ ] Understand why mocks are used

### Day 5: Write Your First Test

**Your first test**: Add a simple test to an existing file.

Pick something simple like testing a utility function or adding a test case to an existing describe block.

**Example - Add to existing auth tests**:
```typescript
// In src/__tests__/auth/shopify-auth.test.ts
// Add a new test case

it('rejects empty shop domain', async () => {
  const result = await validateShopDomain('');
  expect(result.valid).toBe(false);
  expect(result.error).toContain('required');
});
```

**Checkpoint**: You should be able to:
- [ ] Write a simple test that passes
- [ ] Write a test that intentionally fails, then fix it
- [ ] Commit your first test

---

## Phase 2: API Testing (Week 2)
**Goal**: Test the most critical API endpoints

### Why API Tests Matter Most

For a SaaS app, your API is the contract between frontend and backend. If APIs break:
- Users see errors
- Data gets corrupted
- Trust is lost

### Priority API Endpoints to Test

**Tier 1 - MUST TEST (Security/Money)**:
1. `/api/auth/*` - Authentication endpoints
2. `/api/business-profile/*` - User data
3. `/api/content-center/generate` - Core paid feature

**Tier 2 - SHOULD TEST (Core Features)**:
4. `/api/products/*` - Product management
5. `/api/aie/*` - AI generation
6. `/api/settings/*` - User preferences

**Tier 3 - NICE TO HAVE**:
7. Everything else

### Your First API Test (Step by Step)

**Target**: Test `/api/business-profile` GET endpoint

**Step 1**: Create the test file
```bash
mkdir -p src/__tests__/api/business-profile
touch src/__tests__/api/business-profile/route.test.ts
```

**Step 2**: Write the test structure
```typescript
// src/__tests__/api/business-profile/route.test.ts
import { GET, POST } from '@/app/api/business-profile/route';
import { createMockRequest, mockAuthenticatedSession } from '../../utils/test-helpers';

describe('Business Profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/business-profile', () => {
    it('returns 401 when not authenticated', async () => {
      // Your test here
    });

    it('returns profile for authenticated user', async () => {
      // Your test here
    });

    it('returns 404 when profile does not exist', async () => {
      // Your test here
    });
  });

  describe('POST /api/business-profile', () => {
    it('creates a new profile', async () => {
      // Your test here
    });

    it('validates required fields', async () => {
      // Your test here
    });
  });
});
```

**Step 3**: Fill in the tests one by one

### API Testing Patterns You'll Use

**Pattern 1: Testing Authentication**
```typescript
it('returns 401 when not authenticated', async () => {
  const request = createMockRequest('/api/business-profile');
  const response = await GET(request);

  expect(response.status).toBe(401);
});
```

**Pattern 2: Testing with Mocked Auth**
```typescript
it('returns profile for authenticated user', async () => {
  // Mock the auth to return a valid user
  mockAuthenticatedSession('shop-123');

  // Mock the database response
  jest.spyOn(supabaseAdmin, 'from').mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: 'profile-1', store_id: 'shop-123' },
      error: null,
    }),
  } as any);

  const request = createMockRequest('/api/business-profile');
  const response = await GET(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
});
```

**Pattern 3: Testing Validation**
```typescript
it('returns 400 for invalid input', async () => {
  mockAuthenticatedSession('shop-123');

  const request = createMockRequest('/api/business-profile', {
    method: 'POST',
    body: { /* missing required fields */ },
  });

  const response = await POST(request);

  expect(response.status).toBe(400);
});
```

### Weekly Goal
- [ ] Write tests for 2-3 API endpoints
- [ ] Cover: auth check, success case, validation error, not found
- [ ] Run coverage report and see improvement

---

## Phase 3: Edge Case Testing (Week 3)
**Goal**: Catch bugs before users do

### What Are Edge Cases?

Edge cases are the "weird" inputs that users will eventually try:
- Empty strings
- Very long strings
- Special characters
- Null/undefined values
- Boundary values (0, -1, max int)

### Edge Cases for Thunder Text

**Authentication Edge Cases**:
```typescript
describe('Authentication Edge Cases', () => {
  it('handles expired token gracefully', async () => {});
  it('handles malformed token', async () => {});
  it('handles missing Authorization header', async () => {});
  it('handles token with wrong signature', async () => {});
});
```

**Product Data Edge Cases**:
```typescript
describe('Product Edge Cases', () => {
  it('handles product with no images', async () => {});
  it('handles product with 10+ images', async () => {});
  it('handles very long product title (500 chars)', async () => {});
  it('handles unicode in product title: "Café ™ 🔥"', async () => {});
  it('handles HTML in product description', async () => {});
});
```

**AI Generation Edge Cases**:
```typescript
describe('AI Generation Edge Cases', () => {
  it('handles OpenAI timeout', async () => {});
  it('handles OpenAI rate limit (429)', async () => {});
  it('handles invalid image URL', async () => {});
  it('handles empty AI response', async () => {});
});
```

### How to Think About Edge Cases

Ask yourself:
1. **What's the smallest valid input?** (empty string, 0, null)
2. **What's the largest valid input?** (max length, huge numbers)
3. **What happens at boundaries?** (exactly at the limit)
4. **What if external services fail?** (timeouts, errors)
5. **What if data is malformed?** (wrong types, missing fields)

### Weekly Goal
- [ ] Add 5-10 edge case tests to existing test files
- [ ] Focus on authentication and AI generation
- [ ] Document any bugs you find!

---

## Phase 4: Integration Testing (Week 4)
**Goal**: Test components working together

### Unit vs Integration Tests

| Unit Tests | Integration Tests |
|------------|-------------------|
| Test one function | Test multiple components |
| Mock everything external | Use real database |
| Fast (ms) | Slower (seconds) |
| "Does this function work?" | "Do these pieces work together?" |

### When to Use Integration Tests

Use integration tests for:
1. **Database operations** - CRUD actually works
2. **Authentication flows** - OAuth tokens stored correctly
3. **Multi-step processes** - Interview → Generate → Save

### Your First Integration Test

**Target**: Test that business profile creation actually saves to database

```typescript
// src/__tests__/integration/business-profile.integration.test.ts
import { supabaseAdmin } from '@/lib/supabase/admin';

describe('Business Profile Integration', () => {
  const testShopId = `test-shop-${Date.now()}`;

  // Clean up after all tests
  afterAll(async () => {
    await supabaseAdmin
      .from('business_profiles')
      .delete()
      .eq('store_id', testShopId);

    await supabaseAdmin
      .from('shops')
      .delete()
      .eq('id', testShopId);
  });

  it('creates and retrieves a business profile', async () => {
    // 1. Create a test shop first
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .insert({ id: testShopId, shop_domain: 'test.myshopify.com' })
      .select()
      .single();

    // 2. Create a business profile
    const { data: profile, error } = await supabaseAdmin
      .from('business_profiles')
      .insert({
        store_id: testShopId,
        interview_data: { business_name: 'Test Business' },
      })
      .select()
      .single();

    // 3. Verify it was created
    expect(error).toBeNull();
    expect(profile.store_id).toBe(testShopId);

    // 4. Verify we can retrieve it
    const { data: retrieved } = await supabaseAdmin
      .from('business_profiles')
      .select()
      .eq('store_id', testShopId)
      .single();

    expect(retrieved.id).toBe(profile.id);
  });
});
```

### Running Integration Tests

```bash
# Integration tests have their own config
npm run test:integration

# Watch mode for integration tests
npm run test:integration:watch
```

### Weekly Goal
- [ ] Write 3-5 integration tests
- [ ] Test: profile creation, content saving, tenant isolation
- [ ] Ensure cleanup happens properly

---

## Phase 5: E2E Testing with Playwright (Week 5-6)
**Goal**: Test real user workflows in a browser

### Why E2E Tests?

E2E tests are the closest to how users actually use your app:
- Real browser
- Real clicks
- Real navigation

They catch issues that unit/integration tests miss:
- JavaScript errors in browser
- CSS breaking layouts
- Forms not submitting
- Navigation not working

### Setting Up Playwright

**Step 1**: Install Playwright
```bash
cd /Users/bigdaddy/projects/thunder-text
npm install -D @playwright/test
npx playwright install
```

**Step 2**: Create config file
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

**Step 3**: Create your first E2E test
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
```

### Critical E2E Tests for Thunder Text

**Must Have**:
1. Login flow works
2. Product list loads
3. AI generation completes
4. Settings save correctly

**Nice to Have**:
5. Bulk operations
6. Content Center uploads
7. Full onboarding flow

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run with UI (see browser)
npx playwright test --ui

# Run specific file
npx playwright test e2e/auth.spec.ts

# Debug mode (step through)
npx playwright test --debug
```

### Weekly Goal
- [ ] Set up Playwright
- [ ] Write 3-5 E2E tests for critical flows
- [ ] Add to CI pipeline (optional)

---

## Progress Tracking

### Week 1 Checklist
- [ ] Run existing tests successfully
- [ ] Understand test structure (AAA pattern)
- [ ] Write and commit first test
- [ ] Read through 3 existing test files

### Week 2 Checklist
- [ ] Create test file for 1 API endpoint
- [ ] Test auth, success, error cases
- [ ] Run coverage report
- [ ] Understand mocking patterns

### Week 3 Checklist
- [ ] Add 5+ edge case tests
- [ ] Test boundary conditions
- [ ] Test error handling
- [ ] Document any bugs found

### Week 4 Checklist
- [ ] Write 3+ integration tests
- [ ] Test real database operations
- [ ] Verify cleanup works
- [ ] Understand unit vs integration

### Week 5-6 Checklist
- [ ] Install and configure Playwright
- [ ] Write 3+ E2E tests
- [ ] Test critical user flows
- [ ] Screenshots on failure working

---

## Quick Reference

### Commands Cheat Sheet
```bash
# Unit tests
npm test                          # Run all
npm test -- --watch              # Watch mode
npm test -- --coverage           # With coverage
npm test -- path/to/test.ts      # Specific file

# Integration tests
npm run test:integration         # Run all
npm run test:integration:watch   # Watch mode

# E2E tests (after Playwright setup)
npx playwright test              # Run all
npx playwright test --ui         # With browser UI
npx playwright test --debug      # Debug mode
```

### Test File Naming
```
*.test.ts           → Unit test
*.test.tsx          → Component test
*.integration.test.ts → Integration test
*.spec.ts           → E2E test (Playwright)
```

### Common Assertions
```typescript
expect(value).toBe(expected)           // Exact equality
expect(value).toEqual(expected)        // Deep equality
expect(value).toBeTruthy()             // Truthy check
expect(value).toBeNull()               // Null check
expect(array).toContain(item)          // Array contains
expect(fn).toThrow()                   // Throws error
expect(fn).toHaveBeenCalled()          // Mock was called
expect(fn).toHaveBeenCalledWith(args)  // Mock called with args
```

---

## Getting Help

### When You're Stuck

1. **Read the error message carefully** - Jest errors are usually helpful
2. **Check if mocks are set up** - Most failures are mock issues
3. **Run single test in verbose mode** - `npm test -- --verbose path/to/test.ts`
4. **Add console.log temporarily** - See what values you're getting
5. **Ask for help** - Share the error message and test code

### Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- Thunder Text existing tests: `src/__tests__/`

---

## Final Advice

1. **Start small** - One test is better than no tests
2. **Test what scares you** - If you're nervous about breaking something, test it
3. **Don't aim for 100%** - 80% coverage of critical paths > 100% coverage of everything
4. **Tests are documentation** - Good tests show how code should work
5. **Failing tests are valuable** - They catch bugs before users do

You've got this! 🚀
