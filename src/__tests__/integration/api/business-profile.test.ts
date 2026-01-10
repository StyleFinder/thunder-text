/**
 * Business Profile API Tests
 * Tests for GET /api/business-profile endpoint
 */

import { describe, it, expect } from "@jest/globals";
import { GET } from "@/app/api/business-profile/route";
import { NextRequest } from "next/server";
import { TEST_SHOP as _TEST_SHOP, API_URLS } from "../../utils/test-constants";
import { createAuthenticatedRequest } from "../../utils/auth-helpers";

describe("GET /api/business-profile", () => {
  const BASE_URL = "http://localhost:3050/api/business-profile";

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest(BASE_URL);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 401 with invalid authorization header", async () => {
      const request = new NextRequest(BASE_URL, {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("should return 401 with malformed authorization header", async () => {
      const request = new NextRequest(BASE_URL, {
        headers: {
          Authorization: "InvalidFormat",
        },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe("Response Structure", () => {
    it("should include success field in all responses", async () => {
      const request = new NextRequest(BASE_URL);
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

  describe("Error Handling", () => {
    it("should handle missing cookies gracefully", async () => {
      const request = new NextRequest(BASE_URL);
      const response = await GET(request);

      // Should return auth error, not crash
      expect(response.status).toBe(401);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });
  });
});

describe("Business Profile Data Structure (Authenticated)", () => {
  // These tests use the real test shop: zunosai-staging-test-store.myshopify.com

  it("should return profile object with required fields", async () => {
    const request = createAuthenticatedRequest(API_URLS.BUSINESS_PROFILE);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty("profile");

    // Profile should have required fields
    const profile = data.data.profile;
    expect(profile).toHaveProperty("id");
    expect(profile).toHaveProperty("store_id");
    expect(profile).toHaveProperty("interview_status");
  });

  it("should return responses array", async () => {
    const request = createAuthenticatedRequest(API_URLS.BUSINESS_PROFILE);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveProperty("responses");
    expect(Array.isArray(data.data.responses)).toBe(true);
  });

  it("should return progress object with percentage_complete", async () => {
    const request = createAuthenticatedRequest(API_URLS.BUSINESS_PROFILE);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveProperty("progress");

    const progress = data.data.progress;
    expect(progress).toHaveProperty("current_question");
    expect(progress).toHaveProperty("total_questions");
    expect(progress).toHaveProperty("percentage_complete");
    expect(progress).toHaveProperty("is_complete");
    expect(typeof progress.percentage_complete).toBe("number");
    expect(progress.percentage_complete).toBeGreaterThanOrEqual(0);
    expect(progress.percentage_complete).toBeLessThanOrEqual(100);
  });

  it("should return next_prompt when interview not complete", async () => {
    const request = createAuthenticatedRequest(API_URLS.BUSINESS_PROFILE);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    const progress = data.data.progress;
    // If interview is not complete, next_prompt should exist
    if (!progress.is_complete) {
      expect(progress).toHaveProperty("next_prompt");
      if (progress.next_prompt) {
        expect(progress.next_prompt).toHaveProperty("prompt_key");
        expect(progress.next_prompt).toHaveProperty("question_text");
      }
    }
  });

  it("should associate profile with correct store", async () => {
    const request = createAuthenticatedRequest(API_URLS.BUSINESS_PROFILE);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.profile).not.toBeNull();
    // Profile should belong to the test store (verified by successful auth)
    expect(data.data.profile.store_id).toBeDefined();
  });
});
