import { test as setup, expect } from "@playwright/test";
import path from "path";

/**
 * Authentication Setup for Reusable State
 *
 * This setup file runs ONCE before all tests to:
 * 1. Create a test account (if it doesn't exist)
 * 2. Log in with test credentials
 * 3. Save the authentication state to a file
 *
 * All subsequent tests can reuse this authenticated state,
 * making tests faster by avoiding repeated login flows.
 *
 * Run order: auth.setup.ts -> all other tests
 */

// Path where auth state will be saved
const authFile = path.join(__dirname, ".auth/user.json");

// Test user credentials
// Uses environment variables in CI, falls back to defaults for local development
const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || "e2e-test-user@thundertext.com",
  password: process.env.E2E_TEST_PASSWORD || "E2ETestPassword123!",
  businessName: process.env.E2E_TEST_BUSINESS_NAME || "E2E Test Business",
};

setup("authenticate and save state", async ({ page }) => {
  // First, try to sign up (this will fail if account exists, which is fine)
  await page.goto("/auth/signup");

  // Check if we're on the signup page
  const isSignupPage = await page.locator("#email").isVisible();

  if (isSignupPage) {
    // Try to create the test account
    await page.locator("#email").fill(TEST_USER.email);
    await page.locator("#businessName").fill(TEST_USER.businessName);
    await page.locator("#password").fill(TEST_USER.password);
    await page.locator("#confirmPassword").fill(TEST_USER.password);

    await page.getByRole("button", { name: "Create Account" }).click();

    // Wait a moment for the response
    await page.waitForTimeout(2000);

    // Check if signup succeeded or if we got "email already exists" error
    const hasError = await page
      .locator("text=email already exists")
      .isVisible()
      .catch(() => false);
    const hasSuccess = await page
      .locator("text=Account Created")
      .isVisible()
      .catch(() => false);

    if (hasSuccess) {
      // Account created, wait for redirect to login
      await page.waitForURL("/auth/login*", { timeout: 10000 });
    } else if (hasError) {
      // Account already exists, go to login
      await page.goto("/auth/login");
    } else {
      // Check for any other error
      const pageContent = await page.content();
      if (pageContent.includes("Account Created")) {
        await page.waitForURL("/auth/login*", { timeout: 10000 });
      } else {
        // Just go to login and try there
        await page.goto("/auth/login");
      }
    }
  }

  // Now log in
  await page.goto("/auth/login");

  // Fill in login credentials
  await page.locator("#email").fill(TEST_USER.email);
  await page.locator("#password").fill(TEST_USER.password);

  // Click sign in
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for successful login - should redirect to /welcome or /dashboard
  await expect(page).toHaveURL(/\/(welcome|dashboard)/, { timeout: 15000 });

  // Verify we're authenticated by checking for expected elements
  // The welcome page should show "Welcome to BoutiqueHub Black" or similar
  const pageTitle = page.locator("h1");
  await expect(pageTitle).toBeVisible({ timeout: 10000 });

  // Save the authenticated state to a file
  await page.context().storageState({ path: authFile });

  console.log("Authentication state saved to:", authFile);
});

// Export for use in other files
export { TEST_USER, authFile };
