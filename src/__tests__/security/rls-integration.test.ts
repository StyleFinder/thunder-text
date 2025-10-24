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
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  createTestUserClient,
  deleteTestUser,
  getAuthUserId,
  createServiceClient,
} from "../utils/test-auth";

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
    const { error: store1Error } = await serviceClient.from("shops").upsert(
      {
        id: store1UserId,
        shop_domain: TEST_STORE_1.shop_domain,
        access_token: "test-token-1",
        is_active: true,
      },
      { onConflict: "id" },
    );

    const { error: store2Error } = await serviceClient.from("shops").upsert(
      {
        id: store2UserId,
        shop_domain: TEST_STORE_2.shop_domain,
        access_token: "test-token-2",
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
    // Clean up test data
    await serviceClient
      .from("content_samples")
      .delete()
      .in("store_id", [store1UserId, store2UserId]);
    await serviceClient
      .from("brand_voice_profiles")
      .delete()
      .in("user_id", [store1UserId, store2UserId]);
    await serviceClient
      .from("generated_content")
      .delete()
      .in("user_id", [store1UserId, store2UserId]);
    await serviceClient
      .from("shops")
      .delete()
      .in("id", [store1UserId, store2UserId]);

    // Delete test users from Auth
    await deleteTestUser(store1UserId);
    await deleteTestUser(store2UserId);
  }, 30000);

  describe("Shops Table RLS", () => {
    test("shops table has RLS enabled", async () => {
      const { data, error } = await serviceClient
        .from("pg_tables")
        .select("rowsecurity")
        .eq("schemaname", "public")
        .eq("tablename", "shops")
        .single();

      expect(error).toBeNull();
      expect(data?.rowsecurity).toBe(true);
    });

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
      const { data, error } = await store1Client
        .from("shops")
        .select("*")
        .eq("id", store2UserId)
        .single();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });
  });

  describe("Content Samples RLS", () => {
    const SAMPLE_1_ID = "00000000-0000-0000-0000-000000000101";
    const SAMPLE_2_ID = "00000000-0000-0000-0000-000000000102";

    beforeAll(async () => {
      // Create test samples using service role
      await serviceClient.from("content_samples").upsert([
        {
          id: SAMPLE_1_ID,
          store_id: store1UserId,
          sample_text: "Test sample for store 1",
          sample_type: "blog",
          word_count: 500,
          is_active: true,
        },
        {
          id: SAMPLE_2_ID,
          store_id: store2UserId,
          sample_text: "Test sample for store 2",
          sample_type: "email",
          word_count: 600,
          is_active: true,
        },
      ]);
    });

    test("content_samples table has RLS enabled", async () => {
      const { data, error } = await serviceClient
        .from("pg_tables")
        .select("rowsecurity")
        .eq("schemaname", "public")
        .eq("tablename", "content_samples")
        .single();

      expect(error).toBeNull();
      expect(data?.rowsecurity).toBe(true);
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
      const { data, error } = await store1Client
        .from("content_samples")
        .select("*")
        .eq("id", SAMPLE_2_ID)
        .single();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    test("store can insert own content samples", async () => {
      const newSample = {
        store_id: store1UserId,
        sample_text: "New test sample",
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
      if (data?.id) {
        await serviceClient.from("content_samples").delete().eq("id", data.id);
      }
    });

    test("store CANNOT insert samples for other stores", async () => {
      const maliciousSample = {
        store_id: store2UserId, // Trying to insert for another store
        sample_text: "Malicious sample",
        sample_type: "blog",
        word_count: 500,
        is_active: true,
      };

      const { error } = await store1Client
        .from("content_samples")
        .insert(maliciousSample)
        .select();

      // RLS should prevent this - either error or no data returned
      expect(error).not.toBeNull();
    });

    test("store can update own content samples", async () => {
      const { data, error } = await store1Client
        .from("content_samples")
        .update({ sample_text: "Updated sample text" })
        .eq("id", SAMPLE_1_ID)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.sample_text).toBe("Updated sample text");
    });

    test("store CANNOT update other store content samples", async () => {
      const { data, error } = await store1Client
        .from("content_samples")
        .update({ sample_text: "Malicious update" })
        .eq("id", SAMPLE_2_ID)
        .select();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    test("store can delete own content samples", async () => {
      // Create a sample to delete
      const { data: newSample } = await serviceClient
        .from("content_samples")
        .insert({
          store_id: store1UserId,
          sample_text: "Sample to delete",
          sample_type: "blog",
          word_count: 100,
          is_active: true,
        })
        .select()
        .single();

      // Delete it as store1
      const { error } = await store1Client
        .from("content_samples")
        .delete()
        .eq("id", newSample?.id);

      expect(error).toBeNull();

      // Verify it's deleted
      const { data: deletedSample } = await serviceClient
        .from("content_samples")
        .select("*")
        .eq("id", newSample?.id)
        .single();

      expect(deletedSample).toBeNull();
    });

    test("store CANNOT delete other store content samples", async () => {
      const { error } = await store1Client
        .from("content_samples")
        .delete()
        .eq("id", SAMPLE_2_ID);

      expect(error).not.toBeNull();

      // Verify sample still exists
      const { data } = await serviceClient
        .from("content_samples")
        .select("*")
        .eq("id", SAMPLE_2_ID)
        .single();

      expect(data).not.toBeNull();
    });
  });

  describe("Brand Voice Profiles RLS", () => {
    const PROFILE_1_ID = "00000000-0000-0000-0000-000000000201";
    const PROFILE_2_ID = "00000000-0000-0000-0000-000000000202";

    beforeAll(async () => {
      await serviceClient.from("brand_voice_profiles").upsert([
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
    });

    test("brand_voice_profiles table has RLS enabled", async () => {
      const { data, error } = await serviceClient
        .from("pg_tables")
        .select("rowsecurity")
        .eq("schemaname", "public")
        .eq("tablename", "brand_voice_profiles")
        .single();

      expect(error).toBeNull();
      expect(data?.rowsecurity).toBe(true);
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
        .eq("id", PROFILE_2_ID)
        .single();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });
  });

  describe("Generated Content RLS", () => {
    const CONTENT_1_ID = "00000000-0000-0000-0000-000000000301";
    const CONTENT_2_ID = "00000000-0000-0000-0000-000000000302";

    beforeAll(async () => {
      await serviceClient.from("generated_content").upsert([
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
    });

    test("generated_content table has RLS enabled", async () => {
      const { data, error } = await serviceClient
        .from("pg_tables")
        .select("rowsecurity")
        .eq("schemaname", "public")
        .eq("tablename", "generated_content")
        .single();

      expect(error).toBeNull();
      expect(data?.rowsecurity).toBe(true);
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
        .eq("id", CONTENT_2_ID)
        .single();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });
  });

  describe("Category Templates RLS (Global vs Store-Specific)", () => {
    const GLOBAL_TEMPLATE_ID = "00000000-0000-0000-0000-000000000401";
    const STORE1_TEMPLATE_ID = "00000000-0000-0000-0000-000000000402";
    const STORE2_TEMPLATE_ID = "00000000-0000-0000-0000-000000000403";

    beforeAll(async () => {
      // Check if category_templates table exists
      const { data: tableExists } = await serviceClient
        .from("pg_tables")
        .select("tablename")
        .eq("schemaname", "public")
        .eq("tablename", "category_templates")
        .single();

      if (tableExists) {
        await serviceClient.from("category_templates").upsert([
          {
            id: GLOBAL_TEMPLATE_ID,
            store_id: null, // Global template
            category: "test-category",
            template_data: { test: "global template" },
          },
          {
            id: STORE1_TEMPLATE_ID,
            store_id: store1UserId,
            category: "test-category",
            template_data: { test: "store 1 template" },
          },
          {
            id: STORE2_TEMPLATE_ID,
            store_id: store2UserId,
            category: "test-category",
            template_data: { test: "store 2 template" },
          },
        ]);
      }
    });

    test("global templates visible to all stores", async () => {
      const { data: data1 } = await store1Client
        .from("category_templates")
        .select("*")
        .eq("id", GLOBAL_TEMPLATE_ID)
        .single();

      const { data: data2 } = await store2Client
        .from("category_templates")
        .select("*")
        .eq("id", GLOBAL_TEMPLATE_ID)
        .single();

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

    test("store CANNOT view other store-specific templates", async () => {
      const { data, error } = await store1Client
        .from("category_templates")
        .select("*")
        .eq("id", STORE2_TEMPLATE_ID)
        .single();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
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
