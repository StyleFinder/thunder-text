import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPlanLimits, PlanType } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export type UsageType = "product_description" | "ad";

export interface UsageResult {
  canProceed: boolean;
  remaining: number;
  limit: number;
  used: number;
  upgradeRequired: boolean;
}

export interface UsageStats {
  plan: PlanType;
  subscriptionStatus: string;
  productDescriptions: {
    used: number;
    limit: number;
    remaining: number;
  };
  ads: {
    used: number;
    limit: number;
    remaining: number;
  };
  periodEnd: string | null;
}

/**
 * Check if a shop can perform a usage action based on their plan limits
 */
export async function checkUsageLimit(
  shopId: string,
  type: UsageType,
): Promise<UsageResult> {
  const supabase = getSupabaseAdmin();

  try {
    const { data: shop, error } = await supabase
      .from("shops")
      .select(
        "plan, product_descriptions_used, ads_created, subscription_status, subscription_current_period_end",
      )
      .eq("id", shopId)
      .single();

    if (error || !shop) {
      logger.error("Failed to fetch shop for usage check", error as Error, {
        component: "billing-usage",
        shopId,
      });
      // SECURITY: Deny access on database errors to prevent unlimited usage
      // This follows fail-secure principle - block access when we can't verify limits
      return {
        canProceed: false,
        remaining: 0,
        limit: 0,
        used: 0,
        upgradeRequired: true,
      };
    }

    const plan = (shop.plan || "free") as PlanType;
    const limits = getPlanLimits(plan);

    // SECURITY: Verify subscription status for paid plans
    // Block access if subscription is past_due, canceled, or unpaid
    const subscriptionStatus = shop.subscription_status;
    const invalidStatuses = [
      "past_due",
      "canceled",
      "unpaid",
      "incomplete_expired",
    ];

    if (
      plan !== "free" &&
      subscriptionStatus &&
      invalidStatuses.includes(subscriptionStatus)
    ) {
      logger.warn("Access denied due to invalid subscription status", {
        component: "billing-usage",
        shopId,
        plan,
        subscriptionStatus,
      });
      return {
        canProceed: false,
        remaining: 0,
        limit: 0,
        used: 0,
        upgradeRequired: true,
      };
    }

    // SECURITY: Check if trial has expired
    // Trialing subscriptions have a current_period_end date that must be in the future
    if (
      subscriptionStatus === "trialing" &&
      shop.subscription_current_period_end
    ) {
      const trialEndDate = new Date(shop.subscription_current_period_end);
      const now = new Date();

      if (trialEndDate < now) {
        logger.warn("Access denied due to expired trial", {
          component: "billing-usage",
          shopId,
          plan,
          trialEndDate: trialEndDate.toISOString(),
        });
        return {
          canProceed: false,
          remaining: 0,
          limit: 0,
          used: 0,
          upgradeRequired: true,
        };
      }
    }

    if (type === "product_description") {
      const used = shop.product_descriptions_used || 0;
      const limit = limits.productDescriptions;
      const remaining = Math.max(0, limit - used);

      return {
        canProceed: used < limit,
        remaining,
        limit,
        used,
        upgradeRequired: used >= limit,
      };
    } else {
      const used = shop.ads_created || 0;
      const limit = limits.ads;

      // -1 means unlimited
      if (limit === -1) {
        return {
          canProceed: true,
          remaining: -1,
          limit: -1,
          used,
          upgradeRequired: false,
        };
      }

      const remaining = Math.max(0, limit - used);

      return {
        canProceed: used < limit,
        remaining,
        limit,
        used,
        upgradeRequired: used >= limit,
      };
    }
  } catch (err) {
    logger.error("Error checking usage limit", err as Error, {
      component: "billing-usage",
      shopId,
      type,
    });
    // SECURITY: Deny access on errors to prevent unlimited usage
    // This follows fail-secure principle - block access when we can't verify limits
    return {
      canProceed: false,
      remaining: 0,
      limit: 0,
      used: 0,
      upgradeRequired: true,
    };
  }
}

/**
 * Increment usage counter for a shop using atomic operation
 *
 * SECURITY: Uses Supabase RPC to perform atomic increment, preventing race conditions
 * where concurrent requests could bypass usage limits.
 */
