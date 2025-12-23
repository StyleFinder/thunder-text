/**
 * Shop Context Utilities
 *
 * Centralized utilities for extracting and validating shop context.
 * Supports the new UUID-based routing pattern: /stores/{shopId}/...
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

// Lazy import supabaseAdmin to avoid module load failures
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

/**
 * Shop context containing both UUID and domain
 */
export interface ShopContext {
  /** UUID of the shop (primary identifier) */
  shopId: string;
  /** Shop domain (e.g., store.myshopify.com) */
  shopDomain: string;
  /** Whether the shop has an active Shopify connection */
  isActive: boolean;
}

/**
 * Cache for shop lookups to avoid repeated database queries
 * Key: shopId or shopDomain, Value: ShopContext
 */
const shopCache = new Map<string, { context: ShopContext; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get shop context from various sources (prioritized):
 * 1. URL path parameter (shopId)
 * 2. Session (for authenticated users)
 * 3. Cookie (shopify_shop)
 *
 * @param request - NextRequest object
 * @param pathShopId - Optional shopId from URL path
 * @returns ShopContext or null if not found
 */
export async function getShopContext(
  request?: NextRequest,
  pathShopId?: string
): Promise<ShopContext | null> {
  try {
    // 1. Try URL path parameter first (most reliable)
    if (pathShopId) {
      const context = await getShopById(pathShopId);
      if (context) return context;
    }

    // 2. Try session
    const session = await getServerSession(authOptions);
    if (session?.user?.shopId) {
      const context = await getShopById(session.user.shopId);
      if (context) return context;
    }

    // 3. Fallback to cookie (legacy support)
    if (request) {
      const shopDomain = request.cookies.get("shopify_shop")?.value;
      if (shopDomain) {
        const context = await getShopByDomain(shopDomain);
        if (context) return context;
      }
    }

    return null;
  } catch (error) {
    logger.error("Error getting shop context", error as Error, {
      component: "shop-context",
      pathShopId,
    });
    return null;
  }
}

/**
 * Get shop context by UUID
 */
export async function getShopById(shopId: string): Promise<ShopContext | null> {
  // Check cache first
  const cached = shopCache.get(shopId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.context;
  }

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, is_active")
      .eq("id", shopId)
      .single();

    if (error || !shop) {
      return null;
    }

    const context: ShopContext = {
      shopId: shop.id,
      shopDomain: shop.shop_domain,
      isActive: shop.is_active ?? false,
    };

    // Cache the result
    shopCache.set(shopId, { context, timestamp: Date.now() });
    shopCache.set(shop.shop_domain, { context, timestamp: Date.now() });

    return context;
  } catch (error) {
    logger.error("Error fetching shop by ID", error as Error, {
      component: "shop-context",
      shopId,
    });
    return null;
  }
}

/**
 * Get shop context by domain
 */
export async function getShopByDomain(
  shopDomain: string
): Promise<ShopContext | null> {
  // Normalize domain
  const normalizedDomain = shopDomain.includes(".myshopify.com")
    ? shopDomain
    : `${shopDomain}.myshopify.com`;

  // Check cache first
  const cached = shopCache.get(normalizedDomain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.context;
  }

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, is_active")
      .eq("shop_domain", normalizedDomain)
      .single();

    if (error || !shop) {
      return null;
    }

    const context: ShopContext = {
      shopId: shop.id,
      shopDomain: shop.shop_domain,
      isActive: shop.is_active ?? false,
    };

    // Cache the result
    shopCache.set(shop.id, { context, timestamp: Date.now() });
    shopCache.set(normalizedDomain, { context, timestamp: Date.now() });

    return context;
  } catch (error) {
    logger.error("Error fetching shop by domain", error as Error, {
      component: "shop-context",
      shopDomain: normalizedDomain,
    });
    return null;
  }
}

/**
 * Validate that user has access to the specified shop
 * For shop users, they can only access their own shop
 * For admins/coaches, access depends on their permissions
 */
export async function validateShopAccess(
  shopId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  // Admins have access to all shops
  if (userRole === "admin") {
    return true;
  }

  // Shop users can only access their own shop
  if (userRole === "shop") {
    return shopId === userId;
  }

  // Coaches have limited access - check coach_shops table
  if (userRole === "coach") {
    try {
      const supabaseAdmin = await getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("coach_shops")
        .select("id")
        .eq("coach_id", userId)
        .eq("shop_id", shopId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Extract shopId from URL path
 * Supports patterns: /stores/{shopId}/... or /s/{shopId}/...
 */
export function extractShopIdFromPath(pathname: string): string | null {
  // Match /stores/{uuid}/... or /s/{uuid}/...
  const match = pathname.match(
    /^\/(stores|s)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return match ? match[2] : null;
}

/**
 * Build URL with shop context
 * Uses new path-based pattern: /stores/{shopId}/path
 */
export function buildShopUrl(shopId: string, path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/stores/${shopId}${normalizedPath}`;
}

/**
 * Clear shop from cache (useful after updates)
 */
export function invalidateShopCache(shopId?: string, shopDomain?: string): void {
  if (shopId) {
    shopCache.delete(shopId);
  }
  if (shopDomain) {
    shopCache.delete(shopDomain);
  }
}
