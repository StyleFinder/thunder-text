import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

/**
 * GET /api/trends/signals?themeSlug=game-day&shop=myshop.myshopify.com
 * Returns trend signal + series + seasonal profile for a specific theme
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const themeSlug = searchParams.get("themeSlug");
    const shop = searchParams.get("shop");

    if (!themeSlug) {
      return NextResponse.json(
        { success: false, error: "themeSlug parameter required" },
        { status: 400 },
      );
    }

    // Shop parameter is optional - if provided, we'll look up shop-specific data
    let shopId: string | null = null;

    if (shop) {
      const fullShop = shop.includes(".myshopify.com")
        ? shop
        : `${shop}.myshopify.com`;

      const { data: shopData, error: shopError } = await supabaseAdmin
        .from("shops")
        .select("id")
        .eq("shop_domain", fullShop)
        .single();

      if (shopError) {
        logger.warn(
          "Shop not found for trends signals, continuing without shop-specific data",
          {
            component: "trends-signals",
            shop: fullShop,
            error: shopError.message,
          },
        );
      } else if (shopData) {
        shopId = shopData.id;
      }
    }

    // 1. Get theme details
    const { data: theme, error: themeError } = await supabaseAdmin
      .from("themes")
      .select("id, slug, name, description, category, active_start, active_end")
      .eq("slug", themeSlug)
      .eq("is_active", true)
      .single();

    if (themeError || !theme) {
      logger.error("Theme not found", {
        component: "trends-signals",
        themeSlug,
        error: themeError?.message || "No theme returned",
        code: themeError?.code,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Theme not found",
          details: themeError?.message,
        },
        { status: 404 },
      );
    }

    // Default shop ID for global trend data (used when no shop-specific data exists)
    const DEFAULT_TRENDS_SHOP_ID = "11111111-1111-1111-1111-111111111111";

    // 2. Get trend signal - try shop-specific first, then fall back to global
    let signal = null;

    // First try shop-specific data if we have a shopId
    if (shopId) {
      const { data: shopSignalData, error: shopSignalError } =
        await supabaseAdmin
          .from("trend_signals")
          .select("*")
          .eq("shop_id", shopId)
          .eq("theme_id", theme.id)
          .maybeSingle();

      if (shopSignalError) {
        logger.error(
          "Error fetching shop-specific signal:",
          shopSignalError as Error,
          {
            component: "signals",
          },
        );
      }
      signal = shopSignalData;
    }

    // Fall back to global/default data if no shop-specific data
    if (!signal) {
      const { data: defaultSignalData, error: defaultSignalError } =
        await supabaseAdmin
          .from("trend_signals")
          .select("*")
          .eq("shop_id", DEFAULT_TRENDS_SHOP_ID)
          .eq("theme_id", theme.id)
          .maybeSingle();

      if (defaultSignalError) {
        logger.error(
          "Error fetching default signal:",
          defaultSignalError as Error,
          {
            component: "signals",
          },
        );
      }
      signal = defaultSignalData;
    }

    // 3. Get trend series - try shop-specific first, then fall back to global
    let series: unknown[] = [];

    // First try shop-specific data if we have a shopId
    if (shopId) {
      const { data: shopSeriesRecords, error: shopSeriesError } =
        await supabaseAdmin
          .from("trend_series")
          .select("points, granularity, start_date, end_date, updated_at")
          .eq("shop_id", shopId)
          .eq("theme_id", theme.id)
          .order("start_date", { ascending: false })
          .limit(1);

      if (shopSeriesError) {
        logger.error(
          "Error fetching shop-specific series:",
          shopSeriesError as Error,
          {
            component: "signals",
          },
        );
      }
      series = shopSeriesRecords?.[0]?.points || [];
    }

    // Fall back to global/default data if no shop-specific series
    if (series.length === 0) {
      const { data: defaultSeriesRecords, error: defaultSeriesError } =
        await supabaseAdmin
          .from("trend_series")
          .select("points, granularity, start_date, end_date, updated_at")
          .eq("shop_id", DEFAULT_TRENDS_SHOP_ID)
          .eq("theme_id", theme.id)
          .order("start_date", { ascending: false })
          .limit(1);

      if (defaultSeriesError) {
        logger.error(
          "Error fetching default series:",
          defaultSeriesError as Error,
          {
            component: "signals",
          },
        );
      }
      series = defaultSeriesRecords?.[0]?.points || [];
    }

    // 4. Get seasonal profile (optional)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("seasonal_profiles")
      .select("week_1_to_52, years_included, updated_at")
      .eq("theme_id", theme.id)
      .eq("market", "US") // TODO: make dynamic per shop
      .maybeSingle();

    if (profileError) {
      logger.error("Error fetching profile:", profileError as Error, {
        component: "signals",
      });
    }

    return NextResponse.json({
      success: true,
      theme,
      signal: signal || null,
      series: series || [],
      seasonalProfile: profile?.week_1_to_52 || null,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /api/trends/signals:",
      error as Error,
      { component: "signals" },
    );
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
