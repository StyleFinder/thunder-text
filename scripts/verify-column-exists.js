#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumn() {
  console.log(
    "🔍 Verifying generation_metadata column exists in production...\n",
  );
  console.log("Target URL:", supabaseUrl);
  console.log("");

  // Try to insert with generation_metadata
  const { data: shops } = await supabase.from("shops").select("id").limit(1);
  if (!shops || shops.length === 0) {
    console.log("❌ No shops found");
    return false;
  }

  const testData = {
    store_id: shops[0].id,
    content_type: "blog",
    topic: "Column Test",
    generated_text: "Test",
    word_count: 1,
    generation_params: {},
    generation_metadata: { test: true },
    is_saved: false,
  };

  const { data, error } = await supabase
    .from("generated_content")
    .insert(testData)
    .select()
    .single();

  if (error) {
    console.log("❌ Column does NOT exist or cannot be written to");
    console.log("Error code:", error.code);
    console.log("Error message:", error.message);
    console.log("");
    if (error.code === "PGRST204") {
      console.log(
        "⚠️  PGRST204 means PostgREST schema cache has not refreshed",
      );
      console.log(
        "   The column may exist in Postgres but PostgREST doesn't know about it yet",
      );
    }
    return false;
  }

  console.log("✅ Column exists and can be written to!");
  console.log("Test record ID:", data.id);

  // Cleanup
  await supabase.from("generated_content").delete().eq("id", data.id);
  console.log("✅ Test data cleaned up");

  return true;
}

verifyColumn()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