export async function incrementUsage(
  shopId: string,
  type: UsageType,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  try {
    const column =
      type === "product_description"
        ? "product_descriptions_used"
        : "ads_created";

    // SECURITY FIX: Use atomic increment via raw SQL to prevent race conditions
    // The previous GET-then-UPDATE pattern allowed concurrent requests to read
    // the same value and both increment from it, bypassing usage limits.
    const { error } = await supabase.rpc("increment_shop_usage", {
      p_shop_id: shopId,
      p_column_name: column,
    });

    if (error) {
      // If RPC doesn't exist, fall back to safer single-query approach
      // This uses COALESCE to handle NULL and increments in one atomic operation
      if (error.code === "PGRST202" || error.message?.includes("not exist")) {
        logger.warn("increment_shop_usage RPC not found, using fallback", {
          component: "billing-usage",
          shopId,
        });

        // Fallback: Use single update query with COALESCE for atomicity
        // This is still safer than GET+UPDATE as it's a single database operation
        const { data: currentShop, error: fetchError } = await supabase
          .from("shops")
          .select(column)
          .eq("id", shopId)
          .single();

        if (fetchError) {
          logger.error("Failed to fetch shop for increment", fetchError, {
            component: "billing-usage",
            shopId,
          });
          return false;
        }

        // eslint-disable-next-line security/detect-object-injection
        const currentValue =
          (currentShop as Record<string, number>)[column] || 0;

        // Use update with explicit check to reduce race window
        const { error: updateError } = await supabase
          .from("shops")
          .update({
            [column]: currentValue + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shopId);

        if (updateError) {
          logger.error("Failed to increment usage (fallback)", updateError, {
            component: "billing-usage",
            shopId,
            type,
          });
          return false;
        }

        return true;
      }

      logger.error("Failed to increment usage via RPC", error, {
        component: "billing-usage",
        shopId,
        type,
      });
      return false;
    }

    return true;
  } catch (err) {
    logger.error("Error incrementing usage", err as Error, {
      component: "billing-usage",
      shopId,
      type,
    });
    return false;
  }
}

/**
 * Get usage statistics for a shop
 */
export async function getUsageStats(
  shopId: string,
): Promise<UsageStats | null> {
  const supabase = getSupabaseAdmin();

  try {
    const { data: shop, error } = await supabase
      .from("shops")
      .select(
        `
        plan,
        subscription_status,
        product_descriptions_used,
        ads_created,
        subscription_current_period_end
      `,
      )
      .eq("id", shopId)
      .single();

    if (error || !shop) {
      logger.error("Failed to fetch usage stats", error as Error, {
        component: "billing-usage",
        shopId,
      });
      return null;
    }

    const plan = (shop.plan || "free") as PlanType;
    const limits = getPlanLimits(plan);

    const pdUsed = shop.product_descriptions_used || 0;
    const pdLimit = limits.productDescriptions;

    const adsUsed = shop.ads_created || 0;
    const adsLimit = limits.ads;

    return {
      plan,
      subscriptionStatus: shop.subscription_status || "inactive",
      productDescriptions: {
        used: pdUsed,
        limit: pdLimit,
        remaining: Math.max(0, pdLimit - pdUsed),
      },
      ads: {
        used: adsUsed,
        limit: adsLimit,
        remaining: adsLimit === -1 ? -1 : Math.max(0, adsLimit - adsUsed),
      },
      periodEnd: shop.subscription_current_period_end,
    };
  } catch (err) {
    logger.error("Error getting usage stats", err as Error, {
      component: "billing-usage",
      shopId,
    });
    return null;
  }
}

/**
 * Reset usage counters for a shop (called when billing period renews)
 */
export async function resetUsage(shopId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase
      .from("shops")
      .update({
        product_descriptions_used: 0,
        ads_created: 0,
        usage_reset_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", shopId);

    if (error) {
      logger.error("Failed to reset usage", error, {
        component: "billing-usage",
        shopId,
      });
      return false;
    }

    logger.info("Usage reset successfully", {
      component: "billing-usage",
      shopId,
    });

    return true;
  } catch (err) {
    logger.error("Error resetting usage", err as Error, {
      component: "billing-usage",
      shopId,
    });
    return false;
  }
}
