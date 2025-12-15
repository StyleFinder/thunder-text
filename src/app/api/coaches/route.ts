import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/coaches
 * Fetches all active coaches from the database
 * Returns: { success: boolean, coaches: Array<{ name: string, email: string }> }
 *
 * SECURITY: Requires session authentication.
 * Coach list should only be accessible to authenticated users (admins/coaches).
 */
export async function GET() {
  try {
    // SECURITY: Require session authentication
    // Coach information (names/emails) should not be publicly exposed
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // SECURITY: Only coaches and admins can view the coach list
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "coach" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access denied: Insufficient permissions" },
        { status: 403 },
      );
    }

    // Fetch all coaches, ordered by name
    const { data: coaches, error } = await supabaseAdmin
      .from("coaches")
      .select("name, email")
      .order("name");

    if (error) {
      logger.error("Error fetching coaches:", error as Error, {
        component: "coaches",
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch coaches" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      coaches: coaches || [],
    });
  } catch (error) {
    logger.error("Error in GET /api/coaches:", error as Error, {
      component: "coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
