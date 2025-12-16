import { NextRequest, NextResponse } from "next/server";
import { guardDebugRoute } from "../_middleware-guard";

export async function GET(_request: NextRequest) {
  // Guard: Only allow in development
  const guardResponse = guardDebugRoute("/api/debug/env");
  if (guardResponse) return guardResponse;

  // Check various environment variables
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    SHOPIFY_ACCESS_TOKEN: {
      exists: !!process.env.SHOPIFY_ACCESS_TOKEN,
      length: process.env.SHOPIFY_ACCESS_TOKEN?.length || 0,
      prefix: process.env.SHOPIFY_ACCESS_TOKEN?.substring(0, 10) || "NOT_SET",
      suffix:
        process.env.SHOPIFY_ACCESS_TOKEN?.substring(
          process.env.SHOPIFY_ACCESS_TOKEN.length - 4,
        ) || "NOT_SET",
    },
    SHOPIFY_API_KEY: {
      exists: !!process.env.SHOPIFY_API_KEY,
      length: process.env.SHOPIFY_API_KEY?.length || 0,
    },
    SHOPIFY_API_SECRET: {
      exists: !!process.env.SHOPIFY_API_SECRET,
      length: process.env.SHOPIFY_API_SECRET?.length || 0,
    },
    NEXT_PUBLIC_SHOPIFY_API_KEY: {
      exists: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      value: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY, // Public keys are safe to show
    },
    // SECURITY: Auth bypass env vars removed - these patterns should not exist in any environment
    SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    SUPABASE_SERVICE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_KEY,
      length: process.env.SUPABASE_SERVICE_KEY?.length || 0,
    },
    // Check if any SHOPIFY related env vars exist
    shopifyEnvVars: Object.keys(process.env)
      .filter((key) => key.includes("SHOPIFY"))
      .sort(),
  };

  return NextResponse.json({
    success: true,
    message: "Environment variables check",
    data: envCheck,
    timestamp: new Date().toISOString(),
  });
}
