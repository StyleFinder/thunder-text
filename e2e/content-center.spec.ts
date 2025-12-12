import { test, expect } from "@playwright/test";

/**
 * Content Center E2E Tests
 *
 * Tests the content center functionality:
 * 1. Dashboard page load and display
 * 2. Stats and recent content display
 * 3. Library page and filtering
 * 4. Generate page and content type selection
 * 5. Navigation between content center pages
 *
 * Note: Actual AI generation is not tested here as it requires
 * real API calls and shop authentication with Shopify.
 * These tests verify the UI and interactions work correctly.
 */

test.describe("Content Center Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/content-center");
    await page.waitForLoadState("networkidle");
  });

  test("should display content center dashboard page", async ({ page }) => {
    // Check for main heading
    await expect(
      page.locator('h1:has-text("Welcome to Content Center")'),
    ).toBeVisible();

    // Check for subtitle
    await expect(
      page.locator("text=Generate on-brand content powered by AI"),
    ).toBeVisible();
  });

  test("should display stats cards", async ({ page }) => {
    // Check for Total Content stat
    await expect(page.locator("text=Total Content")).toBeVisible();

    // Check for This Month stat
    await expect(page.locator("text=This Month")).toBeVisible();

    // Check for Saved Drafts stat
    await expect(page.locator("text=Saved Drafts")).toBeVisible();

    // Check for Voice Profile stat
    await expect(page.locator("text=Voice Profile")).toBeVisible();
  });

  test("should display recent content section", async ({ page }) => {
    // Check for Recent Content heading
    await expect(page.locator('h2:has-text("Recent Content")')).toBeVisible();

    // Check for View All button
    await expect(page.locator("text=View All")).toBeVisible();

    // Check for sample content message
    await expect(
      page.locator("text=Your generated content will appear here"),
    ).toBeVisible();
  });

  test("should display sample content items", async ({ page }) => {
    // Check for sample content items (these are mock data in the page)
    await expect(
      page.locator("text=Summer Collection Launch Blog Post"),
    ).toBeVisible();
    await expect(
      page.locator("text=Instagram Caption: New Arrivals"),
    ).toBeVisible();
    await expect(
      page.locator("text=Product Description: Floral Dress"),
    ).toBeVisible();
  });

  test("should navigate to library when View All is clicked", async ({
    page,
  }) => {
    await page.locator("text=View All").click();
    await expect(page).toHaveURL(/\/content-center\/library/, {
      timeout: 10000,
    });
  });
});

test.describe("Content Library Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/content-center/library");
    await page.waitForLoadState("networkidle");
  });

  test("should display library page header", async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h1:has-text("Content Library")')).toBeVisible();

    // Check for subtitle
    await expect(
      page.locator("text=Browse and manage all your generated content"),
    ).toBeVisible();
  });

  test("should display search and filter controls", async ({ page }) => {
    // Check for search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Check for Saved Only toggle button
    await expect(page.locator('button:has-text("Saved Only")')).toBeVisible();
  });

  test("should display sort buttons", async ({ page }) => {
    // Check for Date sort button
    await expect(page.locator('button:has-text("Date")')).toBeVisible();

    // Check for Length sort button
    await expect(page.locator('button:has-text("Length")')).toBeVisible();
  });

  test("should allow searching content", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("test search");
    await expect(searchInput).toHaveValue("test search");
  });

  test("should toggle Saved Only filter", async ({ page }) => {
    const savedOnlyButton = page.locator('button:has-text("Saved Only")');

    // Initial state - not active (should have white/transparent background)
    await expect(savedOnlyButton).toBeVisible();

    // Click to toggle
    await savedOnlyButton.click();

    // After clicking, button should still be visible (style changes handled by state)
    await expect(savedOnlyButton).toBeVisible();
  });

  test("should display empty state or loading state", async ({ page }) => {
    // Either shows loading, content items, or empty state
    const hasContent = await page
      .locator("text=No content found")
      .or(page.locator("text=Loading your content"))
      .or(page.locator(".flex-1.min-w-0"))
      .isVisible();
    expect(hasContent).toBe(true);
  });
});

test.describe("Content Generation Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/content-center/generate");
    await page.waitForLoadState("networkidle");
  });

  test("should display generation page with progress indicator", async ({
    page,
  }) => {
    // The page should have a progress indicator with steps
    // Either shows auth required or the actual content type selector
    const hasAuthRequired = await page
      .locator("text=Authentication Required")
      .isVisible();
    const hasSelectType = await page.locator("text=Select Type").isVisible();

    // One of these should be visible
    expect(hasAuthRequired || hasSelectType).toBe(true);
  });

  test("should show step indicators", async ({ page }) => {
    // If authenticated, check for step progress
    const selectTypeStep = page.locator("text=Select Type");
    const configureStep = page.locator("text=Configure");
    const reviewStep = page.locator("text=Review");

    // At least Select Type should be visible as it's the first step
    const hasSteps =
      (await selectTypeStep.isVisible()) ||
      (await configureStep.isVisible()) ||
      (await reviewStep.isVisible());

    // Or has auth required message
    const hasAuthRequired = await page
      .locator("text=Authentication Required")
      .isVisible();

    expect(hasSteps || hasAuthRequired).toBe(true);
  });
});

test.describe("Content Center Navigation", () => {
  test("should navigate from dashboard to library", async ({ page }) => {
    await page.goto("/content-center");
    await page.waitForLoadState("networkidle");

    // Click View All to go to library
    await page.locator("text=View All").click();

    await expect(page).toHaveURL(/\/content-center\/library/, {
      timeout: 10000,
    });
  });

  test("should navigate from library to generate", async ({ page }) => {
    await page.goto("/content-center/library");
    await page.waitForLoadState("networkidle");

    // Click Generate Content button if visible (in empty state)
    const generateButton = page.locator('button:has-text("Generate Content")');

    if (await generateButton.isVisible()) {
      await generateButton.click();
      await expect(page).toHaveURL(/\/content-center\/generate/, {
        timeout: 10000,
      });
    }
  });
});

test.describe("Content Center Responsive Layout", () => {
  test("should display stats grid on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/content-center");
    await page.waitForLoadState("networkidle");

    // Stats should be visible in a grid layout
    await expect(page.locator("text=Total Content")).toBeVisible();
    await expect(page.locator("text=This Month")).toBeVisible();
    await expect(page.locator("text=Saved Drafts")).toBeVisible();
    await expect(page.locator("text=Voice Profile")).toBeVisible();
  });

  test("should display content on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/content-center");
    await page.waitForLoadState("networkidle");

    // Main heading should still be visible
    await expect(
      page.locator('h1:has-text("Welcome to Content Center")'),
    ).toBeVisible();

    // Stats should be visible (may be stacked on mobile)
    await expect(page.locator("text=Total Content")).toBeVisible();
  });
});

test.describe("Content Center Voice Profile", () => {
  test("should display Voice Profile status badge", async ({ page }) => {
    await page.goto("/content-center");
    await page.waitForLoadState("networkidle");

    // Check for Voice Profile label
    await expect(page.locator("text=Voice Profile")).toBeVisible();

    // Check for Active badge
    await expect(page.locator("text=Active").first()).toBeVisible();

    // Check for "Last updated" text
    await expect(page.locator("text=Last updated")).toBeVisible();
  });
});
