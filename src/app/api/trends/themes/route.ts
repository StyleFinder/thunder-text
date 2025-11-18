import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/trends/themes?shop=store.myshopify.com
 * Get all available themes (global + custom themes for this shop)
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

    // Get shop ID
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

    // Get all active themes (global themes + custom themes for this shop)
    const { data: themes, error: themesError } = await supabaseAdmin
      .from("themes")
      .select(`
        id,
        slug,
        name,
        description,
        category,
        active_start,
        active_end,
        created_by_shop_id,
        theme_keywords (keyword, weight)
      `)
      .eq("is_active", true)
      .or(`created_by_shop_id.is.null,created_by_shop_id.eq.${shop.id}`)
      .order("name");

    if (themesError) {
      console.error("Error fetching themes:", themesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch themes" },
        { status: 500 },
      );
    }

    // Classify themes and format response
    const formattedThemes = themes.map((theme) => ({
      id: theme.id,
      slug: theme.slug,
      name: theme.name,
      description: theme.description || "",
      category: theme.category,
      activeStart: theme.active_start,
      activeEnd: theme.active_end,
      isCustom: theme.created_by_shop_id === shop.id,
      isGlobal: theme.created_by_shop_id === null,
      keywordCount: theme.theme_keywords?.length || 0,
      keywords: theme.theme_keywords || [],
    }));

    return NextResponse.json({
      success: true,
      themes: formattedThemes,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/trends/themes:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
