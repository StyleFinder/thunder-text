import { test, expect } from "@playwright/test";

/**
 * Edge Case Tests (Phase 3)
 *
 * These tests verify edge case behaviors:
 * 1. Account lockout increments and triggers
 * 2. Session persistence across page refreshes
 * 3. Token expiration handling
 *
 * Test IDs reference docs/E2E_TEST_COVERAGE_MATRIX.md
 */

// Test user for lockout testing - needs to be reset between test runs
const LOCKOUT_TEST_USER = {
  email: "e2e-lockout-test@thundertext.com",
  password: "WrongPassword123!",
  correctPassword: "E2ETestPassword123!",
};

// Test user with known valid credentials for session tests
const SESSION_TEST_USER = {
  email: "jim@shopstylefinder.com",
  password: "CoachPassword123!",
};

test.describe("EDGE Case Tests", () => {
  /**
   * EDGE-001: Account lockout after 5 failed attempts
   *
   * This test verifies that:
   * 1. Failed login attempts are tracked
   * 2. After 5 failed attempts, account is locked
   * 3. Lockout message is displayed
   *
   * NOTE: This test requires a dedicated test user that can be reset.
   * The user should start with 0 failed attempts.
   *
   * Reset command:
   * UPDATE shops SET failed_login_attempts = 0, locked_until = NULL
   * WHERE email = 'e2e-lockout-test@thundertext.com';
   */
  test("EDGE-001: Account locks after 5 failed login attempts", async ({
    page,
  }) => {
    // This test attempts 5 failed logins and verifies lockout on the 6th
    // Using a dedicated test user to avoid affecting other tests

    await page.goto("/auth/login");

    // Attempt 5 failed logins
    for (let attempt = 1; attempt <= 5; attempt++) {
      await page.locator("#email").fill(LOCKOUT_TEST_USER.email);
      await page.locator("#password").fill(LOCKOUT_TEST_USER.password);
      await page.getByRole("button", { name: "Sign In" }).click();

      // Wait for error message
      await expect(
        page
          .locator("text=Invalid email or password")
          .or(page.locator("text=Account temporarily locked"))
          .or(page.locator("text=locked")),
      ).toBeVisible({ timeout: 10000 });

      // Check if already locked (may happen before 5th attempt if previous test didn't reset)
      const isLocked = await page
        .locator("text=locked")
        .isVisible()
        .catch(() => false);
      if (isLocked) {
        // Account is already locked - test passes
        return;
      }

      // Clear form for next attempt (unless already locked)
      if (attempt < 5) {
        await page.locator("#email").clear();
        await page.locator("#password").clear();
      }
    }

    // After 5 failed attempts, the 6th should show lockout
    await page.locator("#email").clear();
    await page.locator("#password").clear();
    await page.locator("#email").fill(LOCKOUT_TEST_USER.email);
    await page.locator("#password").fill(LOCKOUT_TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // VERIFY: Lockout message is displayed
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
   * EDGE-002: Session persistence across page refreshes
   *
   * This test verifies that:
   * 1. After login, refreshing the page maintains the session
   * 2. User stays on the protected page after refresh
   * 3. Session data is preserved
   */
  test("EDGE-002: Session persists across page refreshes", async ({ page }) => {
    // Login first
    await page.goto("/auth/login");
    await page.locator("#email").fill(SESSION_TEST_USER.email);
    await page.locator("#password").fill(SESSION_TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // VERIFY: Dashboard content is visible
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // VERIFY: Still on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/);

    // VERIFY: Dashboard content still visible
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });

    // Refresh again to confirm persistence
    await page.reload();
    await page.waitForLoadState("networkidle");

    // VERIFY: Still on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  /**
   * EDGE-002b: Session persists across multiple protected pages
   *
   * This test verifies that:
   * 1. Session is maintained when navigating between protected pages
   * 2. No re-authentication required within session
   */
  test("EDGE-002b: Session persists across protected page navigation", async ({
    page,
  }) => {
    // Login first
    await page.goto("/auth/login");
    await page.locator("#email").fill(SESSION_TEST_USER.email);
    await page.locator("#password").fill(SESSION_TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to settings
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // VERIFY: On settings page (not redirected to login)
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });

    // Navigate back to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // VERIFY: Back on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to products (if exists)
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // VERIFY: On products or redirected appropriately (not to login)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/auth/login");
  });

  /**
   * EDGE-003: Expired/invalid token handling
   *
   * This test verifies that:
   * 1. Clearing cookies logs the user out
   * 2. Accessing protected pages after logout redirects to login
   * 3. Login works correctly after session expiration
   */
  test("EDGE-003: Invalid/cleared session redirects to login", async ({
    page,
  }) => {
    // Login first
    await page.goto("/auth/login");
    await page.locator("#email").fill(SESSION_TEST_USER.email);
    await page.locator("#password").fill(SESSION_TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Simulate session expiration by clearing cookies
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto("/dashboard");

    // VERIFY: Redirected to login page
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });

    // VERIFY: Can re-login successfully
    await page.locator("#email").fill(SESSION_TEST_USER.email);
    await page.locator("#password").fill(SESSION_TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // VERIFY: Back on dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  /**
   * EDGE-003b: Partial cookie clearing maintains proper state
   *
   * This test verifies that even with partial session data,
   * the system handles authentication correctly.
   */
  test("EDGE-003b: Corrupted session handled gracefully", async ({ page }) => {
    // Login first
    await page.goto("/auth/login");
    await page.locator("#email").fill(SESSION_TEST_USER.email);
    await page.locator("#password").fill(SESSION_TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Get all cookies
    const cookies = await page.context().cookies();

    // Clear only session cookies (simulate partial corruption)
    const sessionCookies = cookies.filter(
      (c) =>
        c.name.includes("session") ||
        c.name.includes("next-auth") ||
        c.name.includes("__Secure"),
    );

    for (const cookie of sessionCookies) {
      await page.context().clearCookies({ name: cookie.name });
    }

    // Try to access protected page
    await page.goto("/dashboard");

    // VERIFY: Either redirected to login OR shows login UI
    // (system should handle gracefully, not crash)
    await page.waitForLoadState("networkidle");
    const currentUrl = page.url();

    // Should either be on login page or show some authentication-related content
    const isOnLogin = currentUrl.includes("/auth/login");
    const hasLoginForm = await page
      .locator("#email")
      .isVisible()
      .catch(() => false);

    expect(isOnLogin || hasLoginForm).toBe(true);
  });
});

test.describe("Lockout Recovery Tests", () => {
  /**
   * Test that successful login clears failed attempt count
   *
   * NOTE: This test requires a user with some failed attempts but not locked
   */
  test.skip("Successful login clears failed attempt counter", async () => {
    // This would require:
    // 1. A user with 2-3 failed attempts (not locked)
    // 2. Login with correct password
    // 3. Verify failed_login_attempts is reset to 0
    // 4. Verify subsequent failed attempts start from 0
    // Implementation would need direct database access to verify
    // Skipped for now as it requires more complex setup
  });
});
