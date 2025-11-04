import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/trends/themes
 * Returns all active themes available for tracking
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: themes, error } = await supabase
      .from("themes")
      .select("id, slug, name, description, category, active_start, active_end")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching themes:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch themes" },
        { status: 500 },
      );
    }

    // Check which themes are currently in season
    const now = new Date();
    const enrichedThemes = themes.map((theme) => ({
      ...theme,
      inSeason: isThemeInSeason(theme.active_start, theme.active_end, now),
    }));

    return NextResponse.json({
      success: true,
      themes: enrichedThemes,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/trends/themes:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper: check if theme is in season
function isThemeInSeason(
  activeStart: string | null,
  activeEnd: string | null,
  checkDate: Date,
): boolean {
  if (!activeStart || !activeEnd) return true; // Always active

  const checkMD = formatMonthDay(checkDate);

  if (activeStart <= activeEnd) {
    // Normal season (e.g., "08-01" to "12-31")
    return checkMD >= activeStart && checkMD <= activeEnd;
  } else {
    // Wrapping season (e.g., "11-15" to "01-31")
    return checkMD >= activeStart || checkMD <= activeEnd;
  }
}

function formatMonthDay(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}
