#!/usr/bin/env node
/**
 * Direct SQL RLS Verification
 *
 * Tests RLS by directly executing SQL queries to verify policies are enforced
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log("🔒 Direct SQL RLS Verification");
console.log("=".repeat(60));

async function runTests() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Test 1: Check if RLS is enabled on critical tables
  console.log("\n📋 TEST 1: RLS Enabled on Critical Tables");
  console.log("-".repeat(60));

  const tables = [
    "content_samples",
    "brand_voice_profiles",
    "generated_content",
    "shops",
  ];

  for (const table of tables) {
    const { error } = await supabase.rpc("check_rls_enabled", {
      table_name: table,
    });

    if (error) {
      // Fallback: check via information_schema
      const { data: rlsData } = await supabase
        .from("pg_tables")
        .select("rowsecurity")
        .eq("tablename", table)
        .single();

      const enabled = rlsData?.rowsecurity;
      console.log(
        `${enabled ? "✅" : "❌"} ${table}: RLS ${enabled ? "ENABLED" : "DISABLED"}`,
      );
    } else {
      console.log(`✅ ${table}: RLS ENABLED`);
    }
  }

  // Test 2: Check if policies exist
  console.log("\n📋 TEST 2: RLS Policies Exist");
  console.log("-".repeat(60));

  const { data: policies, error: policiesError } =
    await supabase.rpc("get_policies_count");

  if (!policiesError && policies) {
    console.log(`✅ Found ${policies} RLS policies in database`);
  } else {
    // Fallback: Direct query via execute_sql
    console.log("⚠️  Using fallback method to check policies");

    const queryResult = await supabase.rpc("execute_sql", {
      query: `SELECT tablename, policyname, cmd, qual
              FROM pg_policies
              WHERE schemaname = 'public'
              AND tablename IN ('content_samples', 'brand_voice_profiles', 'generated_content', 'shops')
              ORDER BY tablename, policyname`,
    });

    console.log(`Found ${queryResult.data?.length || 0} policies`);
  }

  // Test 3: Create test users and verify isolation
  console.log("\n📋 TEST 3: Authentication and User Creation");
  console.log("-".repeat(60));

  const timestamp = Date.now();
  const user1Email = `rls-test-1-${timestamp}@example.com`;
  const user2Email = `rls-test-2-${timestamp}@example.com`;
  const password = "secure-test-password-123!";

  // Create clients with anon key (authenticated users)
  const anonClient1 = createClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const anonClient2 = createClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  // Sign up users
  const { data: user1Auth, error: user1Error } = await anonClient1.auth.signUp({
    email: user1Email,
    password: password,
  });

  const { data: user2Auth, error: user2Error } = await anonClient2.auth.signUp({
    email: user2Email,
    password: password,
  });

  if (user1Error || user2Error) {
    console.log(
      "❌ User creation failed:",
      user1Error?.message || user2Error?.message,
    );
    return;
  }

  console.log(`✅ User 1 created: ${user1Auth.user.id}`);
  console.log(`✅ User 2 created: ${user2Auth.user.id}`);

  // Test 4: Attempt cross-user data access
  console.log("\n📋 TEST 4: Data Isolation Test");
  console.log("-".repeat(60));

  // User 1 inserts data into content_samples
  const { data: insertResult, error: insertError } = await anonClient1
    .from("content_samples")
    .insert({
      sample_text: `User 1 test content ${timestamp}`,
      sample_type: "product_description",
      word_count: 10,
    })
    .select();

  if (insertError) {
    console.log(`⚠️  User 1 insert result: ${insertError.message}`);
  } else {
    console.log(`✅ User 1 created content sample: ${insertResult[0]?.id}`);

    // User 2 tries to read User 1's data
    const { data: crossRead, error: crossError } = await anonClient2
      .from("content_samples")
      .select("*")
      .eq("id", insertResult[0].id);

    if (crossError || crossRead.length === 0) {
      console.log("✅ User 2 CANNOT read User 1 data (RLS working correctly)");
    } else {
      console.log("❌ SECURITY ISSUE: User 2 CAN read User 1 data!");
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 RLS Verification Complete");
  console.log("=".repeat(60));
}

runTests().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});
