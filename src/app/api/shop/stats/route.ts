import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/shop/stats
 *
 * Get dashboard statistics for the current shop:
 * - Products generated (this month)
 * - Time saved (calculated based on generations)
 * - Estimated savings (based on copywriter rates)
 * - Ads created (this month)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopParam = searchParams.get("shop");

    // Get session for auth
    const session = await getServerSession(authOptions);
    let shopId: string | null = null;
    let shopDomain: string | null = null;

    if (session?.user) {
      shopId = session.user.id || null;
      shopDomain = (session.user as { shopDomain?: string }).shopDomain || null;
    }

    // Fall back to shop param if provided
    if (!shopDomain && shopParam) {
      shopDomain = shopParam.includes(".myshopify.com")
        ? shopParam
        : `${shopParam}.myshopify.com`;
    }

    if (!shopId && !shopDomain) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Get shop ID if we only have domain
    if (!shopId && shopDomain) {
      const { data: shop } = await supabaseAdmin
        .from("shops")
        .select("id")
        .eq("shop_domain", shopDomain)
        .single();

      if (shop) {
        shopId = shop.id;
      }
    }

    if (!shopId) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Query 1: Count product descriptions generated this month
    const { count: productDescriptionsCount } = await supabaseAdmin
      .from("generated_content")
      .select("*", { count: "exact", head: true })
      .eq("store_id", shopId)
      .eq("content_type", "product_description")
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    // Query 2: Count from product_descriptions table (alternative source)
    const { count: productDescTableCount } = await supabaseAdmin
      .from("product_descriptions")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    // Query 3: Count ads created this month from ads_library
    const { count: adsLibraryCount } = await supabaseAdmin
      .from("ads_library")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    // Query 4: Count social ads from generated_content
    const { count: socialAdsCount } = await supabaseAdmin
      .from("generated_content")
      .select("*", { count: "exact", head: true })
      .eq("store_id", shopId)
      .in("content_type", [
        "ad",
        "social_facebook",
        "social_instagram",
        "social_tiktok",
      ])
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    // Query 5: Count facebook ad drafts
    const { count: facebookDraftsCount } = await supabaseAdmin
      .from("facebook_ad_drafts")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    // Combine counts (use max of different sources to avoid undercounting)
    const productsGenerated = Math.max(
      productDescriptionsCount || 0,
      productDescTableCount || 0,
    );

    const adsCreated = Math.max(
      (adsLibraryCount || 0) + (socialAdsCount || 0),
      facebookDraftsCount || 0,
    );

    // Calculate time saved: average 15 min per product description, 10 min per ad
    const timeSavedMinutes = productsGenerated * 15 + adsCreated * 10;

    // Format time saved
    let timeSavedDisplay: string;
    if (timeSavedMinutes >= 60) {
      const hours = Math.floor(timeSavedMinutes / 60);
      const mins = timeSavedMinutes % 60;
      timeSavedDisplay = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      timeSavedDisplay = `${timeSavedMinutes} min`;
    }

    // Calculate estimated savings: $50/hr copywriter rate
    const hourlyRate = 50;
    const estimatedSavings = Math.round((timeSavedMinutes / 60) * hourlyRate);

    // Get all-time stats for additional context
    const { count: totalProductsAllTime } = await supabaseAdmin
      .from("generated_content")
      .select("*", { count: "exact", head: true })
      .eq("store_id", shopId)
      .eq("content_type", "product_description");

    const { count: totalAdsAllTime } = await supabaseAdmin
      .from("ads_library")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shopId);

    logger.info("[Shop Stats] Stats retrieved", {
      component: "shop-stats",
      shopId,
      productsGenerated,
      adsCreated,
      timeSavedMinutes,
      estimatedSavings,
    });

    return NextResponse.json({
      success: true,
      data: {
        // This month stats
        productsGenerated,
        adsCreated,
        timeSavedMinutes,
        timeSavedDisplay,
        estimatedSavings,
        // All time stats
        allTime: {
          productsGenerated: totalProductsAllTime || 0,
          adsCreated: totalAdsAllTime || 0,
        },
        // Period info
        period: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
          label: now.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
        },
      },
    });
  } catch (error) {
    logger.error("[Shop Stats] Error:", error as Error, {
      component: "shop-stats",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
