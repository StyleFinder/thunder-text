import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Client-side Supabase client
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service key
// Prefer SUPABASE_SERVICE_ROLE_KEY (matches Render env var and token-exchange pattern)
const getServiceRoleKey = () => {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  // Only warn in server-side context (not during client-side bundle evaluation)
  if (typeof window === "undefined") {
    if (!serviceRoleKey || serviceRoleKey === "placeholder-service-key") {
      console.warn("⚠️ WARNING: No valid Supabase service role key found!", {
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        env: process.env.NODE_ENV,
      });
    }
  }

  return serviceRoleKey || "placeholder-service-key";
};

export const supabaseAdmin = createClient(
  supabaseUrl,
  getServiceRoleKey(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

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
