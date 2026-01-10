import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * POST /api/trends/shop-themes
 * Enable a theme for the authenticated shop
 *
 * Body: { themeSlug?: string, themeId?: string, market?: string, region?: string, priority?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      themeSlug,
      themeId,
      market = "US",
      region = null,
      priority = 5,
    } = body;

    if (!themeSlug && !themeId) {
      return NextResponse.json(
        { success: false, error: "themeSlug or themeId required" },
        { status: 400 },
      );
    }

    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const shopId = session.user.id;

    // Get theme - by ID or slug
    let resolvedThemeId = themeId;
    if (!resolvedThemeId && themeSlug) {
      const { data: theme, error: themeError } = await supabaseAdmin
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
      resolvedThemeId = theme.id;
    }

    // Check if shop_theme already exists
    const { data: existingShopTheme } = await supabaseAdmin
      .from("shop_themes")
      .select("id")
      .eq("shop_id", shopId)
      .eq("theme_id", resolvedThemeId)
      .eq("market", market)
      .is("region", region)
      .maybeSingle();

    let shopTheme;
    let insertError;

    if (existingShopTheme) {
      // Update existing
      const result = await supabaseAdmin
        .from("shop_themes")
        .update({
          priority,
          is_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingShopTheme.id)
        .select()
        .single();
      shopTheme = result.data;
      insertError = result.error;
    } else {
      // Insert new
      const result = await supabaseAdmin
        .from("shop_themes")
        .insert({
          shop_id: shopId,
          theme_id: resolvedThemeId,
          market,
          region,
          priority,
          is_enabled: true,
        })
        .select()
        .single();
      shopTheme = result.data;
      insertError = result.error;
    }

    if (insertError || !shopTheme) {
      logger.error("Error enabling theme:", insertError as Error, {
        component: "shop-themes",
        shopId,
        themeId: resolvedThemeId,
        errorMessage: insertError?.message,
        errorCode: insertError?.code,
      });
      return NextResponse.json(
        {
          success: false,
          error: insertError?.message || "Failed to enable theme",
        },
        { status: 500 },
      );
    }

    // Trigger backfill job (async - don't wait)
    fetch(`${request.nextUrl.origin}/api/trends/refresh/backfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopThemeId: shopTheme.id }),
    }).catch((err) =>
      logger.error("Backfill trigger failed:", err as Error, {
        component: "shop-themes",
      }),
    );

    return NextResponse.json({
      success: true,
      message: "Theme enabled successfully. Backfill in progress.",
      shopTheme,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /api/trends/shop-themes:",
      error as Error,
      { component: "shop-themes" },
    );
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
    const { searchParams } = new URL(request.url);
    const shopThemeId = searchParams.get("id");

    if (!shopThemeId) {
      return NextResponse.json(
        { success: false, error: "Shop theme ID required" },
        { status: 400 },
      );
    }

    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const shopId = session.user.id;

    // Soft delete (set is_enabled = false) - preserves historical data
    const { error: updateError } = await supabaseAdmin
      .from("shop_themes")
      .update({ is_enabled: false })
      .eq("id", shopThemeId)
      .eq("shop_id", shopId); // RLS safety

    if (updateError) {
      logger.error("Error disabling theme:", updateError as Error, {
        component: "shop-themes",
      });
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
    logger.error(
      "Unexpected error in DELETE /api/trends/shop-themes:",
      error as Error,
      { component: "shop-themes" },
    );
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
