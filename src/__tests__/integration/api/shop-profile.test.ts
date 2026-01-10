/**
 * Shop Profile API Tests
 * Tests for GET and PUT /api/shop/profile endpoint
 *
 * Tests fetching and updating shop profile data by shop domain or user ID.
 * Used in the onboarding welcome flow to collect store information.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { GET, PUT } from "@/app/api/shop/profile/route";
import { NextRequest } from "next/server";
import { createServiceClient } from "../../utils/auth-helpers";
import { TEST_SHOP as _TEST_SHOP, TENANT_A } from "../../utils/test-constants";

describe("/api/shop/profile", () => {
  const BASE_URL = "http://localhost:3050/api/shop/profile";
  const serviceClient = createServiceClient();

  // Test shop created for profile tests
  let testShopId: string;
  const testShopDomain = `test-profile-${Date.now()}.myshopify.com`;
  const testEmail = `test-profile-${Date.now()}@example.com`;

  beforeAll(async () => {
    // Create a test shop for profile tests
    const { data: newShop, error } = await serviceClient
      .from("shops")
      .insert({
        shop_domain: testShopDomain,
        email: testEmail,
        shop_type: "shopify",
        is_active: true,
        store_name: "Original Store Name",
        owner_name: "Original Owner",
        city: "Original City",
        state: "CA",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create test shop: ${error.message}`);
    }

    testShopId = newShop.id;
  });

  afterAll(async () => {
    // Cleanup test shop
    if (testShopId) {
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

  /**
   * Helper to create PUT request with body
   */
  function createPutRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest(BASE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  describe("GET /api/shop/profile", () => {
    describe("Parameter Validation", () => {
      it("should return 400 when neither shop nor userId provided", async () => {
        const request = new NextRequest(BASE_URL);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Missing shop or userId parameter");
      });

      it("should return 404 for non-existent shop domain", async () => {
        const request = createGetRequest({
          shop: "non-existent-shop-12345.myshopify.com",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Shop not found");
      });

      it("should return 404 for non-existent userId", async () => {
        const request = createGetRequest({
          userId: "00000000-0000-0000-0000-000000000000",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Shop not found");
      });
    });

    describe("Successful Retrieval", () => {
      it("should return shop profile by domain", async () => {
        const request = createGetRequest({ shop: testShopDomain });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("shop");
        expect(data.shop.shop_domain).toBe(testShopDomain);
        expect(data.shop.email).toBe(testEmail);
      });

      it("should return shop profile by userId", async () => {
        const request = createGetRequest({ userId: testShopId });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("shop");
        expect(data.shop.id).toBe(testShopId);
      });

      it("should include all expected profile fields", async () => {
        const request = createGetRequest({ shop: testShopDomain });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);

        const shop = data.shop;
        expect(shop).toHaveProperty("id");
        expect(shop).toHaveProperty("shop_domain");
        expect(shop).toHaveProperty("email");
        expect(shop).toHaveProperty("store_name");
        expect(shop).toHaveProperty("display_name");
        expect(shop).toHaveProperty("owner_name");
        expect(shop).toHaveProperty("owner_phone");
        expect(shop).toHaveProperty("city");
        expect(shop).toHaveProperty("state");
        expect(shop).toHaveProperty("store_type");
        expect(shop).toHaveProperty("years_in_business");
        expect(shop).toHaveProperty("industry_niche");
        expect(shop).toHaveProperty("advertising_goals");
      });

      it("should return correct values for populated fields", async () => {
        const request = createGetRequest({ shop: testShopDomain });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.shop.store_name).toBe("Original Store Name");
        expect(data.shop.owner_name).toBe("Original Owner");
        expect(data.shop.city).toBe("Original City");
        expect(data.shop.state).toBe("CA");
      });
    });

    describe("Using Real Test Stores", () => {
      it("should retrieve Coach Ellie test store profile", async () => {
        const request = createGetRequest({ shop: TENANT_A.domain });
        const response = await GET(request);
        const data = await response.json();

        // This test verifies the endpoint works with real test data
        expect(response.status).toBe(200);
        expect(data.shop.shop_domain).toBe(TENANT_A.domain);
      });
    });

    describe("Response Structure", () => {
      it("should return JSON content type", async () => {
        const request = createGetRequest({ shop: testShopDomain });
        const response = await GET(request);

        expect(response.headers.get("content-type")).toContain(
          "application/json",
        );
      });
    });
  });

  describe("PUT /api/shop/profile", () => {
    describe("Parameter Validation", () => {
      it("should return 400 when neither shop nor userId provided", async () => {
        const request = createPutRequest({
          store_name: "Updated Name",
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Missing shop or userId parameter");
      });
    });

    describe("Successful Updates", () => {
      it("should update store_name by shop domain", async () => {
        const newName = `Updated Store ${Date.now()}`;
        const request = createPutRequest({
          shop: testShopDomain,
          store_name: newName,
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.shop.store_name).toBe(newName);
      });

      it("should update store_name by userId", async () => {
        const newName = `Updated By ID ${Date.now()}`;
        const request = createPutRequest({
          userId: testShopId,
          store_name: newName,
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.shop.store_name).toBe(newName);
      });

      it("should keep display_name in sync with store_name", async () => {
        const newName = `Synced Name ${Date.now()}`;
        const request = createPutRequest({
          shop: testShopDomain,
          store_name: newName,
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.shop.store_name).toBe(newName);
        expect(data.shop.display_name).toBe(newName);
      });

      it("should update owner_name", async () => {
        const newOwner = `New Owner ${Date.now()}`;
        const request = createPutRequest({
          shop: testShopDomain,
          owner_name: newOwner,
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);

        // Verify in database
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("owner_name")
          .eq("shop_domain", testShopDomain)
          .single();

        expect(shopRecord!.owner_name).toBe(newOwner);
      });

      it("should update owner_phone", async () => {
        const newPhone = "555-123-4567";
        const request = createPutRequest({
          shop: testShopDomain,
          owner_phone: newPhone,
        });

        const response = await PUT(request);
        const _data = await response.json();

        expect(response.status).toBe(200);

        // Verify in database
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("owner_phone")
          .eq("shop_domain", testShopDomain)
          .single();

        expect(shopRecord!.owner_phone).toBe(newPhone);
      });

      it("should update city and state", async () => {
        const request = createPutRequest({
          shop: testShopDomain,
          city: "Austin",
          state: "TX",
        });

        const response = await PUT(request);
        const _data = await response.json();

        expect(response.status).toBe(200);

        // Verify in database
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("city, state")
          .eq("shop_domain", testShopDomain)
          .single();

        expect(shopRecord!.city).toBe("Austin");
        expect(shopRecord!.state).toBe("TX");
      });

      it("should update store_type", async () => {
        const request = createPutRequest({
          shop: testShopDomain,
          store_type: "both",
        });

        const response = await PUT(request);
        const _data = await response.json();

        expect(response.status).toBe(200);

        // Verify in database
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("store_type")
          .eq("shop_domain", testShopDomain)
          .single();

        expect(shopRecord!.store_type).toBe("both");
      });

      it("should update years_in_business", async () => {
        const request = createPutRequest({
          shop: testShopDomain,
          years_in_business: 5,
        });

        const response = await PUT(request);
        const _data = await response.json();

        expect(response.status).toBe(200);

        // Verify in database
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("years_in_business")
          .eq("shop_domain", testShopDomain)
          .single();

        expect(shopRecord!.years_in_business).toBe(5);
      });

      it("should update industry_niche", async () => {
        const niche = "Fashion & Apparel";
        const request = createPutRequest({
          shop: testShopDomain,
          industry_niche: niche,
        });

        const response = await PUT(request);
        const _data = await response.json();

        expect(response.status).toBe(200);

        // Verify in database
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("industry_niche")
          .eq("shop_domain", testShopDomain)
          .single();

        expect(shopRecord!.industry_niche).toBe(niche);
      });

      it("should update advertising_goals", async () => {
        const goals = ["increase_sales", "brand_awareness"];
        const request = createPutRequest({
          shop: testShopDomain,
          advertising_goals: goals,
        });

        const response = await PUT(request);
        const _data = await response.json();

        expect(response.status).toBe(200);

        // Verify in database
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("advertising_goals")
          .eq("shop_domain", testShopDomain)
          .single();

        // advertising_goals may be stored as JSON string or array depending on column type
        const storedGoals =
          typeof shopRecord!.advertising_goals === "string"
            ? JSON.parse(shopRecord!.advertising_goals)
            : shopRecord!.advertising_goals;
        expect(storedGoals).toEqual(goals);
      });

      it("should update multiple fields at once", async () => {
        const updates = {
          shop: testShopDomain,
          store_name: `Multi Update ${Date.now()}`,
          owner_name: "Multi Owner",
          city: "Denver",
          state: "CO",
          store_type: "online",
        };

        const request = createPutRequest(updates);
        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);

        // Verify all updates in database
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("store_name, owner_name, city, state, store_type")
          .eq("shop_domain", testShopDomain)
          .single();

        expect(shopRecord!.store_name).toBe(updates.store_name);
        expect(shopRecord!.owner_name).toBe(updates.owner_name);
        expect(shopRecord!.city).toBe(updates.city);
        expect(shopRecord!.state).toBe(updates.state);
        expect(shopRecord!.store_type).toBe(updates.store_type);
      });

      it("should only update provided fields (partial update)", async () => {
        // First, set known values
        await serviceClient
          .from("shops")
          .update({
            owner_name: "Keep This Owner",
            city: "Keep This City",
          })
          .eq("shop_domain", testShopDomain);

        // Now update only store_name
        const request = createPutRequest({
          shop: testShopDomain,
          store_name: `Partial Update ${Date.now()}`,
        });

        const response = await PUT(request);
        expect(response.status).toBe(200);

        // Verify owner_name and city were NOT changed
        const { data: shopRecord } = await serviceClient
          .from("shops")
          .select("owner_name, city")
          .eq("shop_domain", testShopDomain)
          .single();

        expect(shopRecord!.owner_name).toBe("Keep This Owner");
        expect(shopRecord!.city).toBe("Keep This City");
      });
    });

    describe("Response Structure", () => {
      it("should return success response with shop data", async () => {
        const request = createPutRequest({
          shop: testShopDomain,
          store_name: "Response Test",
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("success", true);
        expect(data).toHaveProperty("shop");
        expect(data.shop).toHaveProperty("id");
        expect(data.shop).toHaveProperty("shop_domain");
        expect(data.shop).toHaveProperty("store_name");
        expect(data.shop).toHaveProperty("display_name");
      });

      it("should return JSON content type", async () => {
        const request = createPutRequest({
          shop: testShopDomain,
          store_name: "Content Type Test",
        });

        const response = await PUT(request);

        expect(response.headers.get("content-type")).toContain(
          "application/json",
        );
      });
    });

    describe("Error Handling", () => {
      it("should return 500 when updating non-existent shop", async () => {
        const request = createPutRequest({
          shop: "non-existent-shop-xyz.myshopify.com",
          store_name: "Should Fail",
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to update shop profile");
      });
    });
  });
});
