import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Helper to verify coach authentication
 *
 * SECURITY: Requires session-based auth and verifies user has coach role.
 * Coach email from session is used instead of trusting query params.
 */
async function authenticateCoach(): Promise<{
  authenticated: boolean;
  email?: string;
  error?: string;
  status?: number;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      authenticated: false,
      error: "Authentication required",
      status: 401,
    };
  }

  // SECURITY: Verify user has coach role
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "coach" && userRole !== "admin") {
    logger.warn("Non-coach user attempted to access coach favorites", {
      component: "coach-favorites",
      userId: session.user.id,
      role: userRole,
    });
    return {
      authenticated: false,
      error: "Coach access required",
      status: 403,
    };
  }

  // Use email from session, not from request params
  const email = session.user.email;
  if (!email) {
    return {
      authenticated: false,
      error: "No email associated with account",
      status: 403,
    };
  }

  return { authenticated: true, email };
}

/**
 * GET /api/coach/favorites
 *
 * Fetch coach's favorite stores
 *
 * SECURITY: Uses session-based authentication, coach email derived from session
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await authenticateCoach();
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // SECURITY: Use email from session, not from query params
    const { data, error } = await supabaseAdmin
      .from("coach_favorites")
      .select("shop_id")
      .eq("coach_email", auth.email);

    if (error) {
      logger.error("Error fetching favorites:", error as Error, {
        component: "favorites",
      });
      return NextResponse.json(
        { error: "Failed to fetch favorites" },
        { status: 500 },
      );
    }

    const favoriteShopIds = data.map((f) => f.shop_id);

    return NextResponse.json({
      success: true,
      favorites: favoriteShopIds,
    });
  } catch (error) {
    logger.error("Error in GET /api/coach/favorites:", error as Error, {
      component: "favorites",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/coach/favorites
 *
 * Add a store to favorites
 *
 * SECURITY: Uses session-based authentication, coach email derived from session
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateCoach();
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const body = await request.json();
    const { shop_id } = body;

    // Note: coach_email from body is ignored - we use session-derived email
    if (!shop_id) {
      return NextResponse.json(
        { error: "shop_id is required" },
        { status: 400 },
      );
    }

    // SECURITY: Verify shop exists before adding to favorites
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("id", shop_id)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin.from("coach_favorites").insert({
      coach_email: auth.email, // SECURITY: Use session-derived email
      shop_id,
    });

    if (error) {
      // Check if it's a unique constraint violation (already favorited)
      if (error.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "Store is already in favorites",
        });
      }

      logger.error("Error adding favorite:", error as Error, {
        component: "favorites",
      });
      return NextResponse.json(
        { error: "Failed to add favorite" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Store added to favorites",
    });
  } catch (error) {
    logger.error("Error in POST /api/coach/favorites:", error as Error, {
      component: "favorites",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/coach/favorites
 *
 * Remove a store from favorites
 *
 * SECURITY: Uses session-based authentication, coach email derived from session
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateCoach();
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");

    // Note: coach_email from query params is ignored - we use session-derived email
    if (!shopId) {
      return NextResponse.json(
        { error: "shop_id parameter is required" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("coach_favorites")
      .delete()
      .eq("coach_email", auth.email) // SECURITY: Use session-derived email
      .eq("shop_id", shopId);

    if (error) {
      logger.error("Error removing favorite:", error as Error, {
        component: "favorites",
      });
      return NextResponse.json(
        { error: "Failed to remove favorite" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Store removed from favorites",
    });
  } catch (error) {
    logger.error("Error in DELETE /api/coach/favorites:", error as Error, {
      component: "favorites",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
