/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Integration tests for token manager
 * Tests database operations for storing and retrieving access tokens
 *
 * NOTE: These tests require a running Supabase instance
 * Set SKIP_INTEGRATION_TESTS=true to skip these tests in CI
 */

const SKIP_TESTS = process.env.SKIP_INTEGRATION_TESTS === "true";

describe("Token Manager Integration", () => {
  let supabase: SupabaseClient;
  const TEST_SHOP = "token-test-store.myshopify.com";
  const TEST_TOKEN = "test-access-token-" + Date.now();

  beforeAll(() => {
    if (SKIP_TESTS) {
      console.log(
        "⏭️  Skipping integration tests (SKIP_INTEGRATION_TESTS=true)",
      );
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration for tests");
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  });

  afterAll(async () => {
    if (SKIP_TESTS || !supabase) return;

    // Clean up test data
    try {
      await supabase.from("shops").delete().eq("shop_domain", TEST_SHOP);
    } catch (error) {
      // Ignore cleanup errors
      console.log("Cleanup skipped:", error);
    }
  });

  describe("storeShopToken", () => {
    it("should store a new shop token", async () => {
      if (SKIP_TESTS) return;

      const { storeShopToken } = await import("@/lib/shopify/token-manager");

      const result = await storeShopToken(
        TEST_SHOP,
        TEST_TOKEN,
        "read_products,write_products",
      );

      if (!result.success) {
        console.log("Store token failed:", result.error);
      }

      expect(result.success).toBe(true);
      expect(result.shopId).toBeDefined();

      // Verify in database
      const { data } = await supabase
        .from("shops")
        .select("*")
        .eq("shop_domain", TEST_SHOP)
        .single();

      expect(data).toBeDefined();
      expect(data?.shopify_access_token).toBe(TEST_TOKEN);
      expect(data?.shopify_scope).toBe("read_products,write_products");
      expect(data?.is_active).toBe(true);
    });

    it("should update existing shop token (upsert)", async () => {
      if (SKIP_TESTS) return;

      const { storeShopToken } = await import("@/lib/shopify/token-manager");

      const newToken = "updated-token-" + Date.now();

      const result = await storeShopToken(
        TEST_SHOP,
        newToken,
        "read_products,write_products,read_orders",
      );

      expect(result.success).toBe(true);

      // Verify updated in database
      const { data } = await supabase
        .from("shops")
        .select("*")
        .eq("shop_domain", TEST_SHOP)
        .single();

      expect(data?.shopify_access_token).toBe(newToken);
      expect(data?.shopify_scope).toContain("read_orders");
    });

    it("should add .myshopify.com suffix if missing", async () => {
      if (SKIP_TESTS) return;

      const { storeShopToken } = await import("@/lib/shopify/token-manager");

      const shopWithoutSuffix = "test-shop-suffix";
      const token = "test-token-" + Date.now();

      const result = await storeShopToken(shopWithoutSuffix, token);

      expect(result.success).toBe(true);

      // Verify stored with full domain
      const { data } = await supabase
        .from("shops")
        .select("shop_domain")
        .eq("shop_domain", `${shopWithoutSuffix}.myshopify.com`)
        .single();

      expect(data?.shop_domain).toBe(`${shopWithoutSuffix}.myshopify.com`);

      // Cleanup
      await supabase
        .from("shops")
        .delete()
        .eq("shop_domain", `${shopWithoutSuffix}.myshopify.com`);
    });
  });

  describe("getShopToken", () => {
    it("should retrieve stored token", async () => {
      if (SKIP_TESTS) return;

      const { getShopToken } = await import("@/lib/shopify/token-manager");

      const result = await getShopToken(TEST_SHOP);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe("string");
    });

    it("should return error for non-existent shop", async () => {
      if (SKIP_TESTS) return;

      const { getShopToken } = await import("@/lib/shopify/token-manager");

      const result = await getShopToken("non-existent-shop.myshopify.com");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No token found");
    });

    it("should cache tokens for performance", async () => {
      if (SKIP_TESTS) return;

      const { getShopToken } = await import("@/lib/shopify/token-manager");

      // First call - from database
      const start1 = Date.now();
      const result1 = await getShopToken(TEST_SHOP);
      const _duration1 = Date.now() - start1;

      expect(result1.success).toBe(true);

      // Second call - from cache (should be faster)
      const start2 = Date.now();
      const result2 = await getShopToken(TEST_SHOP);
      const duration2 = Date.now() - start2;

      expect(result2.success).toBe(true);
      expect(result2.accessToken).toBe(result1.accessToken);
      // Cache should be very fast (< 10ms) since it's in-memory
      expect(duration2).toBeLessThan(10);
    });
  });

  describe("hasValidToken", () => {
    it("should return true for shop with token", async () => {
      if (SKIP_TESTS) return;

      const { hasValidToken } = await import("@/lib/shopify/token-manager");

      const result = await hasValidToken(TEST_SHOP);

      expect(result).toBe(true);
    });

    it("should return false for shop without token", async () => {
      if (SKIP_TESTS) return;

      const { hasValidToken } = await import("@/lib/shopify/token-manager");

      const result = await hasValidToken("no-token-shop.myshopify.com");

      expect(result).toBe(false);
    });
  });

  describe("getShopDetails", () => {
    it("should retrieve full shop details", async () => {
      if (SKIP_TESTS) return;

      const { getShopDetails } = await import("@/lib/shopify/token-manager");

      const result = await getShopDetails(TEST_SHOP);

      expect(result.success).toBe(true);
      expect(result.shop).toBeDefined();
      expect(result.shop?.shop_domain).toBe(TEST_SHOP);
      expect(result.shop?.is_active).toBe(true);
    });

    it("should return error for inactive shop", async () => {
      if (SKIP_TESTS) return;

      // Create inactive shop
      await supabase.from("shops").insert({
        shop_domain: "inactive-shop.myshopify.com",
        shopify_access_token: "test-token",
        is_active: false,
      });

      const { getShopDetails } = await import("@/lib/shopify/token-manager");

      const result = await getShopDetails("inactive-shop.myshopify.com");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Cleanup
      await supabase
        .from("shops")
        .delete()
        .eq("shop_domain", "inactive-shop.myshopify.com");
    });
  });

  describe("deactivateShopToken", () => {
    it("should soft delete shop token", async () => {
      if (SKIP_TESTS) return;

      const { deactivateShopToken } =
        await import("@/lib/shopify/token-manager");

      const result = await deactivateShopToken(TEST_SHOP);

      expect(result.success).toBe(true);

      // Verify shop is inactive
      const { data } = await supabase
        .from("shops")
        .select("is_active")
        .eq("shop_domain", TEST_SHOP)
        .single();

      expect(data?.is_active).toBe(false);

      // Reactivate for other tests
      await supabase
        .from("shops")
        .update({ is_active: true })
        .eq("shop_domain", TEST_SHOP);
    });
  });

  describe("Performance Tests", () => {
    it("should handle multiple concurrent requests", async () => {
      if (SKIP_TESTS) return;

      const { getShopToken } = await import("@/lib/shopify/token-manager");

      // Simulate 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        getShopToken(TEST_SHOP),
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it("should cache tokens across multiple shops", async () => {
      if (SKIP_TESTS) return;

      const { storeShopToken, getShopToken } =
        await import("@/lib/shopify/token-manager");

      const shops = [
        "perf-test-1.myshopify.com",
        "perf-test-2.myshopify.com",
        "perf-test-3.myshopify.com",
      ];

      // Store tokens for all shops
      for (const shop of shops) {
        await storeShopToken(shop, `token-${shop}`);
      }

      // First retrieval (from database)
      await Promise.all(shops.map((shop) => getShopToken(shop)));

      // Second retrieval (from cache) - should be faster
      const start = Date.now();
      const results = await Promise.all(
        shops.map((shop) => getShopToken(shop)),
      );
      const duration = Date.now() - start;

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.accessToken).toBe(`token-${shops[index]}`);
      });

      // Should be very fast from cache
      expect(duration).toBeLessThan(50); // < 50ms for 3 cached lookups

      // Cleanup
      for (const shop of shops) {
        await supabase.from("shops").delete().eq("shop_domain", shop);
      }
    });
  });
});
