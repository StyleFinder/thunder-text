#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log("🔍 Checking generated_content table schema...\n");

  // Query information_schema to get actual column names
  const { data, error } = await supabase.rpc("exec_sql", {
    sql_query: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'generated_content'
      ORDER BY ordinal_position;
    `,
  });

  if (error) {
    console.log("❌ Error querying schema:", error.message);
    console.log("\nTrying direct query instead...");

    // Try getting columns from a sample row
    const { data: sample, error: sampleError } = await supabase
      .from("generated_content")
      .select("*")
      .limit(1)
      .single();

    if (sampleError) {
      console.log("❌ Could not get sample data:", sampleError.message);
      return;
    }

    console.log("✅ Sample row columns:");
    console.log(Object.keys(sample || {}));
    return;
  }

  console.log("✅ Table columns:");
  console.log(data);
}

checkSchema().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
