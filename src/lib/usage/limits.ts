/**
 * Usage Limits Configuration and Enforcement
 *
 * Defines plan-based limits for product descriptions and ads,
 * and provides utilities to check and enforce usage limits.
 *
 * Plan Limits (optimized for 85%+ profit margin):
 * - Free: 30 products/month, 30 ads/month (trial)
 * - Starter ($14/mo): 1,500 products/month, 100 ads/month
 * - Pro ($34/mo): 3,000 products/month, 400 ads/month, 200 images/month
 *
 * Cost basis:
 * - Product descriptions: $0.0008/each (gpt-4o-mini vision)
 * - Ads: $0.002/each (gpt-4o-mini)
 * - Images: $0.01/each (gpt-image-1 standard)
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Plan configuration with usage limits
 */
export interface PlanLimits {
  productDescriptions: number;
  ads: number;
  images: number;
}

/**
 * Usage limits by plan (optimized for 85%+ profit margin)
 *
 * Starter ($14/mo) - Max AI cost: $1.40
 *   - 1,500 descriptions × $0.0008 = $1.20
 *   - 100 ads × $0.002 = $0.20
 *   - Total cost: $1.40 → 90% margin
 *
 * Pro ($34/mo) - Max AI cost: $5.20
 *   - 3,000 descriptions × $0.0008 = $2.40
 *   - 400 ads × $0.002 = $0.80
 *   - 200 images × $0.01 = $2.00
 *   - Total cost: $5.20 → 85% margin
 */
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    productDescriptions: 30,
    ads: 30,
    images: 10,
  },
  starter: {
    productDescriptions: 1500,
    ads: 100,
    images: 0,
  },
  pro: {
    productDescriptions: 3000,
    ads: 400,
    images: 200,
  },
};

/**
 * Content types that count toward product description limits
 */
export const PRODUCT_CONTENT_TYPES = ["product_description"];

/**
 * Content types that count toward ad limits
 */
export const AD_CONTENT_TYPES = [
  "ad",
  "social_facebook",
  "social_instagram",
  "social_tiktok",
  "facebook_ad",
];

/**
 * Usage statistics for a shop
 */
export interface UsageStats {
  productDescriptions: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  ads: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  plan: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Result from checking if usage is allowed
 */
export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  plan: string;
  error?: string;
}

/**
 * Get the current billing period boundaries (calendar month)
 */
export function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { start, end };
}

/**
 * Get a shop's plan from the database
 */
export async function getShopPlan(shopId: string): Promise<string> {
  const { data: shop, error } = await supabaseAdmin
    .from("shops")
    .select("plan")
    .eq("id", shopId)
    .single();

  if (error || !shop) {
    logger.warn("[Usage Limits] Could not get shop plan, defaulting to free", {
      component: "usage-limits",
      shopId,
      error: error?.message,
    });
    return "free";
  }

  // Default to free if no plan set
  return shop.plan || "free";
}

/**
 * Get shop ID from shop domain
 */
export async function getShopIdFromDomain(
  shopDomain: string
): Promise<string | null> {
  const { data: shop, error } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("shop_domain", shopDomain)
    .single();

  if (error || !shop) {
    return null;
  }

  return shop.id;
}

/**
 * Count product descriptions generated this billing period
 */
export async function countProductDescriptions(shopId: string): Promise<number> {
  const { start, end } = getCurrentBillingPeriod();

  // Count from generated_content table
  const { count: generatedCount } = await supabaseAdmin
    .from("generated_content")
    .select("*", { count: "exact", head: true })
    .eq("store_id", shopId)
    .in("content_type", PRODUCT_CONTENT_TYPES)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  // Also count from product_descriptions table as backup
  const { count: productDescCount } = await supabaseAdmin
    .from("product_descriptions")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  // Return the maximum to avoid undercounting
  return Math.max(generatedCount || 0, productDescCount || 0);
}

/**
 * Count ads generated this billing period
 */
