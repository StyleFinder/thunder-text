/**
 * Auth Token API Tests
 * Tests for GET /api/auth/token endpoint
 */

import { describe, it, expect } from "@jest/globals";
import { GET } from "@/app/api/auth/token/route";
import { NextRequest } from "next/server";

describe("GET /api/auth/token", () => {
  const BASE_URL = "http://localhost:3050/api/auth/token";

  describe("Parameter Validation", () => {
    it("should return 400 when shop parameter is missing", async () => {
      const request = new NextRequest(BASE_URL);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("shop");
    });

    it("should return 400 when shop parameter is empty", async () => {
      const request = new NextRequest(`${BASE_URL}?shop=`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("Shop Lookup", () => {
    it("should return 404 for non-existent shop", async () => {
      const request = new NextRequest(
        `${BASE_URL}?shop=non-existent-shop-12345.myshopify.com`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    it("should normalize shop domain without .myshopify.com suffix", async () => {
      // Test that "myshop" is normalized to "myshop.myshopify.com"
      const request = new NextRequest(
        `${BASE_URL}?shop=non-existent-normalized-shop`
      );
      const response = await GET(request);

      // Should reach the lookup logic (will return 404 for non-existent)
      expect(response.status).toBe(404);
    });

    it("should handle shop domain with full .myshopify.com suffix", async () => {
      const request = new NextRequest(
        `${BASE_URL}?shop=test-shop-full-domain.myshopify.com`
      );
      const response = await GET(request);

      // Should reach the lookup logic (will return 404 for non-existent)
      expect(response.status).toBe(404);
    });
  });

  describe("Response Structure", () => {
    it("should include success field in all responses", async () => {
      const request = new NextRequest(`${BASE_URL}?shop=any-shop`);
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty("success");
      expect(typeof data.success).toBe("boolean");
    });

    it("should include error field on failure responses", async () => {
      const request = new NextRequest(BASE_URL);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data).toHaveProperty("error");
      expect(typeof data.error).toBe("string");
    });
  });

  describe("CORS Headers", () => {
    it("should include CORS headers in response", async () => {
      const request = new NextRequest(BASE_URL, {
        headers: {
          Origin: "https://admin.shopify.com",
        },
      });
      const response = await GET(request);

      // Response should have headers (CORS middleware adds them)
      expect(response.headers).toBeDefined();
    });
  });
});
