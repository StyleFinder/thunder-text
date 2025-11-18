import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/trends/shop-themes?shop=store.myshopify.com
 * Get all enabled themes for a shop
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopDomain = searchParams.get("shop");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "shop parameter required" },
        { status: 400 },
      );
    }

    // Get shop ID from shop domain
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }
    const shopId = shop.id;

    // Get all enabled themes for this shop
    const { data: shopThemes, error: themesError } = await supabaseAdmin
      .from("shop_themes")
      .select("id, theme_id, market, region, priority, is_enabled, created_at, updated_at")
      .eq("shop_id", shopId)
      .eq("is_enabled", true)
      .order("priority", { ascending: true });

    if (themesError) {
      console.error("Error fetching shop themes:", themesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch shop themes" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      shopThemes: shopThemes || [],
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/trends/shop-themes:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/trends/shop-themes?shop=store.myshopify.com
 * Enable a theme for the authenticated shop
 *
 * Body: { themeId: string, market?: string, region?: string, priority?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopDomain = searchParams.get("shop");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "shop parameter required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { themeId, market = "US", region = null, priority = 5 } = body;

    if (!themeId) {
      return NextResponse.json(
        { success: false, error: "themeId required" },
        { status: 400 },
      );
    }

    // Get shop ID from shop domain
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }
    const shopId = shop.id;

    // Verify theme exists and is active
    const { data: theme, error: themeError } = await supabaseAdmin
      .from("themes")
      .select("id, slug, name")
      .eq("id", themeId)
      .eq("is_active", true)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { success: false, error: "Theme not found" },
        { status: 404 },
      );
    }

    // Check if shop_theme already exists
    const { data: existingShopTheme } = await supabaseAdmin
      .from("shop_themes")
      .select("id")
      .eq("shop_id", shopId)
      .eq("theme_id", theme.id)
      .eq("market", market)
      .is("region", region) // Handle NULL properly
      .single();

    let shopTheme;
    let insertError;

    if (existingShopTheme) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from("shop_themes")
        .update({
          priority,
          is_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingShopTheme.id)
        .select()
        .single();
      shopTheme = data;
      insertError = error;
    } else {
      // Insert new
      const { data, error } = await supabaseAdmin
        .from("shop_themes")
        .insert({
          shop_id: shopId,
          theme_id: theme.id,
          market,
          region,
          priority,
          is_enabled: true,
        })
        .select()
        .single();
      shopTheme = data;
      insertError = error;
    }

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
 * DELETE /api/trends/shop-themes?shop=store.myshopify.com&id=shopThemeId
 * Disable a theme for shop
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopDomain = searchParams.get("shop");
    const shopThemeId = searchParams.get("id");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "shop parameter required" },
        { status: 400 },
      );
    }

    if (!shopThemeId) {
      return NextResponse.json(
        { success: false, error: "Shop theme ID required" },
        { status: 400 },
      );
    }

    // Get shop ID from shop domain
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }
    const shopId = shop.id;

    // Soft delete (set is_enabled = false) - preserves historical data
    const { error: updateError } = await supabaseAdmin
      .from("shop_themes")
      .update({ is_enabled: false })
      .eq("id", shopThemeId)
      .eq("shop_id", shopId); // Safety check

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
