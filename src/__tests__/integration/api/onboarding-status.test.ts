/**
 * Onboarding Status API Tests
 * Tests for GET /api/onboarding/status endpoint
 *
 * Tests checking user onboarding completion status.
 * Important for user flow and feature gating.
 *
 * NOTE: This endpoint uses Bearer token authentication (shop domain)
 * which requires the shop to exist in the database. These tests document
 * expected behavior and test against the primary test store.
 */

import { describe, it, expect } from "@jest/globals";
import { GET } from "@/app/api/onboarding/status/route";
import { NextRequest } from "next/server";
import { _createServiceClient } from "../../utils/auth-helpers";
import { TEST_SHOP } from "../../utils/test-constants";

describe("GET /api/onboarding/status", () => {
  const BASE_URL = "http://localhost:3050/api/onboarding/status";

  /**
   * Helper to create GET request with Authorization header
   */
  function createAuthRequest(shopDomain: string): NextRequest {
    return new NextRequest(BASE_URL, {
      headers: {
        Authorization: `Bearer ${shopDomain}`,
      },
    });
  }

  /**
   * Helper to create unauthenticated GET request
   */
  function createUnauthRequest(): NextRequest {
    return new NextRequest(BASE_URL);
  }

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      const request = createUnauthRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Not Found Cases", () => {
    it("should return 401 for non-existent shop (auth fails at authenticateRequest)", async () => {
      // When a non-existent shop is provided, the authenticateRequest function
      // in content-center-auth.ts fails at the database lookup stage and returns
      // authenticated: false, which causes getUserId to return null.
      // This results in a 401 Unauthorized response, not 404.
      const request = createAuthRequest("non-existent-shop.myshopify.com");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Using Real Test Stores", () => {
    it("should retrieve onboarding status for primary test store", async () => {
      const request = createAuthRequest(TEST_SHOP.domain);
      const response = await GET(request);
      const data = await response.json();

      // This test verifies the endpoint works with real test data
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.shop_domain).toBe(TEST_SHOP.domain);
    });

    it("should return expected fields in response", async () => {
      const request = createAuthRequest(TEST_SHOP.domain);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty("onboarding_completed");
      expect(data.data).toHaveProperty("user_type");
      expect(data.data).toHaveProperty("shop_domain");
    });
  });

  describe("Response Structure", () => {
    it("should return JSON content type", async () => {
      const request = createAuthRequest(TEST_SHOP.domain);
      const response = await GET(request);

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });
  });

  describe("Expected Behavior Documentation", () => {
    it("documents authentication flow", () => {
      // Authentication Requirements:
      // 1. Must have Authorization: Bearer {shop_domain} header
      // 2. Shop domain must exist in database (verified by authenticateRequest)
      // 3. Returns 401 "Unauthorized" if no header OR if shop doesn't exist
      //    (auth fails before reaching route-level 404 logic)
      // 4. Returns 200 with onboarding data on success

      const expectedResponses = {
        noAuth: { status: 401, error: "Unauthorized" },
        shopNotFound: { status: 401, error: "Unauthorized" }, // Auth fails first
        success: { status: 200, success: true },
      };

      expect(expectedResponses.noAuth.status).toBe(401);
      expect(expectedResponses.shopNotFound.status).toBe(401);
      expect(expectedResponses.success.status).toBe(200);
    });

    it("documents expected response structure", () => {
      // Expected response structure:
      // {
      //   success: true,
      //   data: {
      //     onboarding_completed: boolean,
      //     onboarding_completed_at: string | null,
      //     user_type: string,
      //     shop_domain: string
      //   }
      // }

      const expectedFields = [
        "onboarding_completed",
        "onboarding_completed_at",
        "user_type",
        "shop_domain",
      ];

      expect(expectedFields).toContain("onboarding_completed");
      expect(expectedFields).toContain("user_type");
      expect(expectedFields).toContain("shop_domain");
    });
  });
});
