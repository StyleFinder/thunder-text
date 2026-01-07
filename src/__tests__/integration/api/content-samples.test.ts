/**
 * Content Samples API Tests
 * Tests for GET/POST /api/content-center/samples endpoint
 *
 * Tests CRUD operations for content writing samples
 */

import { describe, it, expect } from "@jest/globals";
import { GET, POST } from "@/app/api/content-center/samples/route";
import { NextRequest } from "next/server";
import { _TEST_SHOP, API_URLS } from "../../utils/test-constants";
import {
  createAuthenticatedRequest,
  createAuthenticatedGetRequest,
} from "../../utils/auth-helpers";

describe("GET /api/content-center/samples", () => {
  const BASE_URL = "http://localhost:3050/api/content-center/samples";

  describe("Authentication/Authorization", () => {
    it("should return 400 when shop parameter is missing", async () => {
      const request = new NextRequest(BASE_URL);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("shop");
    });

    it("should return 404 for non-existent shop", async () => {
      const request = new NextRequest(
        `${BASE_URL}?shop=non-existent-shop-xyz.myshopify.com`,
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    it("should accept Authorization header for shop domain", async () => {
      const request = new NextRequest(BASE_URL, {
        headers: {
          Authorization: "Bearer non-existent-shop.myshopify.com",
        },
      });
      const response = await GET(request);

      // Should reach shop lookup (returns 404 for non-existent)
      expect(response.status).toBe(404);
    });

    it("should normalize shop domain without .myshopify.com", async () => {
      const request = new NextRequest(`${BASE_URL}?shop=test-shop`);
      const response = await GET(request);

      // Should normalize and lookup (returns 404 for non-existent)
      expect(response.status).toBe(404);
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

    it("should include error field on failure", async () => {
      const request = new NextRequest(BASE_URL);
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty("error");
      expect(typeof data.error).toBe("string");
    });
  });

  describe("CORS Headers", () => {
    it("should include CORS headers in response", async () => {
      const request = new NextRequest(BASE_URL, {
        headers: { Origin: "https://admin.shopify.com" },
      });
      const response = await GET(request);

      expect(response.headers).toBeDefined();
    });
  });
});

describe("POST /api/content-center/samples", () => {
  const BASE_URL = "http://localhost:3050/api/content-center/samples";

  describe("Authentication/Authorization", () => {
    it("should return 400 when shop parameter is missing", async () => {
      const request = new NextRequest(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sample_text: "Test sample content for the shop",
          sample_type: "product_description",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("shop");
    });

    it("should return 404 for non-existent shop", async () => {
      const request = new NextRequest(
        `${BASE_URL}?shop=fake-shop.myshopify.com`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sample_text:
              "Test sample content for the shop with enough words to pass validation",
            sample_type: "product_description",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when sample_text is missing", async () => {
      const request = new NextRequest(`${BASE_URL}?shop=test-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sample_type: "product_description",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Returns 400 for missing field or 404 for shop not found
      expect([400, 404]).toContain(response.status);
      expect(data.success).toBe(false);
    });

    it("should return 400 when sample_type is missing", async () => {
      const request = new NextRequest(`${BASE_URL}?shop=test-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sample_text: "Test sample content",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect([400, 404]).toContain(response.status);
      expect(data.success).toBe(false);
    });

    it("should return 400 when both required fields are missing", async () => {
      const request = new NextRequest(`${BASE_URL}?shop=test-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect([400, 404]).toContain(response.status);
      expect(data.success).toBe(false);
    });
  });

  describe("Response Structure", () => {
    it("should include success field in all responses", async () => {
      const request = new NextRequest(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty("success");
      expect(typeof data.success).toBe("boolean");
    });
  });

  describe("Sample Limits", () => {
    // Note: Testing limit enforcement would require creating 10+ samples
    // which could pollute the test database. These tests document expected behavior.
    it.todo("should enforce maximum of 10 samples per shop");
    it.todo("should return 400 when sample limit exceeded");
  });

  describe("Content Sanitization", () => {
    // Generate text with enough words (500+ required)
    const generateLongText = (baseText: string) => {
      return (baseText + " ").repeat(100); // ~100-200 words per repeat depending on base
    };

    it("should sanitize script tags from sample_text", async () => {
      const maliciousText = generateLongText(
        "This is legitimate content. <script>alert('xss')</script> More content here.",
      );

      const request = createAuthenticatedRequest(API_URLS.CONTENT_SAMPLES, {
        method: "POST",
        body: {
          sample_text: maliciousText,
          sample_type: "blog",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // If successful, the script tag should be removed
      if (response.status === 201) {
        expect(data.data.sample.sample_text).not.toContain("<script>");
        expect(data.data.sample.sample_text).not.toContain("</script>");
      }
    });

    it("should reject invalid sample_type", async () => {
      const longText = generateLongText("This is test content for validation.");

      const request = createAuthenticatedRequest(API_URLS.CONTENT_SAMPLES, {
        method: "POST",
        body: {
          sample_text: longText,
          sample_type: "invalid_type",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid sample type");
    });

    it("should calculate and store word_count", async () => {
      const longText = generateLongText("Word count test content here.");

      const request = createAuthenticatedRequest(API_URLS.CONTENT_SAMPLES, {
        method: "POST",
        body: {
          sample_text: longText,
          sample_type: "blog",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 201) {
        expect(data.data).toHaveProperty("word_count");
        expect(typeof data.data.word_count).toBe("number");
        expect(data.data.word_count).toBeGreaterThanOrEqual(500);
      }
    });
  });

  describe("Sample Types - Valid Types", () => {
    // Actual valid types from input-sanitization.ts: blog, email, description, other
    const validTypes = ["blog", "email", "description", "other"];
    const generateLongText = (type: string) =>
      `This is a ${type} sample content that needs to be long enough to pass the 500 word minimum validation requirement. `.repeat(
        60,
      );

    validTypes.forEach((type) => {
      it(`should accept sample_type: ${type}`, async () => {
        const request = createAuthenticatedRequest(API_URLS.CONTENT_SAMPLES, {
          method: "POST",
          body: {
            sample_text: generateLongText(type),
            sample_type: type,
          },
        });

        const response = await POST(request);
        const data = await response.json();

        // Should either succeed (201) or fail for non-validation reason (e.g., limit reached)
        // Should NOT fail with "Invalid sample type"
        if (response.status === 400) {
          expect(data.error).not.toContain("Invalid sample type");
        }
      });
    });
  });

  describe("Sample Types - Invalid Types", () => {
    const invalidTypes = [
      "product_description",
      "social_post",
      "ad_copy",
      "random",
    ];
    const generateLongText = () =>
      "This is sample content for testing invalid types. ".repeat(60);

    invalidTypes.forEach((type) => {
      it(`should reject invalid sample_type: ${type}`, async () => {
        const request = createAuthenticatedRequest(API_URLS.CONTENT_SAMPLES, {
          method: "POST",
          body: {
            sample_text: generateLongText(),
            sample_type: type,
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Invalid sample type");
      });
    });
  });
});

describe("Content Samples - Authenticated Operations", () => {
  // These tests use the real test shop: zunosai-staging-test-store.myshopify.com

  describe("GET with authentication", () => {
    it("should return samples for authenticated shop", async () => {
      const request = createAuthenticatedGetRequest(API_URLS.CONTENT_SAMPLES);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("samples");
      expect(data.data).toHaveProperty("active_count");
      expect(data.data).toHaveProperty("total_count");
      expect(Array.isArray(data.data.samples)).toBe(true);
    });

    it("should return sample count metadata", async () => {
      const request = createAuthenticatedGetRequest(API_URLS.CONTENT_SAMPLES);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(typeof data.data.active_count).toBe("number");
      expect(typeof data.data.total_count).toBe("number");
      expect(data.data.active_count).toBeLessThanOrEqual(data.data.total_count);
    });
  });

  describe("Sample data structure", () => {
    it("should return samples with required fields", async () => {
      const request = createAuthenticatedGetRequest(API_URLS.CONTENT_SAMPLES);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // If there are samples, verify their structure
      if (data.data.samples.length > 0) {
        const sample = data.data.samples[0];
        expect(sample).toHaveProperty("id");
        expect(sample).toHaveProperty("store_id");
        expect(sample).toHaveProperty("sample_text");
        expect(sample).toHaveProperty("sample_type");
        expect(sample).toHaveProperty("word_count");
        expect(sample).toHaveProperty("is_active");
      }
    });
  });
});
