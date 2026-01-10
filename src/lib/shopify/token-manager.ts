import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { encryptToken, decryptToken } from "@/lib/services/encryption";

// Lazy-initialized Supabase client to avoid build-time initialization
let supabase: SupabaseClient | null = null;

function getSupabaseClient() {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer SUPABASE_SERVICE_ROLE_KEY first (matches token-exchange route)
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }

  // Log which key we're using (without exposing the actual key)
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabase;
}

// In-memory token cache to reduce database queries
// Tokens are cached for 23 hours (online tokens expire after 24 hours)
// This follows the guide's recommendation for token caching (line 321-326)
interface CachedToken {
  accessToken: string;
  scope?: string;
  cachedAt: number;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();
const CACHE_DURATION = 23 * 60 * 60 * 1000; // 23 hours in milliseconds

/**
 * Check if a cached token is still valid
 */
function isTokenCacheValid(cached: CachedToken): boolean {
  const now = Date.now();
  return now < cached.expiresAt;
}

/**
 * Get token from cache if valid
 */
function getCachedToken(shopDomain: string): string | null {
  const cached = tokenCache.get(shopDomain);
  if (cached && isTokenCacheValid(cached)) {
    return cached.accessToken;
  }
  return null;
}

/**
 * Store token in cache
 */
function setCachedToken(
  shopDomain: string,
  accessToken: string,
  scope?: string,
) {
  const now = Date.now();
  tokenCache.set(shopDomain, {
    accessToken,
    scope,
    cachedAt: now,
    expiresAt: now + CACHE_DURATION,
  });
  logger.debug("Token cached for shop", {
    component: "token-manager",
    shopDomain,
  });
}

/**
 * SECURITY: Invalidate token cache for a shop
 * Must be called when:
 * - App is uninstalled
 * - Token is deactivated/revoked
 * - User logs out
 * - Subscription is canceled
 */
export function invalidateTokenCache(shopDomain: string): void {
  const fullShopDomain = shopDomain.includes(".myshopify.com")
    ? shopDomain
    : `${shopDomain}.myshopify.com`;

  const wasDeleted = tokenCache.delete(fullShopDomain);

  if (wasDeleted) {
    logger.info("Token cache invalidated for shop", {
      component: "token-manager",
      operation: "invalidateTokenCache",
      shopDomain: fullShopDomain,
    });
  }
}

export interface ShopTokenData {
  shop_domain: string;
  access_token: string;
  scope?: string;
  is_active: boolean;
  installed_at: string;
  updated_at: string;
  last_used_at?: string;
}

/**
 * Store or update a shop's access token
 */
export async function storeShopToken(
  shopDomain: string,
  accessToken: string,
  scope?: string,
): Promise<{ success: boolean; error?: string; shopId?: string }> {
  try {
    // Ensure we have the full shop domain
    const fullShopDomain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    // SECURITY M5: Encrypt access token before storing in database
    let encryptedToken: string;
    try {
      encryptedToken = await encryptToken(accessToken);
    } catch (encryptError) {
      logger.error("Failed to encrypt access token", encryptError as Error, {
        component: "token-manager",
        operation: "storeShopToken",
        shopDomain: fullShopDomain,
      });
      return { success: false, error: "Failed to encrypt access token" };
    }

    // Upsert directly to the shops table
    const { data, error } = await getSupabaseClient()
      .from("shops")
      .upsert(
        {
          shop_domain: fullShopDomain,
          shopify_access_token: encryptedToken, // SECURITY M5: Store encrypted token
          shopify_scope: scope || null,
          is_active: true,
        },
        {
          onConflict: "shop_domain",
        },
      )
      .select("id")
      .single();

    if (error) {
      logger.error("Error storing token", error as Error, {
        component: "token-manager",
        operation: "storeShopToken",
        shopDomain: fullShopDomain,
      });
      return { success: false, error: error.message };
    }

    // Update cache with the DECRYPTED token (for API calls)
    setCachedToken(fullShopDomain, accessToken, scope);

    return { success: true, shopId: data?.id };
  } catch (error) {
    logger.error("Unexpected error storing token", error as Error, {
      component: "token-manager",
      operation: "storeShopToken",
      shopDomain,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to store token",
    };
  }
}

/**
 * Retrieve a shop's access token from cache or database
 * Implements caching as recommended in the guide (line 321-336)
 * SECURITY M5: Tokens are stored encrypted - decrypted on retrieval
 */
export async function getShopToken(
  shopDomain: string,
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    // Ensure we have the full shop domain
    const fullShopDomain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    // Check cache first (cache stores decrypted tokens)
    const cachedToken = getCachedToken(fullShopDomain);
    if (cachedToken) {
      return { success: true, accessToken: cachedToken };
    }

    // Use RPC function to bypass PostgREST permission issues
    const { data, error } = await getSupabaseClient()
      .rpc("get_shop_token", {
        p_shop_domain: fullShopDomain,
      })
      .maybeSingle();

    if (error) {
      logger.error("Database error retrieving token", error as Error, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        isRLSError: error.code === "42501",
        component: "token-manager",
        operation: "getShopToken",
        shopDomain: fullShopDomain,
      });

      // Check if it's an RLS policy error
      if (error.code === "42501") {
        logger.error(
          "🔒 RLS Policy Error: The anon key cannot read from shops table",
          undefined,
          { component: "token-manager" },
        );
        logger.error(
          "💡 Solution: Add RLS policy or use service key",
          undefined,
          { component: "token-manager" },
        );
      }

      return { success: false, error: error.message };
    }

    const shopData = data as { access_token?: string; scope?: string } | null;

    if (!shopData || !shopData.access_token) {
      logger.info("No token found for shop - app may not be installed", {
        component: "token-manager",
        shopDomain: fullShopDomain,
      });
      return {
        success: false,
        error: `No token found for shop: ${fullShopDomain}`,
      };
    }

    // SECURITY M5: Decrypt the token retrieved from database
    let decryptedToken: string;
    try {
      decryptedToken = await decryptToken(shopData.access_token);
    } catch (decryptError) {
      // Token might be stored in plaintext (legacy) - use as-is
      // This provides backward compatibility during migration
      logger.warn("Token decryption failed, using as-is (may be legacy plaintext)", {
        component: "token-manager",
        operation: "getShopToken",
        shopDomain: fullShopDomain,
      });
      decryptedToken = shopData.access_token;
    }

    // Cache the DECRYPTED token for future use
    setCachedToken(fullShopDomain, decryptedToken, shopData.scope);

    return { success: true, accessToken: decryptedToken };
  } catch (error) {
    logger.error("Unexpected error retrieving token", error as Error, {
      component: "token-manager",
      operation: "getShopToken",
      shopDomain,
    });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to retrieve token",
    };
  }
}

