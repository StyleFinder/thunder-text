import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/trends/themes/custom?shop=store.myshopify.com
 * Create a custom theme for a shop
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   keywords: Array<{keyword: string, weight: number}>,
 *   category?: string,
 *   activeStart?: string,
 *   activeEnd?: string
 * }
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
    const {
      name,
      description = "",
      keywords = [],
      category = "custom",
      activeStart = null,
      activeEnd = null,
    } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Theme name is required" },
        { status: 400 },
      );
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one keyword is required" },
        { status: 400 },
      );
    }

    // Validate keyword weights
    for (const kw of keywords) {
      if (!kw.keyword || typeof kw.weight !== "number") {
        return NextResponse.json(
          { success: false, error: "Each keyword must have keyword and weight" },
          { status: 400 },
        );
      }
      if (kw.weight < 0 || kw.weight > 1) {
        return NextResponse.json(
          { success: false, error: "Keyword weight must be between 0 and 1" },
          { status: 400 },
        );
      }
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

    // Generate slug from name
    const slug = `custom-${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}-${Date.now()}`;

    // Create theme
    const { data: theme, error: themeError } = await supabaseAdmin
      .from("themes")
      .insert({
        slug,
        name,
        description,
        category,
        active_start: activeStart,
        active_end: activeEnd,
        is_active: true,
        created_by_shop_id: shop.id, // Mark as custom theme
      })
      .select()
      .single();

    if (themeError) {
      console.error("Error creating custom theme:", themeError);
      return NextResponse.json(
        { success: false, error: "Failed to create theme" },
        { status: 500 },
      );
    }

    // Insert keywords
    const keywordRecords = keywords.map((kw: { keyword: string; weight: number }) => ({
      theme_id: theme.id,
      keyword: kw.keyword.trim(),
      weight: kw.weight,
    }));

    const { error: keywordsError } = await supabaseAdmin
      .from("theme_keywords")
      .insert(keywordRecords);

    if (keywordsError) {
      // Rollback theme creation
      await supabaseAdmin.from("themes").delete().eq("id", theme.id);
      console.error("Error inserting keywords:", keywordsError);
      return NextResponse.json(
        { success: false, error: "Failed to insert keywords" },
        { status: 500 },
      );
    }

    // Auto-enable the theme for the shop
    const { data: shopTheme, error: shopThemeError } = await supabaseAdmin
      .from("shop_themes")
      .insert({
        shop_id: shop.id,
        theme_id: theme.id,
        market: "US",
        priority: 10, // Custom themes get lower priority by default
        is_enabled: true,
      })
      .select()
      .single();

    if (shopThemeError) {
      console.error("Error enabling custom theme:", shopThemeError);
      // Don't rollback - theme was created successfully
    }

    // Trigger backfill if shop_theme was created
    if (shopTheme) {
      fetch(`${request.nextUrl.origin}/api/trends/refresh/backfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopThemeId: shopTheme.id }),
      }).catch((err) => console.error("Backfill trigger failed:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Custom theme created successfully",
      theme: {
        id: theme.id,
        slug: theme.slug,
        name: theme.name,
        description: theme.description,
        keywords: keywords.length,
      },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/trends/themes/custom:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/trends/themes/custom?shop=store.myshopify.com&themeId=xxx
 * Delete a custom theme (only if created by this shop)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopDomain = searchParams.get("shop");
    const themeId = searchParams.get("themeId");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "shop parameter required" },
        { status: 400 },
      );
    }

    if (!themeId) {
      return NextResponse.json(
        { success: false, error: "themeId parameter required" },
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

    // Verify theme is custom and created by this shop
    const { data: theme, error: themeError } = await supabaseAdmin
      .from("themes")
      .select("id, name, created_by_shop_id")
      .eq("id", themeId)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { success: false, error: "Theme not found" },
        { status: 404 },
      );
    }

    if (theme.created_by_shop_id !== shop.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete global themes or themes created by other shops",
        },
        { status: 403 },
      );
    }

    // Delete theme (CASCADE will handle shop_themes, theme_keywords, etc.)
    const { error: deleteError } = await supabaseAdmin
      .from("themes")
      .delete()
      .eq("id", themeId)
      .eq("created_by_shop_id", shop.id); // Extra safety check

    if (deleteError) {
      console.error("Error deleting custom theme:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete theme" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Custom theme deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/trends/themes/custom:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
