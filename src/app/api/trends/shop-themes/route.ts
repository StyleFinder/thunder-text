import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/trends/shop-themes
 * Enable a theme for the authenticated shop
 *
 * Body: { themeSlug: string, market?: string, region?: string, priority?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const body = await request.json();
    const { themeSlug, market = "US", region = null, priority = 5 } = body;

    if (!themeSlug) {
      return NextResponse.json(
        { success: false, error: "themeSlug required" },
        { status: 400 },
      );
    }

    // Get authenticated shop ID
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

    // Get theme ID
    const { data: theme, error: themeError } = await supabase
      .from("themes")
      .select("id")
      .eq("slug", themeSlug)
      .eq("is_active", true)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { success: false, error: "Theme not found" },
        { status: 404 },
      );
    }

    // Insert or update shop_themes (use service role for write)
    const serviceSupabase = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: shopTheme, error: insertError } = await serviceSupabase
      .from("shop_themes")
      .upsert(
        {
          shop_id: shopId,
          theme_id: theme.id,
          market,
          region,
          priority,
          is_enabled: true,
        },
        {
          onConflict: "shop_id,theme_id,market,region",
          ignoreDuplicates: false,
        },
      )
      .select()
      .single();

    if (insertError) {
      console.error("Error enabling theme:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to enable theme" },
        { status: 500 },
      );
    }

    // Trigger backfill job (async - don't wait)
    fetch(`${request.nextUrl.origin}/api/trends/refresh/backfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopThemeId: shopTheme.id }),
    }).catch((err) => console.error("Backfill trigger failed:", err));

    return NextResponse.json({
      success: true,
      message: "Theme enabled successfully. Backfill in progress.",
      shopTheme,
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/trends/shop-themes:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/trends/shop-themes
 * Disable a theme for shop
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { searchParams } = new URL(request.url);
    const shopThemeId = searchParams.get("id");

    if (!shopThemeId) {
      return NextResponse.json(
        { success: false, error: "Shop theme ID required" },
        { status: 400 },
      );
    }

    // Get authenticated shop ID
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

    // Use service role for write
    const serviceSupabase = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Soft delete (set is_enabled = false) - preserves historical data
    const { error: updateError } = await serviceSupabase
      .from("shop_themes")
      .update({ is_enabled: false })
      .eq("id", shopThemeId)
      .eq("shop_id", shopId); // RLS safety

    if (updateError) {
      console.error("Error disabling theme:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to disable theme" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Theme disabled successfully",
    });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/trends/shop-themes:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
