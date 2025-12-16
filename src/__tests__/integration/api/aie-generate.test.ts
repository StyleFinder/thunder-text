/**
 * AIE Generate API Tests
 * Tests for POST /api/aie/generate endpoint
 *
 * Tests AI ad generation parameter validation.
 * Core feature for ad copy generation.
 *
 * NOTE: This test file focuses on parameter validation only since the AIE engine
 * has complex dependencies (OpenAI, embeddings) that are difficult to mock in integration tests.
 * Full AIE engine response tests should be done at the unit level with proper mocking.
 */

import { describe, it, expect } from "@jest/globals";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/aie/generate/route";

describe("POST /api/aie/generate", () => {
  const BASE_URL = "http://localhost:3050/api/aie/generate";

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
    it("should return 400 when productInfo is missing", async () => {
      const request = createPostRequest({
        platform: "meta",
        goal: "awareness",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Missing required fields: productInfo, platform, goal"
      );
    });

    it("should return 400 when platform is missing", async () => {
      const request = createPostRequest({
        productInfo: { name: "Test Product", description: "A test product" },
        goal: "awareness",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Missing required fields: productInfo, platform, goal"
      );
    });

    it("should return 400 when goal is missing", async () => {
      const request = createPostRequest({
        productInfo: { name: "Test Product", description: "A test product" },
        platform: "meta",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Missing required fields: productInfo, platform, goal"
      );
    });

    it("should return 400 for invalid platform", async () => {
      const request = createPostRequest({
        productInfo: { name: "Test Product", description: "A test product" },
        platform: "invalid-platform",
        goal: "awareness",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid platform");
    });

    it("should return 400 for invalid goal", async () => {
      const request = createPostRequest({
        productInfo: { name: "Test Product", description: "A test product" },
        platform: "meta",
        goal: "invalid-goal",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid goal");
    });

    it("should return 400 for invalid adLengthMode", async () => {
      const request = createPostRequest({
        productInfo: { name: "Test Product", description: "A test product" },
        platform: "meta",
        goal: "awareness",
        adLengthMode: "INVALID",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid adLengthMode");
    });
  });

  describe("Valid Platforms", () => {
    const validPlatforms = ["meta", "instagram", "google", "tiktok", "pinterest"];

    it.each(validPlatforms)("should accept %s as valid platform", async (platform) => {
      const request = createPostRequest({
        productInfo: { name: "Test Product", description: "A test product" },
        platform,
        goal: "awareness",
      });

      const response = await POST(request);
      // Should not return 400 for valid platform (either 200 or 500 from engine)
      expect(response.status).not.toBe(400);
    });
  });

  describe("Valid Goals", () => {
    const validGoals = [
      "awareness",
      "engagement",
      "conversion",
      "traffic",
      "app_installs",
    ];

    it.each(validGoals)("should accept %s as valid goal", async (goal) => {
      const request = createPostRequest({
        productInfo: { name: "Test Product", description: "A test product" },
        platform: "meta",
        goal,
      });

      const response = await POST(request);
      // Should not return 400 for valid goal
      expect(response.status).not.toBe(400);
    });
  });

  describe("Valid Ad Length Modes", () => {
    const validModes = ["AUTO", "SHORT", "MEDIUM", "LONG"];

    it.each(validModes)("should accept %s as valid adLengthMode", async (mode) => {
      const request = createPostRequest({
        productInfo: { name: "Test Product", description: "A test product" },
        platform: "meta",
        goal: "awareness",
        adLengthMode: mode,
      });

      const response = await POST(request);
      // Should not return 400 for valid mode (may return 500 from engine without mock)
      expect(response.status).not.toBe(400);
    });
  });

  // NOTE: Tests for successful generation, response structure, and optional parameters
  // are intentionally omitted here because they require mocking the AIE engine.
  // The AIE engine has complex dependencies (OpenAI embeddings, researcher agent)
  // that are better tested at the unit level.
  // See: src/__tests__/unit/aie/engine.test.ts for comprehensive AIE engine tests.
});
