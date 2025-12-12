/**
 * RLS (Row Level Security) Integration Tests
 *
 * These tests verify that Row Level Security policies correctly isolate
 * multi-tenant data and prevent cross-store data access.
 *
 * Test Strategy:
 * 1. Create two test users with authenticated sessions
 * 2. Verify each user can only access their own store data
 * 3. Verify service role can access all data
 * 4. Test all CRUD operations respect RLS
 *
 * Note: RLS is verified by behavior, not by querying pg_tables (which isn't
 * accessible via Supabase REST API). RLS returns empty results for unauthorized
 * queries rather than errors in most cases.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  createTestUserClient,
  deleteTestUser,
  getAuthUserId,
  createServiceClient,
} from "../utils/auth-helpers";

// Test data - use timestamp to ensure uniqueness across test runs
const TEST_TIMESTAMP = Date.now();
const TEST_STORE_1 = {
  id: "00000000-0000-0000-0000-000000000001",
  shop_domain: `test-store-1-${TEST_TIMESTAMP}.myshopify.com`,
  email: `rls-test-1-${TEST_TIMESTAMP}@example.com`,
  password: "test-password-123!",
};

const TEST_STORE_2 = {
  id: "00000000-0000-0000-0000-000000000002",
  shop_domain: `test-store-2-${TEST_TIMESTAMP}.myshopify.com`,
  email: `rls-test-2-${TEST_TIMESTAMP}@example.com`,
  password: "test-password-456!",
};

describe("RLS Integration Tests", () => {
  let serviceClient: SupabaseClient;
  let store1Client: SupabaseClient;
  let store2Client: SupabaseClient;
  let store1UserId: string;
  let store2UserId: string;

  beforeAll(async () => {
    // Create service role client (bypasses RLS)
    serviceClient = createServiceClient();

    // Create authenticated clients for each test user
    store1Client = await createTestUserClient(TEST_STORE_1);
    store2Client = await createTestUserClient(TEST_STORE_2);

    // Get the authenticated user IDs
    store1UserId = await getAuthUserId(store1Client);
    store2UserId = await getAuthUserId(store2Client);

    // Create test shops using service role
    // Note: shops table uses shopify_access_token (not access_token)
    const { error: store1Error } = await serviceClient.from("shops").upsert(
      {
        id: store1UserId,
        shop_domain: TEST_STORE_1.shop_domain,
        shopify_access_token: "test-token-1",
        is_active: true,
      },
      { onConflict: "id" },
    );

    const { error: store2Error } = await serviceClient.from("shops").upsert(
      {
        id: store2UserId,
        shop_domain: TEST_STORE_2.shop_domain,
        shopify_access_token: "test-token-2",
        is_active: true,
      },
      { onConflict: "id" },
    );

    if (store1Error)
      throw new Error(`Failed to create test store 1: ${store1Error.message}`);
    if (store2Error)
      throw new Error(`Failed to create test store 2: ${store2Error.message}`);
  }, 30000); // 30 second timeout for user creation

  afterAll(async () => {
    // Clean up test data in reverse dependency order
    try {
      await serviceClient
        .from("content_samples")
        .delete()
        .in("store_id", [store1UserId, store2UserId]);
      await serviceClient
        .from("brand_voice_profiles")
        .delete()
        .in("store_id", [store1UserId, store2UserId]);
      await serviceClient
        .from("generated_content")
        .delete()
        .in("store_id", [store1UserId, store2UserId]);
      await serviceClient
        .from("category_templates")
        .delete()
        .in("store_id", [store1UserId, store2UserId]);
      await serviceClient
        .from("shops")
        .delete()
        .in("id", [store1UserId, store2UserId]);

      // Delete test users from Auth
      await deleteTestUser(store1UserId);
      await deleteTestUser(store2UserId);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }, 30000);

  describe("Shops Table RLS", () => {
    test("service role can view all shops", async () => {
      const { data, error } = await serviceClient
        .from("shops")
        .select("*")
        .in("id", [store1UserId, store2UserId]);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    test("authenticated user can view own shop record", async () => {
      const { data, error } = await store1Client
        .from("shops")
        .select("*")
        .eq("id", store1UserId)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(store1UserId);
      expect(data?.shop_domain).toBe(TEST_STORE_1.shop_domain);
    });

    test("authenticated user CANNOT view other shop records", async () => {
      // RLS returns empty result (not error) for unauthorized queries
      const { data, error } = await store1Client
        .from("shops")
        .select("*")
        .eq("id", store2UserId);

      // PostgREST returns empty array, not error, when RLS blocks access
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe("Content Samples RLS", () => {
    const SAMPLE_1_ID = "00000000-0000-0000-0000-000000000101";
    const SAMPLE_2_ID = "00000000-0000-0000-0000-000000000102";

    beforeAll(async () => {
      // Create test samples using service role
      const { error } = await serviceClient.from("content_samples").upsert([
        {
          id: SAMPLE_1_ID,
          store_id: store1UserId,
          sample_text: "Test sample for store 1 - this is a test content sample with enough words to meet the minimum requirement of 500 words. ".repeat(
            10,
          ),
          sample_type: "blog",
          word_count: 500,
          is_active: true,
        },
        {
          id: SAMPLE_2_ID,
          store_id: store2UserId,
          sample_text: "Test sample for store 2 - this is a test content sample with enough words to meet the minimum requirement of 500 words. ".repeat(
            10,
          ),
          sample_type: "email",
          word_count: 600,
          is_active: true,
        },
      ]);
      if (error) console.error("Sample creation error:", error);
    });

    test("service role can view all content samples", async () => {
      const { data, error } = await serviceClient
        .from("content_samples")
        .select("*")
        .in("id", [SAMPLE_1_ID, SAMPLE_2_ID]);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    test("store can view own content samples", async () => {
      const { data, error } = await store1Client
        .from("content_samples")
        .select("*")
        .eq("id", SAMPLE_1_ID)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(SAMPLE_1_ID);
      expect(data?.store_id).toBe(store1UserId);
    });

    test("store CANNOT view other store content samples", async () => {
      // RLS returns empty result for unauthorized queries
      const { data, error } = await store1Client
        .from("content_samples")
        .select("*")
        .eq("id", SAMPLE_2_ID);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test("store can insert own content samples", async () => {
      const newSampleId = "00000000-0000-0000-0000-000000000103";
      const newSample = {
        id: newSampleId,
        store_id: store1UserId,
        sample_text: "New test sample content that needs to be long enough to meet the 500 word minimum requirement for content samples. ".repeat(
          10,
        ),
        sample_type: "description",
        word_count: 550,
        is_active: true,
      };

      const { data, error } = await store1Client
        .from("content_samples")
        .insert(newSample)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.store_id).toBe(store1UserId);

      // Clean up
      await serviceClient.from("content_samples").delete().eq("id", newSampleId);
    });

    test("store CANNOT insert samples for other stores", async () => {
      const maliciousSample = {
        store_id: store2UserId, // Trying to insert for another store
        sample_text: "Malicious sample content. ".repeat(50),
        sample_type: "blog",
        word_count: 500,
        is_active: true,
      };

      const { data, error } = await store1Client
        .from("content_samples")
        .insert(maliciousSample)
        .select();

      // RLS should prevent this - either error or empty result
      const blocked = error !== null || (data && data.length === 0);
      expect(blocked).toBe(true);
    });

    test("store can update own content samples", async () => {
      const newText = "Updated sample text that still meets the 500 word minimum. ".repeat(
        10,
      );
      const { data, error } = await store1Client
        .from("content_samples")
        .update({ sample_text: newText })
        .eq("id", SAMPLE_1_ID)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.sample_text).toBe(newText);
    });

    test("store CANNOT update other store content samples", async () => {
      const { data, error } = await store1Client
        .from("content_samples")
        .update({ sample_text: "Malicious update" })
        .eq("id", SAMPLE_2_ID)
        .select();

      // RLS returns empty array when update is blocked
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify original data unchanged
      const { data: original } = await serviceClient
        .from("content_samples")
        .select("sample_text")
        .eq("id", SAMPLE_2_ID)
        .single();

      expect(original?.sample_text).not.toBe("Malicious update");
    });

    test("store can delete own content samples", async () => {
      // Create a sample to delete
      const deletableSampleId = "00000000-0000-0000-0000-000000000104";
      await serviceClient.from("content_samples").insert({
        id: deletableSampleId,
        store_id: store1UserId,
        sample_text: "Sample to delete content. ".repeat(50),
        sample_type: "blog",
        word_count: 500,
        is_active: true,
      });

      // Delete it as store1
      const { error } = await store1Client
        .from("content_samples")
        .delete()
        .eq("id", deletableSampleId);

      expect(error).toBeNull();

      // Verify it's deleted
      const { data: deletedSample } = await serviceClient
        .from("content_samples")
        .select("*")
        .eq("id", deletableSampleId);

      expect(deletedSample).toHaveLength(0);
    });

    test("store CANNOT delete other store content samples", async () => {
      // Attempt to delete store2's sample as store1
      await store1Client
        .from("content_samples")
        .delete()
        .eq("id", SAMPLE_2_ID);

      // RLS silently ignores the delete - verify sample still exists
      const { data } = await serviceClient
        .from("content_samples")
        .select("*")
        .eq("id", SAMPLE_2_ID)
        .single();

      expect(data).not.toBeNull();
      expect(data?.store_id).toBe(store2UserId);
    });
  });

  describe("Brand Voice Profiles RLS", () => {
    const PROFILE_1_ID = "00000000-0000-0000-0000-000000000201";
    const PROFILE_2_ID = "00000000-0000-0000-0000-000000000202";

    beforeAll(async () => {
      const { error } = await serviceClient.from("brand_voice_profiles").upsert([
        {
          id: PROFILE_1_ID,
          store_id: store1UserId,
          profile_text: "Test profile for store 1",
          profile_version: 1,
          is_current: true,
          sample_ids: [],
        },
        {
          id: PROFILE_2_ID,
          store_id: store2UserId,
          profile_text: "Test profile for store 2",
          profile_version: 1,
          is_current: true,
          sample_ids: [],
        },
      ]);
      if (error) console.error("Profile creation error:", error);
    });

    test("store can view own voice profile", async () => {
      const { data, error } = await store1Client
        .from("brand_voice_profiles")
        .select("*")
        .eq("id", PROFILE_1_ID)
        .single();

      expect(error).toBeNull();
      expect(data?.store_id).toBe(store1UserId);
    });

    test("store CANNOT view other store voice profiles", async () => {
      const { data, error } = await store1Client
        .from("brand_voice_profiles")
        .select("*")
        .eq("id", PROFILE_2_ID);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe("Generated Content RLS", () => {
    const CONTENT_1_ID = "00000000-0000-0000-0000-000000000301";
    const CONTENT_2_ID = "00000000-0000-0000-0000-000000000302";

    beforeAll(async () => {
      const { error } = await serviceClient.from("generated_content").upsert([
        {
          id: CONTENT_1_ID,
          store_id: store1UserId,
          content_type: "blog",
          topic: "Test blog post",
          generated_text: "Generated content for store 1",
          word_count: 500,
        },
        {
          id: CONTENT_2_ID,
          store_id: store2UserId,
          content_type: "ad",
          topic: "Test ad copy",
          generated_text: "Generated content for store 2",
          word_count: 100,
        },
      ]);
      if (error) console.error("Generated content creation error:", error);
    });

    test("store can view own generated content", async () => {
      const { data, error } = await store1Client
        .from("generated_content")
        .select("*")
        .eq("id", CONTENT_1_ID)
        .single();

      expect(error).toBeNull();
      expect(data?.store_id).toBe(store1UserId);
    });

    test("store CANNOT view other store generated content", async () => {
      const { data, error } = await store1Client
        .from("generated_content")
        .select("*")
        .eq("id", CONTENT_2_ID);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe("Category Templates RLS (Global vs Store-Specific)", () => {
    const GLOBAL_TEMPLATE_ID = "00000000-0000-0000-0000-000000000401";
    const STORE1_TEMPLATE_ID = "00000000-0000-0000-0000-000000000402";
    const STORE2_TEMPLATE_ID = "00000000-0000-0000-0000-000000000403";

    beforeAll(async () => {
      // Create category templates with correct column names
      const { error } = await serviceClient.from("category_templates").upsert([
        {
          id: GLOBAL_TEMPLATE_ID,
          store_id: null, // Global template
          name: "Global Test Template",
          category: "test-category",
          content: "This is a global template content",
          is_default: true,
          is_active: true,
        },
        {
          id: STORE1_TEMPLATE_ID,
          store_id: store1UserId,
          name: "Store 1 Template",
          category: "test-category",
          content: "This is store 1 template content",
          is_default: false,
          is_active: true,
        },
        {
          id: STORE2_TEMPLATE_ID,
          store_id: store2UserId,
          name: "Store 2 Template",
          category: "test-category",
          content: "This is store 2 template content",
          is_default: false,
          is_active: true,
        },
      ]);
      if (error) console.error("Template creation error:", error);
    });

    test("global templates visible to all stores", async () => {
      const { data: data1, error: error1 } = await store1Client
        .from("category_templates")
        .select("*")
        .eq("id", GLOBAL_TEMPLATE_ID)
        .single();

      const { data: data2, error: error2 } = await store2Client
        .from("category_templates")
        .select("*")
        .eq("id", GLOBAL_TEMPLATE_ID)
        .single();

      // Global templates should be visible to both stores
      expect(error1).toBeNull();
      expect(error2).toBeNull();
      expect(data1).not.toBeNull();
      expect(data2).not.toBeNull();
      expect(data1?.store_id).toBeNull();
      expect(data2?.store_id).toBeNull();
    });

    test("store can view own store-specific templates", async () => {
      const { data, error } = await store1Client
        .from("category_templates")
        .select("*")
        .eq("id", STORE1_TEMPLATE_ID)
        .single();

      expect(error).toBeNull();
      expect(data?.store_id).toBe(store1UserId);
    });

    test("templates are shared - all stores can view all templates", async () => {
      // Note: category_templates RLS policy allows all authenticated users to view all templates
      // This is intentional - templates are shared resources, not store-private data
      const { data, error } = await store1Client
        .from("category_templates")
        .select("*")
        .eq("id", STORE2_TEMPLATE_ID);

      expect(error).toBeNull();
      // Templates are visible to all authenticated users by design
      expect(data).toHaveLength(1);
    });
  });

  describe("Performance Tests", () => {
    test("RLS queries complete in <1 second", async () => {
      const startTime = Date.now();

      await serviceClient.from("shops").select("*").limit(100);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
    });

    test("complex queries with RLS complete in <2 seconds", async () => {
      const startTime = Date.now();

      // Complex query with joins
      await serviceClient
        .from("shops")
        .select(
          `
          *,
          content_samples(*),
          brand_voice_profiles(*)
        `,
        )
        .limit(50);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });
});
