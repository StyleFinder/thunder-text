import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright E2E Test Configuration for Thunder Text
 *
 * Run E2E tests: npm run test:e2e
 * Run with UI:   npm run test:e2e:ui
 * Run headed:    npm run test:e2e -- --headed
 *
 * Test Structure:
 * - auth.spec.ts: Unauthenticated tests (signup, login flows)
 * - auth.setup.ts: One-time authentication to save state
 * - *.spec.ts: Authenticated tests (onboarding, product gen, etc.)
 */

// Path to stored authentication state
const STORAGE_STATE = path.join(__dirname, "e2e/.auth/user.json");

export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  // Shared settings for all projects
  use: {
    // Base URL for navigation (Thunder Text runs on port 3050)
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3050",

    // Collect trace when retrying a failed test
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Record video on failure
    video: "on-first-retry",
  },

  // Configure projects with dependencies for auth state reuse
  projects: [
    // ============================================
    // Setup Project - Runs first to authenticate
    // ============================================
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // ============================================
    // Unauthenticated Tests - No dependencies
    // ============================================
    {
      name: "auth-tests",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      // No dependencies - these test login/signup flows
    },

    // ============================================
    // Auth Flow Outcome Tests - Test login/redirect outcomes
    // ============================================
    {
      name: "auth-flow-tests",
      testMatch: /auth-flows\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      // No dependencies - these test login flows and their outcomes
    },

    // ============================================
    // Edge Case Tests - Test edge case behaviors
    // ============================================
    {
      name: "edge-case-tests",
      testMatch: /edge-cases\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      // No dependencies - these test edge cases like lockout, session persistence
    },

    // ============================================
    // Authenticated Tests - Depend on setup
    // ============================================
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Reuse authenticated state from setup
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
      // Exclude auth tests and edge-case tests (they run without auth state)
      testIgnore: /auth(-flows)?\.(spec|setup)\.ts|edge-cases\.spec\.ts/,
    },

    // Uncomment to test on more browsers:
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     storageState: STORAGE_STATE,
    //   },
    //   dependencies: ['setup'],
    //   testIgnore: /auth\.(spec|setup)\.ts/,
    // },
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     storageState: STORAGE_STATE,
    //   },
    //   dependencies: ['setup'],
    //   testIgnore: /auth\.(spec|setup)\.ts/,
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3050",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
