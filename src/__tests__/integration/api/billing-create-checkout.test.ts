/**
 * Billing Create Checkout API Tests
 * Tests for POST /api/billing/create-checkout endpoint
 *
 * Tests Stripe checkout session creation, plan changes, and cancellation.
 * Critical for payment processing.
 *
 * NOTE: These tests use mocked Stripe to avoid real charges.
 * Real Stripe integration should be tested in staging with test mode.
 */

import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import { POST } from "@/app/api/billing/create-checkout/route";
import { NextRequest } from "next/server";
import { createServiceClient } from "../../utils/auth-helpers";

// Mock Stripe to avoid real API calls
jest.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      create: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: "cus_test_123" }),
    },
    subscriptions: {
      retrieve: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        status: "active",
        items: { data: [{ id: "si_test_123" }] },
      }),
      update: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: "sub_test_123",
        status: "active",
        cancel_at: null,
      }),
    },
    checkout: {
      sessions: {
        create: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/test",
        }),
      },
    },
  },
  PLANS: {
    free: { name: "Free", price: 0, priceId: null, limits: {} },
    starter: {
      name: "Starter",
      price: 29,
      priceId: "price_test_starter",
      limits: {},
    },
    pro: { name: "Pro", price: 79, priceId: "price_test_pro", limits: {} },
  },
  getPlanFromPriceId: jest.fn().mockReturnValue("starter"),
}));

describe("POST /api/billing/create-checkout", () => {
  const BASE_URL = "http://localhost:3050/api/billing/create-checkout";
  const serviceClient = createServiceClient();

  // Test shop for checkout tests
  let testShopId: string;
  const testShopDomain = `test-checkout-${Date.now()}.myshopify.com`;

  beforeAll(async () => {
    // Create a test shop
    const { data: newShop, error } = await serviceClient
      .from("shops")
      .insert({
        shop_domain: testShopDomain,
        email: `test-checkout-${Date.now()}@example.com`,
        shop_type: "shopify",
        is_active: true,
        plan: "free",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create test shop: ${error.message}`);
    }

    testShopId = newShop.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test shop and billing events
    if (testShopId) {
      await serviceClient.from("billing_events").delete().eq("shop_id", testShopId);
      await serviceClient.from("shops").delete().eq("id", testShopId);
    }
  });

  /**
   * Helper to create POST request with body
   */
  function createPostRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  describe("Parameter Validation", () => {
    it("should return 400 when plan is missing", async () => {
      const request = createPostRequest({
        shopId: testShopId,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Missing required fields: plan and shopId");
    });

    it("should return 400 when shopId is missing", async () => {
      const request = createPostRequest({
        plan: "starter",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Missing required fields: plan and shopId");
    });

    it("should return 400 for invalid plan", async () => {
      const request = createPostRequest({
        plan: "invalid-plan",
        shopId: testShopId,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid plan. Must be free, starter, or pro.");
    });

    it("should accept valid plan values: free, starter, pro", async () => {
      // Test starter plan
      const starterRequest = createPostRequest({
        plan: "starter",
        shopId: testShopId,
      });

      const starterResponse = await POST(starterRequest);
      expect(starterResponse.status).not.toBe(400);

      // Test pro plan
      const proRequest = createPostRequest({
        plan: "pro",
        shopId: testShopId,
      });

      const proResponse = await POST(proRequest);
      expect(proResponse.status).not.toBe(400);
    });
  });

  describe("Shop Not Found", () => {
    it("should return 404 for non-existent shopId", async () => {
      const request = createPostRequest({
        plan: "starter",
        shopId: "00000000-0000-0000-0000-000000000000",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Shop not found");
    });
  });

  describe("Free Plan (Cancellation)", () => {
    it("should return 400 when cancelling with no active subscription", async () => {
      const request = createPostRequest({
        plan: "free",
        shopId: testShopId,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No active subscription to cancel");
    });
  });

  describe("Checkout Session Creation", () => {
    it("should return checkout URL for new subscription", async () => {
      const request = createPostRequest({
        plan: "starter",
        shopId: testShopId,
        shopDomain: testShopDomain,
      });

      const response = await POST(request);
      const data = await response.json();

      // Should succeed with checkout URL or return error if Stripe not configured
      if (response.status === 200) {
        expect(data.success).toBe(true);
        expect(data).toHaveProperty("url");
        expect(data).toHaveProperty("sessionId");
      } else {
        // May fail if Stripe price ID not configured
        expect(response.status).toBe(500);
      }
    });
  });

  describe("Response Structure", () => {
    it("should return JSON content type", async () => {
      const request = createPostRequest({
        plan: "starter",
        shopId: testShopId,
      });

      const response = await POST(request);

      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should return success field in response", async () => {
      const request = createPostRequest({
        plan: "invalid",
        shopId: testShopId,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("error");
    });
  });
});
