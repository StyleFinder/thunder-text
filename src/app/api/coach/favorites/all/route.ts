import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/coach/favorites/all
 *
 * Fetches all coaches' favorites grouped by shop_id
 *
 * SECURITY: Requires admin role. This is an admin-only endpoint since it
 * returns data across all shops.
 *
 * Returns: { success: boolean, favorites: Array<{ shop_id: string, coach_emails: string[] }> }
 */
export async function GET() {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // SECURITY: Require admin role for cross-shop data access
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin") {
      logger.warn("Non-admin attempted to access /api/coach/favorites/all", {
        component: "coach-favorites-all",
        userEmail: session.user.email,
      });
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    // Fetch all coach favorites (admin-only operation)
    const { data: allFavorites, error } = await supabaseAdmin
      .from("coach_favorites")
      .select("shop_id, coach_email");

    if (error) {
      logger.error("Error fetching all favorites:", error as Error, {
        component: "all",
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch favorites" },
        { status: 500 },
      );
    }

    // Group by shop_id
    const groupedFavorites = new Map<string, string[]>();

    allFavorites?.forEach((fav) => {
      if (!groupedFavorites.has(fav.shop_id)) {
        groupedFavorites.set(fav.shop_id, []);
      }
      groupedFavorites.get(fav.shop_id)!.push(fav.coach_email);
    });

    // Convert Map to array format
    const favoritesArray = Array.from(groupedFavorites.entries()).map(
      ([shop_id, coach_emails]) => ({
        shop_id,
        coach_emails,
      }),
    );

    return NextResponse.json({
      success: true,
      favorites: favoritesArray,
    });
  } catch (error) {
    logger.error("Error in GET /api/coach/favorites/all:", error as Error, {
      component: "all",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
