#!/usr/bin/env node

/**
 * Force PostgREST to reload its schema cache by sending NOTIFY signal
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log("🔄 Forcing PostgREST schema cache reload...\n");
console.log("Target:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reloadSchema() {
  try {
    // Send NOTIFY signal to PostgREST to reload schema
    const { error } = await supabase.rpc("exec_sql", {
      sql_query: "NOTIFY pgrst, 'reload schema';",
    });

    if (error) {
      console.log("❌ Error sending reload signal:", error.message);
      console.log(
        "\n⚠️  Alternative: Restart your Supabase project from the dashboard",
      );
      console.log(
        "   https://supabase.com/dashboard/project/upkmmwvbspgeanotzknk/settings/general",
      );
      return false;
    }

    console.log("✅ Schema reload signal sent successfully!");
    console.log("\n⏳ Waiting 5 seconds for PostgREST to reload...");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("\n🧪 Testing if schema cache refreshed...");

    // Run the same test as test-postgrest-cache.js
    const { data: shops } = await supabase.from("shops").select("id").limit(1);
    if (!shops || shops.length === 0) {
      console.log("⚠️  No shops found - cannot verify");
      return true;
    }

    const testData = {
      store_id: shops[0].id,
      content_type: "blog",
      topic: "Schema Reload Test",
      generated_text: "Testing PostgREST schema reload",
      word_count: 5,
      generation_params: { word_count: 5 },
      generation_metadata: {
        tokensUsed: 50,
        generationTimeMs: 500,
        voiceProfileVersion: "1.0",
        postProcessing: { test: true },
      },
      is_saved: false,
    };

    const { data, error: insertError } = await supabase
      .from("generated_content")
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "PGRST204") {
        console.log("❌ Schema cache NOT refreshed yet");
        console.log("   You may need to restart the Supabase project manually");
        return false;
      }
      console.log("❌ Unexpected error:", insertError.message);
      return false;
    }

    console.log("✅ Schema cache successfully refreshed!");
    console.log("   generation_metadata column is now available");

    // Cleanup
    await supabase.from("generated_content").delete().eq("id", data.id);

    return true;
  } catch (err) {
    console.log("❌ Fatal error:", err.message);
    return false;
  }
}

reloadSchema()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
