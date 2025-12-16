# E2E Test Coverage Matrix

> Human-readable documentation to verify all E2E user flows are fully tested, including backend state verification.

**Created**: December 13, 2025
**Purpose**: Prevent bugs like the login redirect and onboarding completion issues we discovered

---

## The Problem We're Solving

Our E2E tests were testing **UI elements** but not **backend outcomes**. This allowed critical bugs to slip through:

1. **Login redirect bug**: Login page always redirected to `/welcome` regardless of `onboarding_completed` status
2. **Onboarding completion bug**: `/api/onboarding/complete` was querying by wrong column (`shop_domain` instead of `id`)

These bugs would have been caught if our E2E tests verified:

- What URL the user lands on after login (based on their state)
- That database fields actually change after completing flows

---

## Test Coverage Categories

### Category 1: UI Element Tests (EXISTING)

- Form fields are visible
- Buttons are clickable
- Navigation links work
- Error messages display

### Category 2: Flow Outcome Tests (MISSING - NEEDED)

- User ends up at correct URL based on their state
- Database state changes correctly
- Session is established correctly
- Error handling works for edge cases

### Category 3: Cross-Role Tests (MISSING - NEEDED)

- Coach can't use store login
- Store user can't access coach portal
- Unauthenticated user redirected correctly

---

## Authentication Flow Matrix

### Store User Login (email/password)

| Scenario                | Pre-condition                  | Action                       | Expected URL                             | DB Verification  | Test Status |
| ----------------------- | ------------------------------ | ---------------------------- | ---------------------------------------- | ---------------- | ----------- |
| New user login          | `onboarding_completed = false` | Login with valid credentials | `/welcome`                               | Session created  | **MISSING** |
| Returning user login    | `onboarding_completed = true`  | Login with valid credentials | `/dashboard?shop=<domain>`               | Session created  | **MISSING** |
| Invalid credentials     | Any                            | Login with wrong password    | Stay on `/auth/login` with error         | No session       | EXISTING    |
| Account locked          | 5+ failed attempts             | Login attempt                | Stay on `/auth/login` with lockout error | lockout recorded | **MISSING** |
| Coach using store login | Coach account exists           | Login with coach email       | Stay on `/auth/login` with error         | No session       | **MISSING** |
| Nonexistent account     | No account                     | Login with any credentials   | Stay on `/auth/login` with error         | No session       | **MISSING** |

### Coach Login

| Scenario                  | Pre-condition                   | Action                  | Expected URL    | DB Verification         | Test Status |
| ------------------------- | ------------------------------- | ----------------------- | --------------- | ----------------------- | ----------- |
| Valid coach login         | Coach exists in `coaches` table | Login at `/coach/login` | `/bhb`          | Session with coach role | **MISSING** |
| Store user at coach login | Shop exists                     | Login at `/coach/login` | Stay with error | No session              | **MISSING** |

### Signup Flow

| Scenario             | Pre-condition    | Action                      | Expected URL                      | DB Verification                                | Test Status |
| -------------------- | ---------------- | --------------------------- | --------------------------------- | ---------------------------------------------- | ----------- |
| New account creation | Email not in use | Complete signup form        | `/auth/login?registered=true`     | Shop created with `onboarding_completed=false` | PARTIAL     |
| Duplicate email      | Email exists     | Submit signup               | Stay on `/auth/signup` with error | No new record                                  | EXISTING    |
| Password mismatch    | None             | Submit mismatched passwords | Stay with error                   | No record                                      | EXISTING    |

---

## Onboarding Flow Matrix

### Main Onboarding (`/welcome`)

| Step                  | Scenario             | Action                  | Expected URL             | DB Verification                                              | Test Status            |
| --------------------- | -------------------- | ----------------------- | ------------------------ | ------------------------------------------------------------ | ---------------------- |
| Step 1: Welcome       | New user             | Click "Get Started"     | `/welcome?step=shopify`  | None                                                         | EXISTING (UI only)     |
| Step 2: Connect Store | Store domain entered | Click "Connect Store"   | OAuth redirect           | None yet                                                     | EXISTING (UI only)     |
| Step 3: Ad Platforms  | After OAuth return   | Click "Skip for Now"    | `/welcome?step=complete` | None                                                         | EXISTING (UI only)     |
| Step 4: Complete      | Ready to finish      | Click "Go to Dashboard" | `/dashboard`             | `onboarding_completed = true`, `onboarding_completed_at` set | **MISSING - CRITICAL** |

