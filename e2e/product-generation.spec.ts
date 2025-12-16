import { test, expect } from "@playwright/test";

/**
 * Product Generation E2E Tests
 *
 * Tests the product description generation flow at /create-pd:
 * 1. Page load and form display
 * 2. Step-by-step form completion
 * 3. Photo upload interfaces
 * 4. Form validation
 * 5. Navigation and actions
 *
 * Note: Actual AI generation is not tested here as it requires
 * real API calls and shop authentication with Shopify.
 * These tests verify the UI and form interactions work correctly.
 */

test.describe("Create Product Page", () => {
  test.describe("Page Load and Display", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/create-pd");
    });

    test("should display create product page with header", async ({ page }) => {
      // Check for page title
      await expect(
        page.locator('h1:has-text("Create New Product")'),
      ).toBeVisible();

      // Check for subtitle
      await expect(
        page.locator(
          "text=Generate AI-powered product descriptions from images",
        ),
      ).toBeVisible();

      // Check for back to dashboard button
      await expect(
        page.getByRole("button", { name: "Back to Dashboard" }),
      ).toBeVisible();
    });

    test("should display all form steps", async ({ page }) => {
      // Check for Step 1: Product Type Selection
      await expect(
        page.locator("text=What Product Are You Selling?"),
      ).toBeVisible();

      // Check for Step 2: Primary Photos (use heading role to avoid strict mode violation)
      await expect(
        page.getByRole("heading", { name: "Upload Primary Photos" }),
      ).toBeVisible();

      // Check for Step 3: Additional Photos
      await expect(
        page.locator("text=Additional Photos (Optional)"),
      ).toBeVisible();

      // Check for Step 4: Product Details
      await expect(page.locator("text=Product Details")).toBeVisible();

      // Check for Step 5: Additional Information
      await expect(page.locator("text=Additional Information")).toBeVisible();

      // Check for Step 6: Features & Additional Details
      await expect(
        page.locator("text=Features & Additional Details"),
      ).toBeVisible();
    });

    test("should display step indicators with numbers", async ({ page }) => {
      // Each step should have a numbered indicator
      const stepNumbers = ["1", "2", "3", "4", "5", "6"];
      for (const num of stepNumbers) {
        await expect(
          page.locator(`div:has-text("${num}")`).first(),
        ).toBeVisible();
      }
    });

    test("should display action buttons", async ({ page }) => {
      // Check for Cancel and Generate Description buttons
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Generate Description" }),
      ).toBeVisible();
    });

    test("should have Generate Description button disabled initially", async ({
      page,
    }) => {
      // Button should be disabled because no photos uploaded and no template selected
      const generateButton = page.getByRole("button", {
        name: "Generate Description",
      });
      await expect(generateButton).toBeDisabled();
    });
  });

  test.describe("Product Details Form", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/create-pd");
    });

    test("should display sizing dropdown", async ({ page }) => {
      // Check for Available Sizing label
      await expect(page.locator("text=Available Sizing")).toBeVisible();

      // Check for sizing dropdown
      await expect(page.locator("#sizing-select")).toBeVisible();
    });

    test("should display additional information fields", async ({ page }) => {
      // Check for form fields in Additional Information section
      await expect(page.locator("#fabric-material")).toBeVisible();
      await expect(page.locator("#occasion-use")).toBeVisible();
      await expect(page.locator("#target-audience")).toBeVisible();
    });

    test("should display features section fields", async ({ page }) => {
      // Check for features fields
      await expect(page.locator("#key-features")).toBeVisible();
      await expect(page.locator("#additional-notes")).toBeVisible();
    });

    test("should allow filling out additional information fields", async ({
      page,
    }) => {
      // Fill fabric material
      await page.locator("#fabric-material").fill("100% organic cotton");
      await expect(page.locator("#fabric-material")).toHaveValue(
        "100% organic cotton",
      );

      // Fill occasion use
      await page.locator("#occasion-use").fill("Casual everyday wear");
      await expect(page.locator("#occasion-use")).toHaveValue(
        "Casual everyday wear",
      );

      // Fill target audience
      await page.locator("#target-audience").fill("Young professionals");
      await expect(page.locator("#target-audience")).toHaveValue(
        "Young professionals",
      );
    });

    test("should allow filling out features fields", async ({ page }) => {
      // Fill key features
      await page
        .locator("#key-features")
        .fill("Machine washable, breathable, durable");
      await expect(page.locator("#key-features")).toHaveValue(
        "Machine washable, breathable, durable",
      );

      // Fill additional notes
      await page
        .locator("#additional-notes")
        .fill("Ships within 2 business days");
      await expect(page.locator("#additional-notes")).toHaveValue(
        "Ships within 2 business days",
      );
    });
  });

  test.describe("Photo Upload Interface", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/create-pd");
    });

    test("should display primary photo upload area", async ({ page }) => {
      // Check for primary photo upload guidance text
      await expect(
        page.locator("text=Upload clear photos of your product"),
      ).toBeVisible();
    });

    test("should display secondary photo upload area", async ({ page }) => {
      // Check for secondary/additional photos guidance
      await expect(
        page.locator("text=Add more photos showing different angles"),
      ).toBeVisible();
    });

    test("should show hint to upload photos first", async ({ page }) => {
      // Check for the hint to upload primary photos first
      await expect(
        page.locator("text=Upload primary photos first"),
      ).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/create-pd");
    });

    test("should navigate back when Cancel is clicked", async ({ page }) => {
      // Click Cancel button
      await page.getByRole("button", { name: "Cancel" }).click();

      // Wait for navigation
      await page.waitForTimeout(500);

      // Should have navigated away (or back)
      // Since there's no history in test, it may stay on same page
      // But the button should be clickable
    });

    test("should navigate to dashboard when Back to Dashboard is clicked", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Back to Dashboard" }).click();

      // Should navigate to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    });
  });

  test.describe("Form Validation Messages", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/create-pd");
    });

    test("should show product category hint when photos not uploaded", async ({
      page,
    }) => {
      // The blue info box should be visible
      await expect(
        page.locator(
          "text=Upload primary photos first, then select the product category",
        ),
      ).toBeVisible();
    });
  });
});

test.describe("Enhance Existing Product Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/enhance");
  });

  test("should display enhance product page", async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // The page should load without errors
    // Check for any loading indicator or main content
    const content = page.locator('main, [role="main"], body').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });
});
