import { test, expect } from "@playwright/test";

/**
 * Onboarding Flow E2E Tests
 *
 * Tests the main onboarding flow at /welcome which includes:
 * 1. Welcome step - Store profile form
 * 2. Connect Store - Platform selection and Shopify connection
 * 3. Ad Platforms - Social platform connections (optional)
 * 4. Complete - Success screen and dashboard redirect
 *
 * These tests run with authenticated state from auth.setup.ts
 */

test.describe("Main Onboarding Flow", () => {
  test.describe("Welcome Step", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/welcome");
    });

    test("should display welcome page with store profile form", async ({
      page,
    }) => {
      // Check for main heading - could be "Welcome to BoutiqueHub Black" or similar
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      // Check for the BoutiqueHub Black badge or Thunder Text branding
      const brandBadge = page
        .locator("text=BoutiqueHub Black")
        .or(page.locator("text=Thunder Text"));
      await expect(brandBadge.first()).toBeVisible();

      // Check for store profile form fields
      await expect(page.locator("#store-name")).toBeVisible();
      await expect(page.locator("#owner-name")).toBeVisible();
      await expect(page.locator("#phone")).toBeVisible();
      await expect(page.locator("#city")).toBeVisible();
      await expect(page.locator("#state")).toBeVisible();

      // Check for business type dropdown
      await expect(page.getByRole("combobox").first()).toBeVisible();

      // Check for Continue button
      await expect(
        page.getByRole("button", { name: "Continue" }),
      ).toBeVisible();
    });

    test("should display feature cards explaining the service", async ({
      page,
    }) => {
      // Check for feature cards - BHB Dashboard, Thunder Text, ACE Engine
      // Use heading role to avoid strict mode violations when text appears multiple times
      await expect(
        page.getByRole("heading", { name: "BHB Dashboard" }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Thunder Text" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "ACE Engine" }).first(),
      ).toBeVisible();
    });

    test("should require store name and owner name before continuing", async ({
      page,
    }) => {
      // Continue button should be disabled without required fields
      const continueButton = page.getByRole("button", { name: "Continue" });

      // With empty fields, button should be disabled
      await expect(continueButton).toBeDisabled();

      // Fill only store name
      await page.locator("#store-name").fill("Test Store");
      await expect(continueButton).toBeDisabled();

      // Fill owner name as well
      await page.locator("#owner-name").fill("Test Owner");
      await expect(continueButton).toBeEnabled();
    });

    test("should allow filling optional profile fields", async ({ page }) => {
      // Fill required fields first
      await page.locator("#store-name").fill("E2E Test Store");
      await page.locator("#owner-name").fill("E2E Test Owner");

      // Fill optional fields
      await page.locator("#phone").fill("(555) 123-4567");
      await page.locator("#city").fill("San Francisco");
      await page.locator("#state").fill("CA");

      // Select business type from dropdown
      await page.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Online Only" }).click();

      // Select years in business
      const yearsDropdown = page.getByRole("combobox").nth(1);
      await yearsDropdown.click();
      await page.getByRole("option", { name: "3 years" }).click();

      // Continue button should be enabled
      await expect(
        page.getByRole("button", { name: "Continue" }),
      ).toBeEnabled();
    });

    test("should navigate to Connect Store step after completing profile", async ({
      page,
    }) => {
      // Fill required fields
      await page.locator("#store-name").fill("E2E Navigation Test Store");
      await page.locator("#owner-name").fill("E2E Navigation Test Owner");

      // Click Continue
      await page.getByRole("button", { name: "Continue" }).click();

      // Should transition to Connect Store step
      await expect(page.locator("text=Connect Your Store")).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Connect Store Step", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate directly to shopify step if URL params support it
      await page.goto("/welcome?step=shopify");

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Check if we're on the Connect Store step or need to go through welcome first
      const connectStoreVisible = await page
        .locator("text=Connect Your Store")
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!connectStoreVisible) {
        // We're likely on welcome step - complete it to get to Connect Store
        const storeNameInput = page.locator("#store-name");
        const ownerNameInput = page.locator("#owner-name");

        // Wait for form to be visible
        await expect(storeNameInput).toBeVisible({ timeout: 5000 });

        await storeNameInput.fill("E2E Store Step Test");
        await ownerNameInput.fill("E2E Owner");
        await page.getByRole("button", { name: "Continue" }).click();

        // Wait for transition to Connect Store step
        await expect(page.locator("text=Connect Your Store")).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test("should display platform selection cards", async ({ page }) => {
      // Check for Connect Your Store heading
      await expect(page.locator("text=Connect Your Store")).toBeVisible({
        timeout: 5000,
      });

      // Check for platform options
      await expect(page.locator("text=Shopify")).toBeVisible();
      await expect(page.locator("text=Lightspeed")).toBeVisible();
      await expect(page.locator("text=CommentSold")).toBeVisible();

      // Check that Lightspeed and CommentSold are marked as Coming Soon
      await expect(page.locator("text=Coming Soon").first()).toBeVisible();
    });

    test("should show Shopify connection form when Shopify is selected", async ({
      page,
    }) => {
      // Wait for platform selection to be visible
      await expect(page.locator("text=Connect Your Store")).toBeVisible({
        timeout: 5000,
      });

      // Click on Shopify card - use the text with "Most popular" description to identify the clickable card
      // The card is a div with cursor-pointer, we find it via the heading text
      const shopifyHeading = page.locator("h3", { hasText: "Shopify" }).first();
      // Click on the parent container which has the click handler
      await shopifyHeading.click();

      // Should show Shopify connection form
      await expect(page.locator("text=Connect Shopify")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.locator("#shop-domain")).toBeVisible();
      await expect(page.locator("text=.myshopify.com")).toBeVisible();

      // Check for "What we'll access" info section
      await expect(page.locator("text=What we'll access")).toBeVisible();
    });

    test("should allow entering Shopify store domain", async ({ page }) => {
      // Navigate to Shopify form
      await expect(page.locator("text=Connect Your Store")).toBeVisible({
        timeout: 5000,
      });
      const shopifyHeading = page.locator("h3", { hasText: "Shopify" }).first();
      await shopifyHeading.click();

      // Wait for form
      await expect(page.locator("#shop-domain")).toBeVisible({ timeout: 5000 });

      // Enter store domain
      await page.locator("#shop-domain").fill("test-store-name");

      // Connect Store button should be enabled
      await expect(
        page.getByRole("button", { name: "Connect Store" }),
      ).toBeEnabled();
    });

    test("should show back button to return to platform selection", async ({
      page,
    }) => {
      // Navigate to Shopify form
      await expect(page.locator("text=Connect Your Store")).toBeVisible({
        timeout: 5000,
      });
      const shopifyHeading = page.locator("h3", { hasText: "Shopify" }).first();
      await shopifyHeading.click();

      // Wait for Shopify form
      await expect(page.locator("text=Connect Shopify")).toBeVisible({
        timeout: 5000,
      });

      // Click back button
      await page.locator("text=Back to platforms").click();

      // Should return to platform selection
      await expect(page.locator("text=Connect Your Store")).toBeVisible();
      await expect(
        page.locator("text=Select your e-commerce platform"),
      ).toBeVisible();
    });
  });

  test.describe("Ad Platforms Step", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate directly to social step if possible
      await page.goto("/welcome?step=social");
    });

    test("should display ad platform connection options", async ({ page }) => {
      // Check for Connect Ad Platforms heading
      await expect(page.locator("text=Connect Ad Platforms")).toBeVisible({
        timeout: 5000,
      });

      // Check platform options are visible
      await expect(page.locator("text=Meta Ads")).toBeVisible();
      await expect(page.locator("text=Google Ads")).toBeVisible();
      await expect(page.locator("text=TikTok Ads")).toBeVisible();
      await expect(page.locator("text=Pinterest Ads")).toBeVisible();
    });

    test("should have Skip for Now and Done Connecting buttons", async ({
      page,
    }) => {
      await expect(page.locator("text=Connect Ad Platforms")).toBeVisible({
        timeout: 5000,
      });

      // Check for action buttons
      await expect(
        page.getByRole("button", { name: "Skip for Now" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Done Connecting" }),
      ).toBeVisible();
    });

    test("should navigate to completion step when Skip is clicked", async ({
      page,
    }) => {
      await expect(page.locator("text=Connect Ad Platforms")).toBeVisible({
        timeout: 5000,
      });

      // Click Skip for Now
      await page.getByRole("button", { name: "Skip for Now" }).click();

      // Should transition to completion step
      await expect(page.locator("text=You're All Set!")).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Completion Step", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate directly to complete step
      await page.goto("/welcome?step=complete");
    });

    test("should display completion message and trial info", async ({
      page,
    }) => {
      // Check for completion heading
      await expect(page.locator("text=You're All Set!")).toBeVisible({
        timeout: 5000,
      });

      // Check for trial info
      await expect(page.locator("text=free trial")).toBeVisible();

      // Check for included features list
      await expect(page.locator("text=AI product descriptions")).toBeVisible();
      await expect(page.locator("text=AI-powered ad copy")).toBeVisible();
    });

    test("should have Go to Dashboard button", async ({ page }) => {
      await expect(page.locator("text=You're All Set!")).toBeVisible({
        timeout: 5000,
      });

      // Check for dashboard button
      const dashboardButton = page.getByRole("button", {
        name: "Go to Dashboard",
      });
      await expect(dashboardButton).toBeVisible();
    });

    test("should navigate to dashboard when button is clicked", async ({
      page,
    }) => {
      await expect(page.locator("text=You're All Set!")).toBeVisible({
        timeout: 5000,
      });

      // Click Go to Dashboard
      await page.getByRole("button", { name: "Go to Dashboard" }).click();

      // Should navigate to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    });
  });

  test.describe("Step Indicator", () => {
    test("should show step progress on desktop", async ({ page }) => {
      // Set viewport to desktop size
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/welcome");

      // Check for step indicator labels (visible on larger screens)
      await expect(page.locator("text=Welcome").first()).toBeVisible();
      await expect(page.locator("text=Connect Store").first()).toBeVisible();
      await expect(page.locator("text=Ad Platforms").first()).toBeVisible();
      await expect(page.locator("text=Ready!").first()).toBeVisible();
    });
  });
});

test.describe("Content Center Onboarding Flow", () => {
  test.describe("Welcome Step", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/content-center/onboarding");
    });

    test("should display welcome page with voice profile introduction", async ({
      page,
    }) => {
      // Check for main heading
      await expect(
        page.locator("text=Welcome to Content Creation Center"),
      ).toBeVisible();

      // Check for description about voice profile
      await expect(page.locator("text=brand voice profile")).toBeVisible();
    });

    test("should display step-by-step explanation", async ({ page }) => {
      // Check for the three steps explanation
      await expect(
        page.locator("text=Upload Your Writing Samples"),
      ).toBeVisible();
      await expect(page.locator("text=AI Analyzes Your Voice")).toBeVisible();
      await expect(
        page.locator("text=Generate On-Brand Content"),
      ).toBeVisible();
    });

    test("should display tips for good writing samples", async ({ page }) => {
      // Check for tips section
      await expect(
        page.locator("text=What makes a good writing sample"),
      ).toBeVisible();
      await expect(page.locator("text=500-5000 words")).toBeVisible();
    });

    test("should have Get Started button", async ({ page }) => {
      const getStartedButton = page.getByRole("button", {
        name: "Get Started",
      });
      await expect(getStartedButton).toBeVisible();
    });

    test("should show progress bar at step 1", async ({ page }) => {
      // Check progress indicator
      await expect(page.locator("text=Step 1 of 5")).toBeVisible();
      await expect(page.locator("text=20% Complete")).toBeVisible();
    });

    test("should navigate to upload step when Get Started is clicked", async ({
      page,
    }) => {
      // Click Get Started
      await page.getByRole("button", { name: "Get Started" }).click();

      // Should transition to upload step
      await expect(
        page.locator("text=Upload Your Writing Samples"),
      ).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=Step 2 of 5")).toBeVisible();
    });
  });

  test.describe("Upload Step", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/content-center/onboarding");
      // Navigate to upload step
      await page.getByRole("button", { name: "Get Started" }).click();
      await expect(page.locator("text=Step 2 of 5")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should display upload form", async ({ page }) => {
      // Check for upload section
      await expect(
        page.locator("text=Upload Your Writing Samples").first(),
      ).toBeVisible();
      await expect(page.locator("text=at least 3 samples")).toBeVisible();
    });

    test("should have Back and Generate Voice Profile buttons", async ({
      page,
    }) => {
      await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Generate Voice Profile" }),
      ).toBeVisible();
    });

    test("should navigate back to welcome when Back is clicked", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Back" }).click();

      // Should return to welcome step
      await expect(
        page.locator("text=Welcome to Content Creation Center"),
      ).toBeVisible({ timeout: 3000 });
      await expect(page.locator("text=Step 1 of 5")).toBeVisible();
    });
  });
});

test.describe("Dashboard Access After Onboarding", () => {
  test("should be able to access dashboard directly when authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Wait for the page to load - dashboard may show loading state first
    await page.waitForLoadState("networkidle");

    // The dashboard page should load without redirecting to login
    // It may show "Authentication Required" if no shop is connected, or the actual dashboard
    // Either way, it shouldn't redirect to the login page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/auth/login");

    // Should see some dashboard content - either the main dashboard or the auth required state
    const dashboardContent = page
      .locator("text=Welcome back")
      .or(page.locator("text=Products Generated"))
      .or(page.locator("text=Authentication Required"))
      .or(page.locator("text=Thunder Text"));
    await expect(dashboardContent.first()).toBeVisible({ timeout: 15000 });
  });
});
