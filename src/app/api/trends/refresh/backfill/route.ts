import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SerpApiTrendsProvider } from "@/lib/trends/providers/serpapi";
import { logger } from "@/lib/logger";

/**
 * POST /api/trends/refresh/backfill
 * Backfill 2 years of historical data for a shop theme
 *
 * Body: { shopThemeId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const serviceSupabase = createClient(supabaseUrl, serviceKey);

    const body = await request.json();
    const { shopThemeId } = body;

    if (!shopThemeId) {
      return NextResponse.json(
        { success: false, error: "shopThemeId required" },
        { status: 400 },
      );
    }

    // Get shop theme details
    const { data: shopTheme, error: fetchError } = await serviceSupabase
      .from("shop_themes")
      .select(
        `
        shop_id,
        theme_id,
        market,
        region,
        backfill_completed,
        themes!inner (slug, name)
      `,
      )
      .eq("id", shopThemeId)
      .single();

    if (fetchError || !shopTheme) {
      return NextResponse.json(
        { success: false, error: "Shop theme not found" },
        { status: 404 },
      );
    }

    if (shopTheme.backfill_completed) {
      return NextResponse.json({
        success: true,
        message: "Backfill already completed for this theme",
      });
    }

    const _theme = Array.isArray(shopTheme.themes)
      ? shopTheme.themes[0]
      : shopTheme.themes;

    // Get keywords
    const { data: keywords } = await serviceSupabase
      .from("theme_keywords")
      .select("keyword, weight")
      .eq("theme_id", shopTheme.theme_id)
      .eq("market", shopTheme.market)
      .eq("is_active", true);

    if (!keywords || keywords.length === 0) {
      throw new Error("No keywords found for theme");
    }

    // Backfill 2 years in chunks (Google Trends limits)
    const chunks = [
      { start: -730, end: -365 }, // Year 2
      { start: -365, end: 0 }, // Year 1
    ];

    const provider = new SerpApiTrendsProvider(process.env.SERPAPI_KEY!);

    for (const chunk of chunks) {
      const chunkStart = new Date();
      chunkStart.setDate(chunkStart.getDate() + chunk.start);

      const chunkEnd = new Date();
      chunkEnd.setDate(chunkEnd.getDate() + chunk.end);

      const series = await provider.getSeries({
        keywords: keywords.map((k) => ({
          term: k.keyword,
          weight: Number(k.weight),
        })),
        market: shopTheme.market,
        region: shopTheme.region || undefined,
        startDate: chunkStart.toISOString().split("T")[0],
        endDate: chunkEnd.toISOString().split("T")[0],
        granularity: "weekly",
      });

      // Save series
      await serviceSupabase.from("trend_series").upsert(
        {
          shop_id: shopTheme.shop_id,
          theme_id: shopTheme.theme_id,
          market: shopTheme.market,
          region: shopTheme.region,
          source: series.source,
          granularity: series.granularity,
          start_date: chunkStart.toISOString().split("T")[0],
          end_date: chunkEnd.toISOString().split("T")[0],
          points: series.points,
        },
        {
          onConflict:
            "shop_id,theme_id,market,region,source,granularity,start_date,end_date",
        },
      );

      // Rate limiting pause (SerpAPI: ~1 req/sec)
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Mark backfill complete
    await serviceSupabase
      .from("shop_themes")
      .update({
        backfill_completed: true,
        backfill_start_date: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      })
      .eq("id", shopThemeId);

    return NextResponse.json({
      success: true,
      message: "Backfill completed successfully",
    });
  } catch (error) {
    logger.error("Backfill error:", error as Error, { component: "backfill" });
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