/**
 * Check if a shop has a valid token
 */
export async function hasValidToken(shopDomain: string): Promise<boolean> {
  const result = await getShopToken(shopDomain);
  return result.success && !!result.accessToken;
}

/**
 * Get shop details including token
 */
export async function getShopDetails(
  shopDomain: string,
): Promise<{ success: boolean; shop?: ShopTokenData; error?: string }> {
  try {
    const fullShopDomain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("shops")
      .select("*")
      .eq("shop_domain", fullShopDomain)
      .eq("is_active", true)
      .single();

    if (error) {
      logger.error("Error getting shop details", error as Error, {
        component: "token-manager",
        operation: "getShopDetails",
        shopDomain: fullShopDomain,
      });
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "Shop not found" };
    }

    return { success: true, shop: data };
  } catch (error) {
    logger.error("Unexpected error getting shop details", error as Error, {
      component: "token-manager",
      operation: "getShopDetails",
      shopDomain,
    });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get shop details",
    };
  }
}

/**
 * Save a shop's access token (alias for storeShopToken)
 * Used by the Token Exchange flow
 */
export async function saveShopToken(
  shopDomain: string,
  accessToken: string,
  tokenType: "online" | "offline" = "offline",
  scope?: string,
): Promise<{ success: boolean; error?: string; shopId?: string }> {
  logger.info("Saving access token for shop", {
    component: "token-manager",
    operation: "saveShopToken",
    shopDomain,
    tokenType,
  });
  return storeShopToken(shopDomain, accessToken, scope);
}

/**
 * Deactivate a shop's token (soft delete)
 * SECURITY: Also invalidates the token cache to prevent stale tokens from being used
 */
export async function deactivateShopToken(
  shopDomain: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const fullShopDomain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    // SECURITY: Immediately invalidate cache to prevent stale token usage
    invalidateTokenCache(fullShopDomain);

    const client = getSupabaseClient();
    const { error } = await client
      .from("shops")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("shop_domain", fullShopDomain);

    if (error) {
      logger.error("Error deactivating token", error as Error, {
        component: "token-manager",
        operation: "deactivateShopToken",
        shopDomain: fullShopDomain,
      });
      return { success: false, error: error.message };
    }

    logger.info("Token deactivated and cache cleared for shop", {
      component: "token-manager",
      operation: "deactivateShopToken",
      shopDomain: fullShopDomain,
    });

    return { success: true };
  } catch (error) {
    logger.error("Unexpected error deactivating token", error as Error, {
      component: "token-manager",
      operation: "deactivateShopToken",
      shopDomain,
    });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to deactivate token",
    };
  }
}
