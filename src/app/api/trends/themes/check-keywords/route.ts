import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/trends/themes/check-keywords
 * Check all themes and their keyword counts
 */
export async function GET() {
  try {
    // Get all themes with their keywords
    const { data: themes, error: themesError } = await supabaseAdmin
      .from("themes")
      .select(`
        id,
        name,
        slug,
        theme_keywords (
          keyword,
          weight
        )
      `)
      .order("name");

    if (themesError) {
      console.error("Error fetching themes:", themesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch themes" },
        { status: 500 },
      );
    }

    // Format the results
    const results = themes.map((theme: any) => ({
      name: theme.name,
      slug: theme.slug,
      keywordCount: theme.theme_keywords?.length || 0,
      keywords: theme.theme_keywords?.map((tk: any) => tk.keyword) || [],
    }));

    // Sort by keyword count (ascending) to show missing keywords first
    results.sort((a, b) => a.keywordCount - b.keywordCount);

    return NextResponse.json({
      success: true,
      themes: results,
      summary: {
        total: results.length,
        withKeywords: results.filter((t) => t.keywordCount > 0).length,
        withoutKeywords: results.filter((t) => t.keywordCount === 0).length,
      },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/trends/themes/check-keywords:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
