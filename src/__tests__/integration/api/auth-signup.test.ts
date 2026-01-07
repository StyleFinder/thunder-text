/**
 * Auth Signup API Tests
 * Tests for POST /api/auth/signup endpoint
 *
 * Tests the email/password signup flow that creates a pending shop record
 * which later gets merged with a real Shopify store during OAuth callback.
 */

import { describe, it, expect, afterAll } from "@jest/globals";
import { POST } from "@/app/api/auth/signup/route";
import { NextRequest } from "next/server";
import { createServiceClient } from "../../utils/auth-helpers";

describe("POST /api/auth/signup", () => {
  const BASE_URL = "http://localhost:3050/api/auth/signup";
  const serviceClient = createServiceClient();

  // Test email with timestamp to ensure uniqueness
  const testTimestamp = Date.now();
  const testEmail = `test-signup-${testTimestamp}@example.com`;
  const testPassword = "SecurePass123!";
  const testBusinessName = "Test Business Store";

  // Track created shop IDs for cleanup
  const createdShopIds: string[] = [];

  afterAll(async () => {
    // Cleanup: Delete any test shops created during tests
    for (const shopId of createdShopIds) {
      try {
        await serviceClient.from("shops").delete().eq("id", shopId);
      } catch (error) {
        console.warn(`Could not cleanup test shop ${shopId}:`, error);
      }
    }

    // Also cleanup by email pattern (in case we missed any)
    try {
      await serviceClient
        .from("shops")
        .delete()
        .like("email", "test-signup-%@example.com");
    } catch (error) {
      console.warn("Could not cleanup test shops by email pattern:", error);
    }
  });

  /**
   * Helper to create a signup request
   */
  function createSignupRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  describe("Input Validation", () => {
    it("should reject request without email", async () => {
      const request = createSignupRequest({
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toHaveProperty("email");
    });

    it("should reject request without password", async () => {
      const request = createSignupRequest({
        email: "test@example.com",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toHaveProperty("password");
    });

    it("should reject invalid email format", async () => {
      const request = createSignupRequest({
        email: "invalid-email",
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.email).toBeDefined();
    });

    it("should reject password shorter than 8 characters", async () => {
      const request = createSignupRequest({
        email: "test@example.com",
        password: "Short1",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.password).toBeDefined();
    });

    it("should reject password without uppercase letter", async () => {
      const request = createSignupRequest({
        email: "test@example.com",
        password: "lowercase123",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.password).toBeDefined();
    });

    it("should reject password without lowercase letter", async () => {
      const request = createSignupRequest({
        email: "test@example.com",
        password: "UPPERCASE123",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.password).toBeDefined();
    });

    it("should reject password without number", async () => {
      const request = createSignupRequest({
        email: "test@example.com",
        password: "NoNumbersHere",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.password).toBeDefined();
    });

    it("should accept valid password with all requirements", async () => {
      const uniqueEmail = `test-valid-${Date.now()}@example.com`;
      const request = createSignupRequest({
        email: uniqueEmail,
        password: "ValidPass123",
      });

      const response = await POST(request);
      const data = await response.json();

      // Should succeed (201) or fail for other reasons, not password validation
      if (response.status === 201) {
        createdShopIds.push(data.shop.id);
      }
      expect(response.status).not.toBe(400);
    });
  });

  describe("Successful Signup", () => {
    it("should create a new shop with valid credentials", async () => {
      const request = createSignupRequest({
        email: testEmail,
        password: testPassword,
        businessName: testBusinessName,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Account created successfully");
      expect(data.shop).toHaveProperty("id");
      expect(data.shop).toHaveProperty("email");
      expect(data.shop.email).toBe(testEmail.toLowerCase());

      // Track for cleanup
      createdShopIds.push(data.shop.id);
    });

    it("should create shop with pending domain pattern", async () => {
      const uniqueEmail = `test-pending-${Date.now()}@example.com`;
      const request = createSignupRequest({
        email: uniqueEmail,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      createdShopIds.push(data.shop.id);

      // Verify the shop domain in database follows pending pattern
      const { data: shopRecord } = await serviceClient
        .from("shops")
        .select("shop_domain")
        .eq("id", data.shop.id)
        .single();

      expect(shopRecord).not.toBeNull();
      expect(shopRecord!.shop_domain).toMatch(/^pending-\d+\./);
    });

    it("should store password hash, not plaintext", async () => {
      const uniqueEmail = `test-hash-${Date.now()}@example.com`;
      const request = createSignupRequest({
        email: uniqueEmail,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      createdShopIds.push(data.shop.id);

      // Verify password is hashed in database
      const { data: shopRecord } = await serviceClient
        .from("shops")
        .select("password_hash")
        .eq("id", data.shop.id)
        .single();

      expect(shopRecord).not.toBeNull();
      expect(shopRecord!.password_hash).not.toBe(testPassword);
      expect(shopRecord!.password_hash).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it("should store email in lowercase", async () => {
      const mixedCaseEmail = `Test-UPPER-${Date.now()}@Example.COM`;
      const request = createSignupRequest({
        email: mixedCaseEmail,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      createdShopIds.push(data.shop.id);

      expect(data.shop.email).toBe(mixedCaseEmail.toLowerCase());
    });

    it("should store business name when provided", async () => {
      const uniqueEmail = `test-biz-${Date.now()}@example.com`;
      const bizName = "My Awesome Store";
      const request = createSignupRequest({
        email: uniqueEmail,
        password: testPassword,
        businessName: bizName,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      createdShopIds.push(data.shop.id);

      // Verify business name in database
      const { data: shopRecord } = await serviceClient
        .from("shops")
        .select("store_name, display_name")
        .eq("id", data.shop.id)
        .single();

      expect(shopRecord).not.toBeNull();
      expect(shopRecord!.store_name).toBe(bizName);
      expect(shopRecord!.display_name).toBe(bizName);
    });

    it("should create shop without business name (optional field)", async () => {
      const uniqueEmail = `test-nobiz-${Date.now()}@example.com`;
      const request = createSignupRequest({
        email: uniqueEmail,
        password: testPassword,
        // No businessName provided
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      createdShopIds.push(data.shop.id);
    });

    it("should set shop as active and shopify type", async () => {
      const uniqueEmail = `test-active-${Date.now()}@example.com`;
      const request = createSignupRequest({
        email: uniqueEmail,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      createdShopIds.push(data.shop.id);

      // Verify shop settings in database
      const { data: shopRecord } = await serviceClient
        .from("shops")
        .select("is_active, shop_type")
        .eq("id", data.shop.id)
        .single();

      expect(shopRecord).not.toBeNull();
      expect(shopRecord!.is_active).toBe(true);
      expect(shopRecord!.shop_type).toBe("shopify");
    });
  });

  describe("Duplicate Email Handling", () => {
    it("should reject signup with existing email", async () => {
      // First, create a shop
      const duplicateEmail = `test-dup-${Date.now()}@example.com`;
      const firstRequest = createSignupRequest({
        email: duplicateEmail,
        password: testPassword,
      });

      const firstResponse = await POST(firstRequest);
      const firstData = await firstResponse.json();
      expect(firstResponse.status).toBe(201);
      createdShopIds.push(firstData.shop.id);

      // Now try to create another with same email
      const secondRequest = createSignupRequest({
        email: duplicateEmail,
        password: testPassword,
      });

      const secondResponse = await POST(secondRequest);
      const secondData = await secondResponse.json();

      expect(secondResponse.status).toBe(409);
      expect(secondData.error).toBe(
        "An account with this email already exists",
      );
    });

    it("should reject signup with existing email (case insensitive)", async () => {
      // First, create a shop with lowercase
      const baseEmail = `test-case-${Date.now()}@example.com`;
      const firstRequest = createSignupRequest({
        email: baseEmail.toLowerCase(),
        password: testPassword,
      });

      const firstResponse = await POST(firstRequest);
      const firstData = await firstResponse.json();
      expect(firstResponse.status).toBe(201);
      createdShopIds.push(firstData.shop.id);

      // Now try with uppercase version
      const secondRequest = createSignupRequest({
        email: baseEmail.toUpperCase(),
        password: testPassword,
      });

      const secondResponse = await POST(secondRequest);
      const secondData = await secondResponse.json();

      expect(secondResponse.status).toBe(409);
      expect(secondData.error).toBe(
        "An account with this email already exists",
      );
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      const uniqueEmail = `test-struct-${Date.now()}@example.com`;
      const request = createSignupRequest({
        email: uniqueEmail,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("shop");
      expect(data.shop).toHaveProperty("id");
      expect(data.shop).toHaveProperty("email");

      createdShopIds.push(data.shop.id);
    });

    it("should return error response with correct structure on validation failure", async () => {
      const request = createSignupRequest({
        email: "invalid",
        password: "weak",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
      expect(data).toHaveProperty("details");
    });

    it("should return JSON content type", async () => {
      const request = createSignupRequest({
        email: "test@example.com",
        password: "weak",
      });

      const response = await POST(request);

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });
  });
});
