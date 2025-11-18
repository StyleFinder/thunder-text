import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/trends/themes/keywords
 * Insert keywords for a theme
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { themeSlug, keywords } = body;

    if (!themeSlug || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { success: false, error: "themeSlug and keywords array required" },
        { status: 400 },
      );
    }

    // Get theme ID
    const { data: theme, error: themeError } = await supabaseAdmin
      .from("themes")
      .select("id")
      .eq("slug", themeSlug)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { success: false, error: "Theme not found" },
        { status: 404 },
      );
    }

    // Insert keywords
    const keywordRecords = keywords.map((kw: { keyword: string; weight: number }) => ({
      theme_id: theme.id,
      keyword: kw.keyword,
      weight: kw.weight,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("theme_keywords")
      .insert(keywordRecords);

    if (insertError) {
      console.error("Error inserting keywords:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to insert keywords" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Inserted ${keywords.length} keywords for ${themeSlug}`,
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/trends/themes/keywords:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
