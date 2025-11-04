#!/usr/bin/env node

/**
 * Apply generation_metadata migration directly to production database
 * This bypasses the Supabase MCP which is connected to wrong project
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log("Target Supabase URL:", supabaseUrl);
console.log("");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log(
    "🔧 Applying generation_metadata migration to production database...\n",
  );

  const migrationSQL = `
    -- Add generation_metadata column to generated_content table
    ALTER TABLE generated_content
    ADD COLUMN IF NOT EXISTS generation_metadata jsonb DEFAULT '{}'::jsonb;

    COMMENT ON COLUMN generated_content.generation_metadata IS 'Metadata about content generation (tokens used, generation time, model version, etc.)';
  `;

  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql_query: migrationSQL,
    });

    if (error) {
      console.log("❌ Error applying migration:", error.message);
      console.log("Code:", error.code);
      console.log(
        "\n⚠️  You may need to apply this migration manually in Supabase SQL Editor:",
      );
      console.log(migrationSQL);
      return false;
    }

    console.log("✅ Migration applied successfully!");
    console.log("");

    // Verify the column was created
    console.log("🔍 Verifying column exists...");
    const { error: verifyError } = await supabase
      .from("generated_content")
      .select("id, generation_metadata")
      .limit(1);

    if (verifyError) {
      console.log("❌ Verification failed:", verifyError.message);
      return false;
    }

    console.log("✅ Column verified! generation_metadata is now available.");
    console.log("");
    console.log("🎉 You can now uncomment generation_metadata in:");
    console.log(
      "   src/app/api/content-center/generate/route.ts (lines 133-137)",
    );

    return true;
  } catch (err) {
    console.log("❌ Fatal error:", err.message);
    return false;
  }
}

applyMigration()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
