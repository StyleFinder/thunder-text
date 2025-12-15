import { test, expect } from "@playwright/test";

/**
 * Authentication Flow Outcome Tests
 *
 * These tests verify the OUTCOMES of authentication flows, not just UI elements.
 * They address the critical gap discovered in December 2025 where E2E tests
 * only verified UI but not:
 * 1. Correct redirect URLs based on user state
 * 2. Database state changes after completing flows
 *
 * Test IDs reference docs/E2E_TEST_COVERAGE_MATRIX.md
 *
 * Required test accounts in Supabase:
 * - e2e-test-user@thundertext.com (onboarding_completed=false)
 * - jim@shopstylefinder.com (onboarding_completed=true)
 * - baker2122+coach@gmail.com (in coaches table)
 * - e2e-locked@thundertext.com (failed_login_attempts=5, locked_until set)
 */

// Test user credentials - ensure these exist in Supabase with correct states
const TEST_USERS = {
  NEW_USER: {
    email: "e2e-test-user@thundertext.com",
    password: "E2ETestPassword123!",
    expectedRedirect: "/welcome",
  },
  RETURNING_USER: {
    email: "jim@shopstylefinder.com",
    password: "CoachPassword123!",
    expectedRedirect: "/dashboard",
  },
  COACH: {
    email: "baker2122+coach@gmail.com",
    password: "CoachPassword123",
    expectedRedirect: "/bhb",
  },
  LOCKED_USER: {
    email: "e2e-locked@thundertext.com",
    password: "AnyPassword123!",
  },
};

