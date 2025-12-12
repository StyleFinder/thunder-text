/**
 * Test Authentication Utilities
 *
 * Provides helper functions to create authenticated Supabase clients
 * with proper JWT tokens for testing RLS policies.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { TEST_SHOP, createAuthHeaders } from "./test-constants";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Creates a test user in Supabase Auth and returns authenticated client
 */
export async function createTestUserClient(
  user: TestUser,
): Promise<SupabaseClient> {
  // Create a new client and try to sign in first
  const userClient = createClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // Try to sign in - if user exists, this will work
  let signInData = await userClient.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  // If user doesn't exist, create them
  if (signInData.error) {
    const { data: signUpData, error: signUpError } =
      await userClient.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            shop_id: user.id,
          },
        },
      });

    if (signUpError) {
      throw new Error(`Failed to create test user: ${signUpError.message}`);
    }

    if (!signUpData.session) {
      // For some Supabase configurations, signUp doesn't auto-confirm
      // Try signing in again
      signInData = await userClient.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });

      if (signInData.error) {
        throw new Error(
          `Failed to sign in test user after creation: ${signInData.error.message}`,
        );
      }
    }
  }

  return userClient;
}

/**
 * Deletes a test user from Supabase Auth
 * Note: This requires service_role key and may not work in all test environments
 */
export async function deleteTestUser(userId: string): Promise<void> {
  // Use REST API directly with service_role key
  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete test user: ${response.statusText}`);
    }
  } catch (error) {
    // Ignore errors - user may not exist
    console.warn(`Could not delete test user ${userId}:`, error);
  }
}

/**
 * Gets the authenticated user ID from a Supabase client
 */
export async function getAuthUserId(client: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error("Failed to get authenticated user");
  }

  return user.id;
}

/**
 * Creates a service role client (bypasses RLS)
 */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates an authenticated NextRequest for API route testing
 * Uses shop domain as Bearer token (matches app's auth pattern)
 */
export function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    shopDomain?: string;
  } = {}
): NextRequest {
  const { method = "GET", body, shopDomain = TEST_SHOP.domain } = options;

  const requestInit: RequestInit = {
    method,
    headers: createAuthHeaders(shopDomain),
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit as ConstructorParameters<typeof NextRequest>[1]);
}

/**
 * Creates an authenticated GET request with shop as query param
 * Some endpoints use query param instead of Authorization header
 */
export function createAuthenticatedGetRequest(
  baseUrl: string,
  shopDomain: string = TEST_SHOP.domain
): NextRequest {
  const url = baseUrl.includes("?")
    ? `${baseUrl}&shop=${shopDomain}`
    : `${baseUrl}?shop=${shopDomain}`;

  return new NextRequest(url);
}
