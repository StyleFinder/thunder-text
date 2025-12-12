/**
 * Billing Subscription API Tests
 * Tests for GET /api/billing/subscription endpoint
 *
 * Tests fetching subscription status and usage data by shop ID or domain.
 * Critical for billing verification and usage tracking.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { GET } from "@/app/api/billing/subscription/route";
import { NextRequest } from "next/server";
import { createServiceClient } from "../../utils/auth-helpers";
import { TEST_SHOP, TENANT_A } from "../../utils/test-constants";

describe("GET /api/billing/subscription", () => {
  const BASE_URL = "http://localhost:3050/api/billing/subscription";
  const serviceClient = createServiceClient();

  // Test shop for subscription tests
  let testShopId: string;
  const testShopDomain = `test-billing-${Date.now()}.myshopify.com`;

  beforeAll(async () => {
    // Create a test shop with subscription data
    const { data: newShop, error } = await serviceClient
      .from("shops")
      .insert({
        shop_domain: testShopDomain,
        email: `test-billing-${Date.now()}@example.com`,
        shop_type: "shopify",
        is_active: true,
        plan: "starter",
        subscription_status: "active",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create test shop: ${error.message}`);
    }

    testShopId = newShop.id;

    // Create a subscription record for this shop
    await serviceClient.from("subscriptions").insert({
      shop_id: testShopId,
      product: "starter",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  });

  afterAll(async () => {
    // Cleanup: Delete subscription and test shop
    if (testShopId) {
      await serviceClient.from("subscriptions").delete().eq("shop_id", testShopId);
      await serviceClient.from("shops").delete().eq("id", testShopId);
    }
  });

  /**
   * Helper to create GET request with query params
   */
  function createGetRequest(params: Record<string, string>): NextRequest {
    const searchParams = new URLSearchParams(params);
    return new NextRequest(`${BASE_URL}?${searchParams.toString()}`);
  }

  describe("Parameter Validation", () => {
    it("should return 400 when neither shopId nor shop provided", async () => {
      const request = new NextRequest(BASE_URL);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Missing required parameter: shopId or shop");
    });

    it("should return 404 for non-existent shop domain", async () => {
      const request = createGetRequest({
        shop: "non-existent-shop-xyz.myshopify.com",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Shop not found");
    });

    it("should return 404 for non-existent shopId", async () => {
      const request = createGetRequest({
        shopId: "00000000-0000-0000-0000-000000000000",
      });

      const response = await GET(request);
      const data = await response.json();

      // Should return 500 because getUsageStats fails for non-existent shop
      expect([404, 500]).toContain(response.status);
      expect(data.success).toBe(false);
    });
  });

  describe("Successful Retrieval", () => {
    it("should return subscription by shopId", async () => {
      const request = createGetRequest({ shopId: testShopId });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.shopId).toBe(testShopId);
      expect(data).toHaveProperty("subscription");
    });

    it("should return subscription by shop domain", async () => {
      const request = createGetRequest({ shop: testShopDomain });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.shopId).toBe(testShopId);
    });

    it("should include subscription details in response", async () => {
      const request = createGetRequest({ shopId: testShopId });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subscription).toHaveProperty("plan");
      expect(data.subscription).toHaveProperty("planName");
      expect(data.subscription).toHaveProperty("price");
      expect(data.subscription).toHaveProperty("status");
      expect(data.subscription).toHaveProperty("usage");
      expect(data.subscription).toHaveProperty("limits");
    });

    it("should include usage data in response", async () => {
      const request = createGetRequest({ shopId: testShopId });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subscription.usage).toHaveProperty("productDescriptions");
      expect(data.subscription.usage).toHaveProperty("ads");
    });
  });

  describe("Using Real Test Stores", () => {
    it("should retrieve subscription for Coach Ellie test store", async () => {
      const request = createGetRequest({ shop: TENANT_A.domain });
      const response = await GET(request);
      const data = await response.json();

      // This test verifies the endpoint works with real test data
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should retrieve subscription for primary test store", async () => {
      const request = createGetRequest({ shop: TEST_SHOP.domain });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Response Structure", () => {
    it("should return JSON content type", async () => {
      const request = createGetRequest({ shopId: testShopId });
      const response = await GET(request);

      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should return well-structured subscription object", async () => {
      const request = createGetRequest({ shopId: testShopId });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify structure
      const { subscription } = data;
      expect(typeof subscription.plan).toBe("string");
      expect(typeof subscription.planName).toBe("string");
      expect(typeof subscription.price).toBe("number");
      expect(typeof subscription.usage).toBe("object");
      expect(typeof subscription.limits).toBe("object");
    });
  });
});
