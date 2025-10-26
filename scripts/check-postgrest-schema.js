#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log(
    "Attempting to select from generated_content with generation_metadata...\n",
  );

  const { data, error } = await supabase
    .from("generated_content")
    .select("id, generation_metadata")
    .limit(1);

  if (error) {
    console.log("❌ Error:", error.message);
    console.log("Code:", error.code);
    console.log("Details:", error.details);
  } else {
    console.log("✅ Success! PostgREST can see generation_metadata column");
    console.log("Data:", data);
  }
}

checkSchema();