export async function countAds(shopId: string): Promise<number> {
  const { start, end } = getCurrentBillingPeriod();

  // Count from generated_content table
  const { count: generatedCount } = await supabaseAdmin
    .from("generated_content")
    .select("*", { count: "exact", head: true })
    .eq("store_id", shopId)
    .in("content_type", AD_CONTENT_TYPES)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  // Count from ads_library table
  const { count: adsLibraryCount } = await supabaseAdmin
    .from("ads_library")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  // Count from facebook_ad_drafts table
  const { count: facebookDraftsCount } = await supabaseAdmin
    .from("facebook_ad_drafts")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  // Return the maximum to avoid undercounting
  return Math.max(
    generatedCount || 0,
    (adsLibraryCount || 0) + (facebookDraftsCount || 0)
  );
}

/**
 * Check if a shop can generate a product description
 */
export async function canGenerateProductDescription(
  shopId: string
): Promise<UsageCheckResult> {
  try {
    const plan = await getShopPlan(shopId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const used = await countProductDescriptions(shopId);
    const limit = limits.productDescriptions;
    const remaining = Math.max(0, limit - used);

    const result: UsageCheckResult = {
      allowed: used < limit,
      used,
      limit,
      remaining,
      plan,
    };

    if (!result.allowed) {
      result.error = `You've reached your monthly limit of ${limit} product descriptions. Upgrade your plan for more.`;
      logger.info("[Usage Limits] Product description limit reached", {
        component: "usage-limits",
        shopId,
        plan,
        used,
        limit,
      });
    }

    return result;
  } catch (error) {
    logger.error(
      "[Usage Limits] Error checking product description limit",
      error as Error,
      { component: "usage-limits", shopId }
    );
    // Fail open - allow generation if there's an error checking limits
    return {
      allowed: true,
      used: 0,
      limit: 30,
      remaining: 30,
      plan: "free",
      error: "Could not verify usage limits",
    };
  }
}

/**
 * Check if a shop can generate an ad
 */
export async function canGenerateAd(shopId: string): Promise<UsageCheckResult> {
  try {
    const plan = await getShopPlan(shopId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const used = await countAds(shopId);
    const limit = limits.ads;
    const remaining = Math.max(0, limit - used);

    const result: UsageCheckResult = {
      allowed: used < limit,
      used,
      limit,
      remaining,
      plan,
    };

    if (!result.allowed) {
      result.error = `You've reached your monthly limit of ${limit} ads. Upgrade your plan for more.`;
      logger.info("[Usage Limits] Ad limit reached", {
        component: "usage-limits",
        shopId,
        plan,
        used,
        limit,
      });
    }

    return result;
  } catch (error) {
    logger.error("[Usage Limits] Error checking ad limit", error as Error, {
      component: "usage-limits",
      shopId,
    });
    // Fail open - allow generation if there's an error checking limits
    return {
      allowed: true,
      used: 0,
      limit: 30,
      remaining: 30,
      plan: "free",
      error: "Could not verify usage limits",
    };
  }
}

/**
 * Get full usage statistics for a shop
 */
export async function getUsageStats(shopId: string): Promise<UsageStats> {
  const plan = await getShopPlan(shopId);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const { start, end } = getCurrentBillingPeriod();

  const productDescUsed = await countProductDescriptions(shopId);
  const adsUsed = await countAds(shopId);

  return {
    productDescriptions: {
      used: productDescUsed,
      limit: limits.productDescriptions,
      remaining: Math.max(0, limits.productDescriptions - productDescUsed),
      percentUsed: Math.round(
        (productDescUsed / limits.productDescriptions) * 100
      ),
    },
    ads: {
      used: adsUsed,
      limit: limits.ads,
      remaining: Math.max(0, limits.ads - adsUsed),
      percentUsed: Math.round((adsUsed / limits.ads) * 100),
    },
    plan,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

/**
 * Check usage by shop domain (convenience function)
 */
export async function canGenerateProductDescriptionByDomain(
  shopDomain: string
): Promise<UsageCheckResult> {
  const shopId = await getShopIdFromDomain(shopDomain);
  if (!shopId) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      plan: "unknown",
      error: "Shop not found",
    };
  }
  return canGenerateProductDescription(shopId);
}

/**
 * Check ad usage by shop domain (convenience function)
 */
export async function canGenerateAdByDomain(
  shopDomain: string
): Promise<UsageCheckResult> {
  const shopId = await getShopIdFromDomain(shopDomain);
  if (!shopId) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      plan: "unknown",
      error: "Shop not found",
    };
  }
  return canGenerateAd(shopId);
}
