#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkShopsSchema() {
  console.log("🔍 Checking shops table schema and sample data...\n");

  // Get a sample shop
  const { data: shop, error } = await supabase
    .from("shops")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.log("❌ Error:", error.message);
    return;
  }

  console.log("✅ Sample shop columns and values:");
  console.log(JSON.stringify(shop, null, 2));

  console.log("\n📋 Column names:", Object.keys(shop));
}

checkShopsSchema().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