### Content Center Onboarding (`/content-center/onboarding`)

| Step            | Scenario         | Action                         | Expected URL    | DB Verification       | Test Status        |
| --------------- | ---------------- | ------------------------------ | --------------- | --------------------- | ------------------ |
| Step 1: Welcome | New user         | Click "Get Started"            | Step 2          | None                  | EXISTING           |
| Step 2: Upload  | Samples uploaded | Click "Generate Voice Profile" | Step 3          | None                  | EXISTING (UI only) |
| Step 3-5        | Various          | Continue flow                  | Step completion | Voice profile created | **MISSING**        |

---

## Post-Onboarding Verification Matrix

### Dashboard Access

| Scenario                              | Pre-condition                               | Action                   | Expected Result                                 | Test Status        |
| ------------------------------------- | ------------------------------------------- | ------------------------ | ----------------------------------------------- | ------------------ |
| Authenticated + onboarding complete   | Valid session, `onboarding_completed=true`  | Navigate to `/dashboard` | Dashboard loads                                 | **MISSING**        |
| Authenticated + onboarding incomplete | Valid session, `onboarding_completed=false` | Navigate to `/dashboard` | Redirect to `/welcome` or show incomplete state | **MISSING**        |
| Unauthenticated                       | No session                                  | Navigate to `/dashboard` | Redirect to `/auth/login`                       | EXISTING (partial) |

---

## How to Verify Each Test Category

### For UI Tests (EXISTING)

```typescript
// Example: Check form field exists
await expect(page.locator("#email")).toBeVisible();
```

### For Flow Outcome Tests (NEEDED)

```typescript
// Example: Verify correct redirect based on state
// This requires a test user with known state in the database
test("returning user redirects to dashboard after login", async ({ page }) => {
  // Pre-condition: Test user has onboarding_completed = true

  await page.goto("/auth/login");
  await page.locator("#email").fill("returning-user@test.com");
  await page.locator("#password").fill("TestPassword123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  // VERIFY: User lands on dashboard, NOT welcome
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  // VERIFY: Can see dashboard content (not redirected away)
  await expect(page.locator("text=Welcome back")).toBeVisible();
});
```

### For Database Verification Tests (NEEDED)

```typescript
// Example: Verify onboarding completion updates database
test("completing onboarding sets onboarding_completed flag", async ({
  page,
  request,
}) => {
  // Navigate through full onboarding flow
  // ...

  await page.getByRole("button", { name: "Go to Dashboard" }).click();

  // VERIFY: Database was updated via API call
  const response = await request.get("/api/onboarding/status");
  const data = await response.json();

  expect(data.data.onboarding_completed).toBe(true);
  expect(data.data.onboarding_completed_at).toBeDefined();
});
```

---

## Test Data Requirements

### Required Test Accounts

| Account              | Email                                | State                          | Purpose                   |
| -------------------- | ------------------------------------ | ------------------------------ | ------------------------- |
| New Store User       | `e2e-new-user@thundertext.com`       | `onboarding_completed = false` | Test new user flows       |
| Returning Store User | `e2e-returning-user@thundertext.com` | `onboarding_completed = true`  | Test returning user flows |
| Coach User           | `e2e-coach@thundertext.com`          | In `coaches` table             | Test coach flows          |
| Locked Account       | `e2e-locked@thundertext.com`         | 5+ failed login attempts       | Test lockout flow         |

### Test Data Setup Script

Create a script that:

1. Resets test accounts to known state before E2E runs
2. Creates accounts if they don't exist
3. Sets `onboarding_completed` flags appropriately

---

## Remediation Checklist

### Phase 1: Critical Flow Tests ✅ COMPLETE

