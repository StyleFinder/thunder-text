#!/usr/bin/env node

/**
 * Test if PostgREST schema cache has picked up the generation_metadata column
 *
 * Usage: node scripts/test-postgrest-cache.js
 *
 * This script tests whether we can insert data with the generation_metadata field
 * via the Supabase REST API (PostgREST), which is what the application uses.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_KEY:", supabaseServiceKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPostgRESTCache() {
  console.log(
    "🔍 Testing PostgREST schema cache for generation_metadata column...\n",
  );

  // Test data with generation_metadata field
  const testData = {
    store_id: "00000000-0000-0000-0000-000000000000", // Test UUID
    content_type: "product_description",
    topic: "PostgREST Cache Test",
    generated_text:
      "This is a test to verify PostgREST schema cache has refreshed.",
    word_count: 10,
    generation_params: {
      word_count: 10,
      tone_intensity: "medium",
    },
    generation_metadata: {
      tokensUsed: 100,
      generationTimeMs: 1000,
      voiceProfileVersion: "1.0",
      postProcessing: { test: true },
    },
    is_saved: false,
  };

  try {
    // Attempt to insert with generation_metadata field
    const { data, error } = await supabase
      .from("generated_content")
      .insert(testData)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST204") {
        console.log("❌ PostgREST cache NOT refreshed yet");
        console.log("   Error:", error.message);
        console.log(
          "\n💡 The schema cache typically refreshes within 24 hours.",
        );
        console.log("   Run this script again later to check status.");
        return false;
      } else {
        console.log("⚠️  Unexpected error:", error.message);
        console.log("   Code:", error.code);
        return false;
      }
    }

    // Success! Clean up the test data
    console.log("✅ PostgREST cache HAS refreshed!");
    console.log("   Successfully inserted data with generation_metadata field");
    console.log("   Inserted ID:", data.id);

    // Clean up test data
    const { error: deleteError } = await supabase
      .from("generated_content")
      .delete()
      .eq("id", data.id);

    if (deleteError) {
      console.log("⚠️  Warning: Could not delete test data (ID:", data.id, ")");
    } else {
      console.log("   Test data cleaned up");
    }

    console.log("\n🎉 You can now uncomment the generation_metadata field in:");
    console.log("   src/app/api/content-center/generate/route.ts");
    console.log("   Lines 133-137");

    return true;
  } catch (err) {
    console.log("❌ Error testing PostgREST cache:", err.message);
    return false;
  }
}

// Run the test
testPostgRESTCache()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