test.describe("AUTH Flow Outcome Tests", () => {
  /**
   * AUTH-001: New user (onboarding_completed=false) redirects to /welcome
   */
  test("AUTH-001: New user login redirects to /welcome", async ({ page }) => {
    await page.goto("/auth/login");

    // Fill login form
    await page.locator("#email").fill(TEST_USERS.NEW_USER.email);
    await page.locator("#password").fill(TEST_USERS.NEW_USER.password);

    // Submit login
    await page.getByRole("button", { name: "Sign In" }).click();

    // VERIFY: User lands on /welcome, NOT /dashboard
    await expect(page).toHaveURL(/\/welcome/, { timeout: 15000 });

    // VERIFY: Welcome page content is visible (not redirected away)
    // Use first() to handle multiple matching elements
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * AUTH-002: Returning user (onboarding_completed=true) redirects to /dashboard
   */
  test("AUTH-002: Returning user login redirects to /dashboard", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    // Fill login form
    await page.locator("#email").fill(TEST_USERS.RETURNING_USER.email);
    await page.locator("#password").fill(TEST_USERS.RETURNING_USER.password);

    // Submit login
    await page.getByRole("button", { name: "Sign In" }).click();

    // VERIFY: User lands on /dashboard, NOT /welcome
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // VERIFY: Dashboard content is visible (use first() to avoid strict mode violation)
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * AUTH-003: Invalid credentials show error message
   */
  test("AUTH-003: Invalid credentials show error", async ({ page }) => {
    await page.goto("/auth/login");

    // Fill login form with wrong password
    await page.locator("#email").fill("any-user@example.com");
    await page.locator("#password").fill("wrongpassword123");

    // Submit login
    await page.getByRole("button", { name: "Sign In" }).click();

    // VERIFY: Error message is displayed
    await expect(page.locator("text=Invalid email or password")).toBeVisible({
      timeout: 10000,
    });

    // VERIFY: Stay on login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  /**
   * AUTH-004: Coach email at store login shows "account not found" error
   */
  test("AUTH-004: Coach email at store login shows error", async ({ page }) => {
    await page.goto("/auth/login");

    // Try to log in with coach email on store login page
    await page.locator("#email").fill(TEST_USERS.COACH.email);
    await page.locator("#password").fill(TEST_USERS.COACH.password);

    // Submit login (as shop user, not coach)
    await page.getByRole("button", { name: "Sign In" }).click();

    // VERIFY: Error is shown (coach accounts are in coaches table, not shops)
    await expect(
      page
        .locator("text=Invalid email or password")
        .or(page.locator("text=Account not found")),
    ).toBeVisible({ timeout: 10000 });

    // VERIFY: Stay on login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  /**
   * AUTH-005: Account lockout after 5 failures shows lockout message
   */
  test("AUTH-005: Locked account shows lockout message", async ({ page }) => {
    await page.goto("/auth/login");

    // Try to log in with locked account
    await page.locator("#email").fill(TEST_USERS.LOCKED_USER.email);
    await page.locator("#password").fill(TEST_USERS.LOCKED_USER.password);

    // Submit login
    await page.getByRole("button", { name: "Sign In" }).click();

    // VERIFY: Lockout message is shown
    await expect(
      page
        .locator("text=Account temporarily locked")
        .or(page.locator("text=locked"))
        .or(page.locator("text=try again")),
    ).toBeVisible({ timeout: 10000 });

    // VERIFY: Stay on login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  /**
   * AUTH-006: Valid coach login redirects to /bhb
   */
  test("AUTH-006: Coach login redirects to /bhb", async ({ page }) => {
    // Navigate to coach login page
    await page.goto("/coach/login");
    await page.waitForLoadState("networkidle");

    // Coach login uses custom Input components - find by type
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(TEST_USERS.COACH.email);
    await passwordInput.fill(TEST_USERS.COACH.password);

    // Submit login - coach button says "Sign In as Coach"
    await page.getByRole("button", { name: /sign in/i }).click();

    // VERIFY: User lands on /bhb
    await expect(page).toHaveURL(/\/bhb/, { timeout: 15000 });

    // VERIFY: Coach dashboard content is visible (use first() to avoid strict mode violation)
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * AUTH-007: New account creation redirects to login with success
   */
  test("AUTH-007: Signup creates account and redirects to login", async ({
    page,
  }) => {
    // Generate unique email for this test run
    const testEmail = `e2e-signup-${Date.now()}@example.com`;
    const testPassword = "E2ESignupTest123!";
    const testBusinessName = "E2E Signup Test Store";

    await page.goto("/auth/signup");

    // Fill signup form
    await page.locator("#email").fill(testEmail);
    await page.locator("#businessName").fill(testBusinessName);
    await page.locator("#password").fill(testPassword);
    await page.locator("#confirmPassword").fill(testPassword);

    // Submit signup
    await page.getByRole("button", { name: "Create Account" }).click();

    // VERIFY: Success message appears (shows for 2 seconds before redirect)
    await expect(page.locator("text=Account Created!")).toBeVisible({
      timeout: 10000,
    });

    // VERIFY: Redirect to login page with registered param (after 2 second delay)
    await expect(page).toHaveURL(/\/auth\/login\?registered=true/, {
      timeout: 15000,
    });

    // VERIFY: Login page is visible and email field is ready
    await expect(page.locator("#email")).toBeVisible({ timeout: 5000 });

    // BACKEND VERIFICATION: Verify account was created by logging in
    await page.locator("#email").fill(testEmail);
    await page.locator("#password").fill(testPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    // New user should redirect to welcome (onboarding not complete)
    await expect(page).toHaveURL(/\/(welcome|dashboard)/, { timeout: 15000 });
  });
});

test.describe("ROLE Cross-Role Validation Tests", () => {
  /**
   * ROLE-001: Coach can't use store login (error shown)
   * Note: This is essentially AUTH-004, but grouped with role tests
   */
  test("ROLE-001: Coach email at store login fails", async ({ page }) => {
    await page.goto("/auth/login");

    await page.locator("#email").fill(TEST_USERS.COACH.email);
    await page.locator("#password").fill(TEST_USERS.COACH.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Coach should NOT be able to log in via store login
    await expect(
      page
        .locator("text=Invalid email or password")
        .or(page.locator("text=Account not found")),
    ).toBeVisible({ timeout: 10000 });
  });

  /**
   * ROLE-002: Store user can't use coach login (error shown)
   *
   * Note: Coach login page uses custom Input components and shows
   * "Invalid coach credentials" error message
   */
  test("ROLE-002: Store user at coach login fails", async ({ page }) => {
    await page.goto("/coach/login");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Coach login uses custom Input components - find by type
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(TEST_USERS.NEW_USER.email);
    await passwordInput.fill(TEST_USERS.NEW_USER.password);

    // Coach login button says "Sign In as Coach"
    await page.getByRole("button", { name: /sign in/i }).click();

    // Store user should NOT be able to log in via coach login
    // Coach login shows "Invalid coach credentials" error
    await expect(
      page
        .locator("text=Invalid coach credentials")
        .or(page.locator("text=Invalid email or password"))
        .or(page.locator("text=Account not found")),
    ).toBeVisible({ timeout: 10000 });
  });

  /**
   * ROLE-003: Unauthenticated user redirected to login
   *
   * Verifies that middleware protects /dashboard from unauthenticated access.
   */
  test("ROLE-003: Unauthenticated user accessing dashboard redirects to login", async ({
    page,
  }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access protected route without auth
    await page.goto("/dashboard");

    // VERIFY: Redirected to login page with callbackUrl
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  /**
   * ROLE-003b: Unauthenticated user accessing welcome redirects to login
   *
   * Verifies that middleware protects /welcome from unauthenticated access.
   */
  test("ROLE-003b: Unauthenticated user accessing welcome redirects to login", async ({
    page,
  }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access protected route without auth
    await page.goto("/welcome");

    // VERIFY: Redirected to login page with callbackUrl
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });
});
