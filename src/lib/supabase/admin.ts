/**
 * Supabase Admin Client (Server-Side Only)
 *
 * This file creates a server-side Supabase client with the service role key.
 * It is separate from the main supabase.ts to avoid loading browser-specific
 * code on the server during API route initialization.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cache the admin client to avoid creating multiple instances
let supabaseAdminInstance: SupabaseClient | null = null;

// SECURITY: Fail fast if credentials are missing in production
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url === "https://placeholder.supabase.co") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL environment variable is required in production",
      );
    }
    return "https://placeholder.supabase.co"; // Build-time only
  }
  return url;
}

// SECURITY: Fail fast in production if service key is missing
function getServiceRoleKey(): string {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  // Only validate in server-side context
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
}

/**
 * Get the Supabase admin client with service role key.
 * This bypasses Row Level Security (RLS) - use with caution.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(
      getSupabaseUrl(),
      getServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return supabaseAdminInstance;
}

// Export a getter for backwards compatibility with existing code
// that imports { supabaseAdmin } from '@/lib/supabase/admin'
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseAdmin();
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
