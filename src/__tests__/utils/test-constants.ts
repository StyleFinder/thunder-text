/**
 * Test Constants
 *
 * Centralized configuration for integration tests using real test stores.
 * These stores exist in the Supabase database with real data for testing.
 */

/**
 * Primary test shop - Zunosai Staging Test Store
 * This store has the production app installed and has test data.
 * Used for most single-tenant API tests.
 */
export const TEST_SHOP = {
  /** Full Shopify domain */
  domain: 'zunosai-staging-test-store.myshopify.com',

  /** Short name (without .myshopify.com) */
  name: 'zunosai-staging-test-store',
} as const

/**
 * Multi-tenant test shops for isolation testing
 * These are used specifically for cross-tenant data isolation tests.
 * Both stores need the dev app installed for these tests to run fully.
 */
export const TENANT_A = {
  /** Full Shopify domain */
  domain: 'coach-ellie-test-store.myshopify.com',
  /** Short name (without .myshopify.com) */
  name: 'coach-ellie-test-store',
  /** Display name for test output */
  displayName: 'Coach Ellie Test Store',
} as const

export const TENANT_B = {
  /** Full Shopify domain */
  domain: 'zunosai-dev.myshopify.com',
  /** Short name (without .myshopify.com) */
  name: 'zunosai-dev',
  /** Display name for test output */
  displayName: 'Zunosai Dev Store',
} as const

/**
 * Creates headers for authenticated API requests
 * Uses the shop domain as Bearer token (matches app's auth pattern)
 */
export function createAuthHeaders(shopDomain: string = TEST_SHOP.domain): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${shopDomain}`,
  }
}

/**
 * Creates query string with shop parameter
 */
export function withShopParam(baseUrl: string, shopDomain: string = TEST_SHOP.domain): string {
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}shop=${shopDomain}`
}

/**
 * API Base URLs for tests
 */
export const API_URLS = {
  // Auth endpoints
  AUTH_TOKEN: 'http://localhost:3050/api/auth/token',
  AUTH_SIGNUP: 'http://localhost:3050/api/auth/signup',
  AUTH_LOGIN: 'http://localhost:3050/api/auth/login',

  // Shop endpoints
  SHOP_PROFILE: 'http://localhost:3050/api/shop/profile',
  BUSINESS_PROFILE: 'http://localhost:3050/api/business-profile',

  // Content endpoints
  CONTENT_GENERATE: 'http://localhost:3050/api/content-center/generate',
  CONTENT_SAMPLES: 'http://localhost:3050/api/content-center/samples',
  HOT_TAKES: 'http://localhost:3050/api/content-center/hot-takes',

  // Billing endpoints (Tier 1 - Critical)
  BILLING_SUBSCRIPTION: 'http://localhost:3050/api/billing/subscription',
  BILLING_CREATE_CHECKOUT: 'http://localhost:3050/api/billing/create-checkout',

  // Onboarding endpoints (Tier 2 - Core)
  ONBOARDING_STATUS: 'http://localhost:3050/api/onboarding/status',

  // AI Generation endpoints (Tier 2 - Core)
  AIE_GENERATE: 'http://localhost:3050/api/aie/generate',
  GENERATE: 'http://localhost:3050/api/generate',

  // BHB Coach endpoints (Tier 3 - BHB Coaching)
  BHB_INSIGHTS: 'http://localhost:3050/api/bhb/insights',
  BHB_SHOP_PROFILE: 'http://localhost:3050/api/bhb/shops',
  COACH_NOTES: 'http://localhost:3050/api/coach/notes',
} as const
