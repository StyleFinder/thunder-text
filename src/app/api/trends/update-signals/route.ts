import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface SerpAPITrendsResponse {
  interest_over_time?: {
    timeline_data?: Array<{
      date: string;
      values: Array<{
        query: string;
        value: string;
        extracted_value: number;
      }>;
    }>;
  };
}

interface Theme {
  id: string;
  slug: string;
  name: string;
}

/**
 * POST /api/trends/update-signals
 * Manually trigger trend data update for a specific theme
 * Fetches Google Trends data via SerpAPI and calculates signals
 *
 * Body: { themeSlug: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [UPDATE-SIGNALS] Request received");

    // Parse request body
    const body = await request.json();
    const { themeSlug } = body;

    console.log(`📋 [UPDATE-SIGNALS] Theme slug: ${themeSlug}`);

    if (!themeSlug) {
      console.log("❌ [UPDATE-SIGNALS] No themeSlug provided");
      return NextResponse.json(
        { success: false, error: "themeSlug is required" },
        { status: 400 },
      );
    }

    const serpApiKey = process.env.SERPAPI_KEY;

    if (!serpApiKey) {
      return NextResponse.json(
        { success: false, error: "SERPAPI_KEY not configured" },
        { status: 500 },
      );
    }

    // Get first active shop for testing purposes
    // TODO: In production, get shop_id from authenticated session
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (shopError || !shopData) {
      console.error("Error fetching shop:", shopError);
      return NextResponse.json(
        {
          success: false,
          error: "No active shop found. Please install the app first.",
        },
        { status: 404 },
      );
    }

    const shopId = shopData.id;
    console.log(`🏪 [UPDATE-SIGNALS] Shop ID: ${shopId}`);

    // Get the specific theme using RPC function (bypasses PostgREST)
    console.log(`🔍 [UPDATE-SIGNALS] Fetching theme: ${themeSlug}`);
    const { data: themes, error: themesError } = await supabaseAdmin.rpc(
      "get_theme_by_slug",
      { p_slug: themeSlug },
    );

    if (themesError) {
      console.error("❌ [UPDATE-SIGNALS] Error fetching theme:", themesError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch theme: ${themesError.message}`,
        },
        { status: 500 },
      );
    }

    if (!themes || themes.length === 0) {
      console.log(
        `❌ [UPDATE-SIGNALS] Theme '${themeSlug}' not found or inactive`,
      );
      return NextResponse.json(
        { success: false, error: `Theme '${themeSlug}' not found or inactive` },
        { status: 404 },
      );
    }

    const theme = themes[0] as Theme;
    console.log(`✅ [UPDATE-SIGNALS] Found theme: ${theme.name} (${theme.id})`);

    // Update the single theme
    console.log(`🔄 [UPDATE-SIGNALS] Starting SerpAPI fetch for ${theme.name}`);
    const result = await updateThemeTrends(theme, serpApiKey, shopId);
    console.log(`✅ [UPDATE-SIGNALS] Update result:`, result);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          themeSlug: result.themeSlug,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${theme.name}`,
      result,
    });
  } catch (error) {
    console.error("Error in update-signals:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

async function updateThemeTrends(
  theme: Theme,
  serpApiKey: string,
  shopId: string,
) {
  // Fetch Google Trends data from SerpAPI
  const trendsUrl = new URL("https://serpapi.com/search.json");
  trendsUrl.searchParams.set("engine", "google_trends");
  trendsUrl.searchParams.set("q", theme.name);
  trendsUrl.searchParams.set("data_type", "TIMESERIES");
  trendsUrl.searchParams.set("api_key", serpApiKey);

  const response = await fetch(trendsUrl.toString());

  if (!response.ok) {
    throw new Error(
      `SerpAPI request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data: SerpAPITrendsResponse = await response.json();

  // Extract timeline data
  const timelineData = data.interest_over_time?.timeline_data || [];

  if (timelineData.length === 0) {
    return {
      themeSlug: theme.slug,
      success: false,
      error: "No trend data available",
    };
  }

  // Parse date from SerpAPI format (e.g., "Dec 22 – 28, 2024" or "Dec 29, 2024 – Jan 4, 2025")
  // Extract the first date in the range and convert to ISO format
  function parseSerpAPIDate(dateStr: string): string {
    try {
      // Split on en-dash or hyphen to get the start of the range
      const startPart = dateStr.split(/\s*[–-]\s*/)[0].trim();

      // Extract year from anywhere in the original string
      const yearMatch = dateStr.match(/\d{4}/);
      const year = yearMatch
        ? yearMatch[0]
        : new Date().getFullYear().toString();

      // Parse the start date with year
      const fullDate = startPart.includes(",")
        ? startPart
        : `${startPart}, ${year}`;
      const date = new Date(fullDate);

      // Return ISO format YYYY-MM-DD
      return date.toISOString().split("T")[0];
    } catch {
      // Fallback: return current date if parsing fails
      return new Date().toISOString().split("T")[0];
    }
  }

  // Convert to series points
  const series = timelineData
    .map((point) => ({
      date: parseSerpAPIDate(point.date),
      value: point.values?.[0]?.extracted_value || 0,
    }))
    .filter((point) => point.value > 0);

  if (series.length < 2) {
    return {
      themeSlug: theme.slug,
      success: false,
      error: "Insufficient data points",
    };
  }

  // Calculate momentum (compare last 2 weeks)
  const latestValue = series[series.length - 1].value;
  const previousValue = series[series.length - 2].value;
  const momentumPct = ((latestValue - previousValue) / previousValue) * 100;

  // Determine status based on momentum
  let status: "Rising" | "Stable" | "Waning";
  if (momentumPct > 5) {
    status = "Rising";
  } else if (momentumPct < -5) {
    status = "Waning";
  } else {
    status = "Stable";
  }

  // Find peak in last 52 weeks
  const sortedByValue = [...series].sort((a, b) => b.value - a.value);
  const peakPoint = sortedByValue[0];

  // peakPoint.date is already in ISO format from parseSerpAPIDate
  const peakDate = new Date(peakPoint.date);
  const now = new Date();
  const peakRecencyDays = Math.floor(
    (now.getTime() - peakDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Store trend signal using RPC function (bypasses PostgREST)
  const { error: signalError } = await supabaseAdmin.rpc(
    "upsert_trend_signal",
    {
      p_shop_id: shopId,
      p_theme_id: theme.id,
      p_status: status,
      p_momentum_pct: parseFloat(momentumPct.toFixed(2)),
      p_latest_value: latestValue,
      p_last_peak_date: peakPoint.date,
      p_peak_recency_days: peakRecencyDays,
    },
  );

  if (signalError) {
    throw new Error(`Failed to store signal: ${signalError.message}`);
  }

  // Store trend series using RPC function (bypasses PostgREST)
  const { error: seriesError } = await supabaseAdmin.rpc(
    "upsert_trend_series",
    {
      p_shop_id: shopId,
      p_theme_id: theme.id,
      p_granularity: "weekly",
      p_points: series,
      p_start_date: series[0].date,
      p_end_date: series[series.length - 1].date,
    },
  );

  if (seriesError) {
    throw new Error(`Failed to store series: ${seriesError.message}`);
  }

  return {
    themeSlug: theme.slug,
    success: true,
    status,
    momentumPct: parseFloat(momentumPct.toFixed(2)),
    dataPoints: series.length,
  };
}
