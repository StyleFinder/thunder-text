#!/usr/bin/env node
/**
 * CLI-based RLS Verification Tool
 *
 * Tests Row Level Security by creating two authenticated Supabase clients
 * and verifying data isolation without requiring browser UI
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test users
const TEST_TIMESTAMP = Date.now();
const USERS = {
  user1: {
    email: `rls-verify-1-${TEST_TIMESTAMP}@example.com`,
    password: "secure-test-password-123!",
    shop_domain: `rls-test-shop-1-${TEST_TIMESTAMP}.myshopify.com`,
  },
  user2: {
    email: `rls-verify-2-${TEST_TIMESTAMP}@example.com`,
    password: "secure-test-password-456!",
    shop_domain: `rls-test-shop-2-${TEST_TIMESTAMP}.myshopify.com`,
  },
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, passed, details = "") {
  results.total++;
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status}: ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
  results.tests.push({ name, passed, details });
}

async function createAuthenticatedClient(userConfig) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Try to sign in first
  let { data: signInData, error: signInError } =
    await client.auth.signInWithPassword({
      email: userConfig.email,
      password: userConfig.password,
    });

  // If user doesn't exist, create them
  if (signInError) {
    const { error: signUpError } = await client.auth.signUp({
      email: userConfig.email,
      password: userConfig.password,
      options: {
        data: {
          shop_domain: userConfig.shop_domain,
        },
      },
    });

    if (signUpError) {
      throw new Error(`Failed to create user: ${signUpError.message}`);
    }

    // Try signing in again
    const signInRetry = await client.auth.signInWithPassword({
      email: userConfig.email,
      password: userConfig.password,
    });

    if (signInRetry.error) {
      throw new Error(
        `Failed to sign in after creation: ${signInRetry.error.message}`,
      );
    }

    signInData = signInRetry.data;
  }

  return { client, userId: signInData.user.id };
}

async function testTableIsolation(
  client1,
  client2,
  userId1,
  userId2,
  tableName,
  userIdColumn = "user_id",
) {
  console.log(`\n📋 Testing ${tableName} table isolation...`);

  // Test 1: User 1 creates sample data
  const sampleData = {
    [userIdColumn]: userId1,
    sample_text: `Test data from user1 - ${Date.now()}`,
    sample_type: "blog",
    word_count: 10,
    is_active: true,
  };

  const { data: created, error: createError } = await client1
    .from(tableName)
    .insert(sampleData)
    .select()
    .single();

  if (createError) {
    logTest(
      `${tableName}: User 1 can create data`,
      false,
      `Error: ${createError.message}`,
    );
    return;
  }

  logTest(
    `${tableName}: User 1 can create data`,
    true,
    `Created ID: ${created.id}`,
  );

  // Test 2: User 1 can read their own data
  const { data: user1Data, error: user1Error } = await client1
    .from(tableName)
    .select("*");

  const user1CanRead = !user1Error && user1Data.length > 0;
  logTest(
    `${tableName}: User 1 can read own data`,
    user1CanRead,
    user1CanRead
      ? `Found ${user1Data.length} records`
      : `Error: ${user1Error?.message}`,
  );

  // Test 3: User 2 CANNOT see User 1's data
  const { data: user2Data, error: user2Error } = await client2
    .from(tableName)
    .select("*")
    .eq("id", created.id);

  const properlyIsolated = !user2Error && user2Data.length === 0;
  logTest(
    `${tableName}: User 2 CANNOT see User 1 data`,
    properlyIsolated,
    properlyIsolated
      ? "Data properly isolated ✓"
      : `SECURITY ISSUE: Found ${user2Data?.length || 0} records`,
  );

  // Test 4: User 2 cannot query by User 1's ID
  const { data: crossQuery, error: crossError } = await client2
    .from(tableName)
    .select("*")
    .eq(userIdColumn, userId1);

  const blockedCrossQuery = !crossError && crossQuery.length === 0;
  logTest(
    `${tableName}: Cross-user query blocked`,
    blockedCrossQuery,
    blockedCrossQuery
      ? "Cross-user access blocked ✓"
      : `SECURITY ISSUE: Found ${crossQuery?.length || 0} records`,
  );
}

async function runTests() {
  console.log("🔒 RLS Verification Tool");
  console.log("=".repeat(60));
  console.log(`Test timestamp: ${TEST_TIMESTAMP}\n`);

  try {
    // Create authenticated clients
    console.log("📝 Creating test users...");
    const { client: client1, userId: userId1 } =
      await createAuthenticatedClient(USERS.user1);
    console.log(`✓ User 1 authenticated: ${userId1}`);

    const { client: client2, userId: userId2 } =
      await createAuthenticatedClient(USERS.user2);
    console.log(`✓ User 2 authenticated: ${userId2}`);

    // Test content_samples table (uses user_id)
    await testTableIsolation(
      client1,
      client2,
      userId1,
      userId2,
      "content_samples",
      "user_id",
    );

    // Test brand_voice_profiles table (uses store_id)
    console.log(`\n📋 Testing brand_voice_profiles table isolation...`);
    const brandVoiceData = {
      store_id: userId1,
      profile_text: `Test brand voice profile ${Date.now()}`,
      profile_version: 1,
      is_current: true,
      user_edited: false,
      sample_ids: [],
    };

    const { data: voiceCreated, error: voiceError } = await client1
      .from("brand_voice_profiles")
      .insert(brandVoiceData)
      .select()
      .single();

    if (!voiceError && voiceCreated) {
      logTest(
        "brand_voice_profiles: User 1 can create data",
        true,
        `Created ID: ${voiceCreated.id}`,
      );

      const { data: user2Voice, error: user2VoiceError } = await client2
        .from("brand_voice_profiles")
        .select("*")
        .eq("id", voiceCreated.id);

      const voiceIsolated = !user2VoiceError && user2Voice.length === 0;
      logTest(
        "brand_voice_profiles: User 2 CANNOT see User 1 data",
        voiceIsolated,
        voiceIsolated
          ? "Data properly isolated ✓"
          : `SECURITY ISSUE: Found ${user2Voice?.length || 0} records`,
      );
    } else {
      logTest(
        "brand_voice_profiles: User 1 can create data",
        false,
        `Error: ${voiceError?.message}`,
      );
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(
      `Pass Rate: ${Math.round((results.passed / results.total) * 100)}%`,
    );

    if (results.failed === 0) {
      console.log("\n🎉 ALL TESTS PASSED! RLS is working correctly.");
      process.exit(0);
    } else {
      console.log(
        "\n⚠️  SOME TESTS FAILED. Review the output above for details.",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