- [x] **AUTH-001**: Login with `onboarding_completed=false` redirects to `/welcome`
- [x] **AUTH-002**: Login with `onboarding_completed=true` redirects to `/dashboard`
- [x] **AUTH-003**: Invalid credentials show error message
- [x] **AUTH-004**: Coach email at store login shows error
- [x] **AUTH-005**: Locked account shows lockout message
- [x] **AUTH-006**: Valid coach login redirects to `/bhb`
- [x] **AUTH-007**: Signup creates account and redirects to login
- [x] **ONBOARD-001**: Completing onboarding sets `onboarding_completed=true` in database
- [x] **ONBOARD-002**: `onboarding_completed_at` timestamp is set
- [x] **ONBOARD-003**: Dashboard accessible after onboarding completion

### Phase 2: Cross-Role Tests ✅ COMPLETE

- [x] **ROLE-001**: Coach email at store login fails
- [x] **ROLE-002**: Store user at `/coach/login` shows error
- [x] **ROLE-003**: Unauthenticated user accessing dashboard redirects to login
- [x] **ROLE-003b**: Unauthenticated user accessing welcome redirects to login

### Phase 3: Edge Case Tests ✅ COMPLETE

- [x] **EDGE-001**: Account lockout after 5 failed attempts (incremental)
- [x] **EDGE-002**: Session persistence across page refreshes
- [x] **EDGE-002b**: Session persists across protected page navigation
- [x] **EDGE-003**: Invalid/cleared session redirects to login
- [x] **EDGE-003b**: Corrupted session handled gracefully

---

## File Locations for Tests

| Test Category         | File                                  | Status     |
| --------------------- | ------------------------------------- | ---------- |
| Login flow outcomes   | `e2e/auth-flows.spec.ts`              | ✅ CREATED |
| Onboarding completion | `e2e/onboarding-flows.spec.ts`        | ✅ CREATED |
| Cross-role validation | `e2e/auth-flows.spec.ts` (ROLE tests) | ✅ CREATED |
| Edge case tests       | `e2e/edge-cases.spec.ts`              | ✅ CREATED |

---

## Review Checklist for Humans

When reviewing E2E test coverage, verify each test answers these questions:

### For Login Tests

1. Does the test verify the user lands on the CORRECT URL based on their state?
2. Does the test verify error messages for invalid scenarios?
3. Does the test use accounts with KNOWN database states?

### For Onboarding Tests

1. Does the test verify the database flag changes after completion?
2. Does the test verify the user can access protected pages after completion?
3. Does the test verify timestamps are recorded?

### For Role-Based Tests

1. Does the test verify each user type can ONLY access their allowed pages?
2. Does the test verify cross-role access attempts show appropriate errors?

---

## Summary

| Category                  | Tests    | Status      | Priority |
| ------------------------- | -------- | ----------- | -------- |
| UI Elements               | 94 tests | ✅ Complete | Low      |
| Flow Outcomes (AUTH)      | 11 tests | ✅ Complete | Done     |
| DB Verification (ONBOARD) | 3 tests  | ✅ Complete | Done     |
| Cross-Role (ROLE)         | 4 tests  | ✅ Complete | Done     |
| Edge Cases (EDGE)         | 5 tests  | ✅ Complete | Done     |

**Completed E2E Tests**: 23 new tests (Phase 1 + Phase 2 + Phase 3) ✅ ALL COMPLETE
**Remaining Tests**: 0

---

## Change Log

| Date       | Change                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------- |
| 2025-12-13 | Document created after discovering login redirect and onboarding completion bugs              |
| 2025-12-14 | Phase 1 & 2 complete: 18 tests implemented in auth-flows.spec.ts and onboarding-flows.spec.ts |
| 2025-12-14 | Middleware updated to protect routes from unauthenticated access                              |
| 2025-12-14 | Test user passwords set in Supabase (jim@shopstylefinder.com, baker2122+coach@gmail.com)      |
| 2025-12-14 | Phase 3 complete: 5 edge case tests implemented in edge-cases.spec.ts                         |
| 2025-12-14 | All 23 new E2E tests passing - remediation complete                                           |
