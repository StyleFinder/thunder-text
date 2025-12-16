import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

// SECURITY: Fail fast if Supabase credentials are missing
// Placeholders are only allowed during build time (Next.js static analysis)
const getSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Allow placeholder only during build/static analysis, not runtime
  if (!url || url === "https://placeholder.supabase.co") {
    if (
      typeof window !== "undefined" ||
      process.env.NODE_ENV === "production"
    ) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL environment variable is required",
      );
    }
    return "https://placeholder.supabase.co"; // Build-time only
  }
  return url;
};

const getSupabaseAnonKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || key === "placeholder-key") {
    if (
      typeof window !== "undefined" ||
      process.env.NODE_ENV === "production"
    ) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required",
      );
    }
    return "placeholder-key"; // Build-time only
  }
  return key;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Client-side Supabase client
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service key
// Prefer SUPABASE_SERVICE_ROLE_KEY (matches Render env var and token-exchange pattern)
// SECURITY: Fail fast in production if service key is missing
const getServiceRoleKey = (): string => {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  // Only validate in server-side context (not during client-side bundle evaluation)
  if (typeof window === "undefined") {
    if (!serviceRoleKey || serviceRoleKey === "placeholder-service-key") {
      // SECURITY: Fail in production, warn in development
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY environment variable is required in production",
        );
      }
      console.warn("⚠️ WARNING: No valid Supabase service role key found!", {
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        env: process.env.NODE_ENV,
      });
      return "placeholder-service-key"; // Development only
    }
  }

  return serviceRoleKey!;
};

export const supabaseAdmin = createClient(supabaseUrl, getServiceRoleKey(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database schema types for Thunder Text (Shopify app)
// Note: Thunder Text uses 'shops' table for Shopify OAuth tokens
// Do not confuse with 'stores' table from Zeus AI Dashboard

export interface Shop {
  id: string;
  shop_domain: string;
  shopify_access_token: string | null;
  shopify_access_token_legacy: string | null;
  scope: string | null;
  is_active: boolean;
  installed_at: string;
  last_used_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DescriptionGeneration {
  id: string;
  shop_id: string;
  product_id: string;
  generated_content: Record<string, unknown>;
  status: "pending" | "completed" | "error";
  created_at: string;
  updated_at: string;
}
