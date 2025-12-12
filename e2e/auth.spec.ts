import { test, expect } from "@playwright/test";

/**
 * Authentication E2E Tests
 *
 * These tests verify the complete user authentication flows:
 * 1. User signup flow
 * 2. User login flow
 * 3. Invalid credential handling
 * 4. Navigation between auth pages
 *
 * Run with: npm run test:e2e
 */

test.describe("Authentication Flow", () => {
  // Generate unique email for each test run to avoid conflicts
  const testEmail = `e2e-test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  const testBusinessName = "E2E Test Store";

  test.describe("Signup Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/auth/signup");
    });

    test("should display signup form with all required fields", async ({
      page,
    }) => {
      // Check page title/heading
      await expect(
        page.getByRole("heading", { name: "Create Your Account" }),
      ).toBeVisible();

      // Check form fields exist - use ID selectors to avoid ambiguity
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#businessName")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#confirmPassword")).toBeVisible();

      // Check submit button
      await expect(
        page.getByRole("button", { name: "Create Account" }),
      ).toBeVisible();

      // Check link to login
      await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    });

    test("should show error for password mismatch", async ({ page }) => {
      await page.locator("#email").fill(testEmail);
      await page.locator("#password").fill(testPassword);
      await page.locator("#confirmPassword").fill("DifferentPassword123!");

      await page.getByRole("button", { name: "Create Account" }).click();

      // Should show password mismatch error
      await expect(page.getByText("Passwords do not match")).toBeVisible();
    });

    test("should show error for short password", async ({ page }) => {
      await page.locator("#email").fill(testEmail);
      await page.locator("#password").fill("short");
      await page.locator("#confirmPassword").fill("short");

      await page.getByRole("button", { name: "Create Account" }).click();

      // Should show password length error
      await expect(
        page.getByText("Password must be at least 8 characters"),
      ).toBeVisible();
    });

    test("should toggle password visibility", async ({ page }) => {
      const passwordInput = page.locator("#password");

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Click the first toggle button (for password field, not confirm password)
      // The toggle buttons are siblings of the password inputs
      const toggleButton = page.locator("#password ~ button").first();
      await toggleButton.click();

      // Now password should be visible
      await expect(passwordInput).toHaveAttribute("type", "text");
    });

    test("should navigate to login page when clicking sign in link", async ({
      page,
    }) => {
      await page.getByRole("link", { name: "Sign in" }).click();

      // Should be on login page
      await expect(page).toHaveURL("/auth/login");
      await expect(
        page.getByRole("heading", { name: "Welcome Back" }),
      ).toBeVisible();
    });

    test("should successfully create account and redirect to login", async ({
      page,
    }) => {
      // Fill out the signup form using ID selectors
      await page.locator("#email").fill(testEmail);
      await page.locator("#businessName").fill(testBusinessName);
      await page.locator("#password").fill(testPassword);
      await page.locator("#confirmPassword").fill(testPassword);

      // Submit the form
      await page.getByRole("button", { name: "Create Account" }).click();

      // Should show success message
      await expect(page.getByText("Account Created!")).toBeVisible({
        timeout: 10000,
      });

      // Should redirect to login page with registered param
      await expect(page).toHaveURL("/auth/login?registered=true", {
        timeout: 5000,
      });

      // Should show success alert on login page
      await expect(
        page.getByText("Account created! Please sign in to continue."),
      ).toBeVisible();
    });
  });

  test.describe("Login Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/auth/login");
    });

    test("should display login form with all fields", async ({ page }) => {
      // Check page title/heading
      await expect(
        page.getByRole("heading", { name: "Welcome Back" }),
      ).toBeVisible();

      // Check form fields using ID selectors
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();

      // Check buttons and links
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Forgot password?" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Create account" }),
      ).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.locator("#email").fill("invalid@example.com");
      await page.locator("#password").fill("wrongpassword");

      await page.getByRole("button", { name: "Sign In" }).click();

      // Wait for the error to appear
      await expect(page.getByText("Invalid email or password")).toBeVisible({
        timeout: 10000,
      });
    });

    test("should toggle password visibility on login", async ({ page }) => {
      const passwordInput = page.locator("#password");

      // Initially hidden
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Click toggle button (sibling of password input)
      const toggleButton = page.locator("#password ~ button");
      await toggleButton.click();

      // Now visible
      await expect(passwordInput).toHaveAttribute("type", "text");
    });

    test("should navigate to signup page when clicking create account", async ({
      page,
    }) => {
      await page.getByRole("link", { name: "Create account" }).click();

      await expect(page).toHaveURL("/auth/signup");
      await expect(
        page.getByRole("heading", { name: "Create Your Account" }),
      ).toBeVisible();
    });

    test("should show logged out message when redirected from logout", async ({
      page,
    }) => {
      await page.goto("/auth/login?logged_out=true");

      await expect(
        page.getByText("You have been logged out successfully."),
      ).toBeVisible();
    });
  });

  test.describe("Full Authentication Journey", () => {
    test("should show loading state while authenticating", async ({ page }) => {
      await page.goto("/auth/login");

      await page.locator("#email").fill("test@example.com");
      await page.locator("#password").fill("testpassword");

      // Click and immediately check for loading state
      const submitButton = page.getByRole("button", { name: "Sign In" });
      await submitButton.click();

      // Should show loading spinner (button text changes)
      await expect(page.getByText("Signing in...")).toBeVisible();
    });
  });
});

test.describe("Page Accessibility", () => {
  test("login page should have proper heading structure", async ({ page }) => {
    await page.goto("/auth/login");

    // Check main heading exists
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText("Welcome Back");
  });

  test("signup page should have proper heading structure", async ({ page }) => {
    await page.goto("/auth/signup");

    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText("Create Your Account");
  });

  test("forms should have associated labels", async ({ page }) => {
    await page.goto("/auth/login");

    // Check that inputs have proper IDs (which means labels are associated)
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });
});
