import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/trends/shop-themes/enabled?shop=store.myshopify.com
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

    // Get enabled themes with theme details
    const { data: shopThemes, error: themesError } = await supabaseAdmin
      .from("shop_themes")
      .select(
        `
        id,
        theme_id,
        market,
        region,
        priority,
        is_enabled,
        themes!inner (
          id,
          slug,
          name,
          description,
          category,
          active_start,
          active_end
        )
      `,
      )
      .eq("shop_id", shopId)
      .eq("is_enabled", true)
      .order("priority", { ascending: true });

    if (themesError) {
      console.error("Error fetching enabled themes:", themesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch enabled themes" },
        { status: 500 },
      );
    }

    // Flatten the structure
    const themes = shopThemes.map((st) => ({
      shopThemeId: st.id,
      theme_id: st.theme_id,
      market: st.market,
      region: st.region,
      priority: st.priority,
      ...(Array.isArray(st.themes) ? st.themes[0] : st.themes),
    }));

    return NextResponse.json({
      success: true,
      themes,
    });
  } catch (error) {
    console.error(
      "Unexpected error in GET /api/trends/shop-themes/enabled:",
      error,
    );
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
