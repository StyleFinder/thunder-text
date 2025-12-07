/**
 * Shop Lookup Utility
 *
 * Provides consistent shop lookup logic with fallback for standalone users
 * who have linked Shopify stores via linked_shopify_domain.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export interface ShopLookupResult<T> {
  data: T | null;
  error: { message?: string } | null;
  lookupMethod: "shop_domain" | "linked_shopify_domain" | "email" | null;
}

interface ShopRecord {
  id: string;
  shop_domain: string;
  [key: string]: unknown;
}

/**
 * Look up a shop with fallback logic for standalone users
 *
 * Order of lookup:
 * 1. Try by shop_domain (works for Shopify stores)
 * 2. If shop contains .myshopify.com, try linked_shopify_domain (for standalone users with linked stores)
 * 3. If shop contains @, try email (for standalone users)
 *
 * @param supabase - Supabase admin client
 * @param shop - Shop identifier (domain or email)
 * @param selectFields - Fields to select (default: 'id, shop_domain')
 * @param component - Logging component name
 */
export async function lookupShopWithFallback<T extends ShopRecord>(
  supabase: SupabaseClient,
  shop: string,
  selectFields: string = "id, shop_domain",
  component: string = "shop-lookup",
): Promise<ShopLookupResult<T>> {
  // First try: lookup by shop_domain
  const primaryResult = await supabase
    .from("shops")
    .select(selectFields)
    .eq("shop_domain", shop)
    .single();

  if (primaryResult.data && !primaryResult.error) {
    return {
      data: primaryResult.data as unknown as T,
      error: null,
      lookupMethod: "shop_domain",
    };
  }

  // Fallback 1: For .myshopify.com domains, try linked_shopify_domain
  if (shop.includes(".myshopify.com")) {
    logger.info(
      `[${component}] Primary lookup failed, trying linked_shopify_domain for: ${shop}`,
      { component },
    );

    const linkedResult = await supabase
      .from("shops")
      .select(selectFields)
      .eq("linked_shopify_domain", shop)
      .eq("shop_type", "standalone")
      .single();

    if (linkedResult.data && !linkedResult.error) {
      const shopData = linkedResult.data as unknown as ShopRecord;
      logger.info(
        `[${component}] Found standalone user by linked_shopify_domain`,
        {
          component,
          linkedShopifyDomain: shop,
          shopDomain: shopData.shop_domain,
        },
      );
      return {
        data: shopData as T,
        error: null,
        lookupMethod: "linked_shopify_domain",
      };
    }

    return {
      data: null,
      error: linkedResult.error,
      lookupMethod: null,
    };
  }

  // Fallback 2: For email addresses, try email column
  if (shop.includes("@")) {
    logger.info(
      `[${component}] Primary lookup failed, trying email lookup for: ${shop}`,
      { component },
    );

    const emailResult = await supabase
      .from("shops")
      .select(selectFields)
      .eq("email", shop)
      .eq("shop_type", "standalone")
      .single();

    if (emailResult.data && !emailResult.error) {
      const shopData = emailResult.data as unknown as ShopRecord;
      logger.info(`[${component}] Found standalone user by email`, {
        component,
        email: shop,
        shopDomain: shopData.shop_domain,
      });
      return {
        data: shopData as T,
        error: null,
        lookupMethod: "email",
      };
    }

    return {
      data: null,
      error: emailResult.error,
      lookupMethod: null,
    };
  }

  // No fallback matched
  return {
    data: null,
    error: primaryResult.error,
    lookupMethod: null,
  };
}
