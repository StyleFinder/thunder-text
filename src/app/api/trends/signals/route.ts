import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/trends/signals?themeSlug=game-day
 * Returns trend signal + series + seasonal profile for a specific theme
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { searchParams } = new URL(request.url);
    const themeSlug = searchParams.get("themeSlug");

    if (!themeSlug) {
      return NextResponse.json(
        { success: false, error: "themeSlug parameter required" },
        { status: 400 },
      );
    }

    // Get authenticated shop ID from session token
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const shopId = user.id;

    // 1. Get theme details
    const { data: theme, error: themeError } = await supabase
      .from("themes")
      .select("id, slug, name, description, category, active_start, active_end")
      .eq("slug", themeSlug)
      .eq("is_active", true)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { success: false, error: "Theme not found" },
        { status: 404 },
      );
    }

    // 2. Get trend signal
    const { data: signal, error: signalError } = await supabase
      .from("trend_signals")
      .select("*")
      .eq("shop_id", shopId)
      .eq("theme_id", theme.id)
      .maybeSingle();

    if (signalError) {
      console.error("Error fetching signal:", signalError);
    }

    // 3. Get trend series (last 12 weeks)
    const { data: seriesRecords, error: seriesError } = await supabase
      .from("trend_series")
      .select("points, granularity, start_date, end_date, updated_at")
      .eq("shop_id", shopId)
      .eq("theme_id", theme.id)
      .order("start_date", { ascending: false })
      .limit(1);

    if (seriesError) {
      console.error("Error fetching series:", seriesError);
    }

    const series = seriesRecords?.[0]?.points || [];

    // 4. Get seasonal profile (optional)
    const { data: profile, error: profileError } = await supabase
      .from("seasonal_profiles")
      .select("week_1_to_52, years_included, updated_at")
      .eq("theme_id", theme.id)
      .eq("market", "US") // TODO: make dynamic per shop
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    return NextResponse.json({
      success: true,
      theme,
      signal: signal || null,
      series: series || [],
      seasonalProfile: profile?.week_1_to_52 || null,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/trends/signals:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
