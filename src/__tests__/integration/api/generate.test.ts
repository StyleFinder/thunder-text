/**
 * Generate API Tests
 * Tests for POST /api/generate endpoint
 *
 * Tests AI product description generation.
 * Core feature for Thunder Text product descriptions.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { POST } from "@/app/api/generate/route";
import { NextRequest } from "next/server";

// Mock the AI generator to avoid real AI calls during tests
jest.mock("@/lib/openai", () => ({
  aiGenerator: {
    generateProductDescription: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      description: "A beautiful, handcrafted product that combines quality materials with expert craftsmanship.",
      seoTitle: "Premium Handcrafted Product | Quality Guaranteed",
      seoDescription: "Discover our premium handcrafted product made with quality materials.",
      features: ["Handcrafted quality", "Premium materials", "Expert craftsmanship"],
      keywords: ["handcrafted", "premium", "quality"],
    }),
  },
}));

describe("POST /api/generate", () => {
  const BASE_URL = "http://localhost:3050/api/generate";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper to create POST request with body and headers
   */
  function createPostRequest(
    body: Record<string, unknown>,
    options: {
      authorization?: string;
      userAgent?: string;
      referer?: string;
    } = {}
  ): NextRequest {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (options.authorization) {
      headers["Authorization"] = options.authorization;
    }
    if (options.userAgent) {
      headers["User-Agent"] = options.userAgent;
    }
    if (options.referer) {
      headers["Referer"] = options.referer;
    }

    return new NextRequest(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  describe("Authentication", () => {
    it("should return 401 when not authenticated and not from Shopify", async () => {
      const request = createPostRequest({
        images: ["https://example.com/image.jpg"],
        productTitle: "Test Product",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should allow requests from Shopify user-agent", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      // Should not be 401
      expect(response.status).not.toBe(401);
    });

    it("should allow requests from .myshopify.com referer", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
        },
        {
          referer: "https://test-store.myshopify.com/admin",
        }
      );

      const response = await POST(request);
      // Should not be 401
      expect(response.status).not.toBe(401);
    });

    it("should allow requests with Bearer token", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
        },
        {
          authorization: "Bearer test-token-123",
        }
      );

      const response = await POST(request);
      // Should not be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe("Parameter Validation", () => {
    it("should return 400 when images are missing (non-Shopify request)", async () => {
      const request = createPostRequest(
        {
          productTitle: "Test Product",
        },
        {
          authorization: "Bearer test-token",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Images are required");
    });

    it("should return 400 when images array is empty (non-Shopify request)", async () => {
      const request = createPostRequest(
        {
          images: [],
          productTitle: "Test Product",
        },
        {
          authorization: "Bearer test-token",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Images are required");
    });

    it("should allow empty images for Shopify requests", async () => {
      const request = createPostRequest(
        {
          images: [],
          productTitle: "Test Product",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      // Should not be 400 for missing images
      expect(response.status).not.toBe(400);
    });
  });

  describe("Successful Generation", () => {
    it("should return generated content on success", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Premium Leather Wallet",
          category: "Accessories",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("data");
    });

    it("should include description in response", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty("description");
      expect(typeof data.data.description).toBe("string");
    });
  });

  describe("Optional Parameters", () => {
    it("should accept brandVoice parameter", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
          brandVoice: "Professional and sophisticated",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should accept targetLength parameter", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
          targetLength: "medium",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should accept keywords parameter", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
          keywords: ["premium", "handmade", "quality"],
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should accept category parameter", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
          category: "Fashion & Apparel",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Response Structure", () => {
    it("should return JSON content type", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);

      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should include CORS headers", async () => {
      const request = createPostRequest(
        {
          images: ["https://example.com/image.jpg"],
          productTitle: "Test Product",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);

      // CORS headers should be present
      expect(response.headers.get("access-control-allow-origin")).toBeDefined();
    });
  });

  describe("Multiple Images", () => {
    it("should accept multiple images", async () => {
      const request = createPostRequest(
        {
          images: [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg",
            "https://example.com/image3.jpg",
          ],
          productTitle: "Multi-Image Product",
        },
        {
          userAgent: "Shopify-Admin/1.0",
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should return error response with correct structure", async () => {
      const request = createPostRequest(
        {
          images: [],
          productTitle: "Test Product",
        },
        {
          authorization: "Bearer test-token",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty("error");
      expect(typeof data.error).toBe("string");
    });
  });
});
