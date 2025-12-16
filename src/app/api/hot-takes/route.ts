import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/hot-takes
 * Fetch active hot takes for store owners
 * Query params: limit (optional)
 *
 * SECURITY: GET is intentionally public - hot takes are meant to be displayed.
 * Only active hot takes are shown to unauthenticated users.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const includeInactive = searchParams.get("include_inactive") === "true";

    // SECURITY: Only authenticated coaches can view inactive hot takes
    if (includeInactive) {
      const session = await getServerSession(authOptions);
      const userRole = (session?.user as { role?: string })?.role;
      if (!session?.user || userRole !== "coach") {
        // Silently ignore include_inactive for non-coaches
      }
    }

    let query = supabaseAdmin
      .from("hot_takes")
      .select(
        "id, title, content, is_active, published_at, created_at, updated_at",
      )
      .order("published_at", { ascending: false });

    // Only filter for active if not including inactive (store owners see active only)
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: hotTakes, error } = await query;

    if (error) {
      console.error("[Hot Takes API] Error fetching hot takes:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch hot takes",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: hotTakes || [],
    });
  } catch (error) {
    console.error("[Hot Takes API] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/hot-takes
 * Create new hot take (coaches only)
 * Body: { title, content }
 *
 * SECURITY: Requires session authentication with coach role.
 * The hardcoded "coach-token" bypass has been REMOVED.
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require session authentication with coach role
    // REMOVED: Hardcoded "coach-token" bypass that allowed anyone to create hot takes
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      );
    }

    // SECURITY: Verify user has coach role
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "coach" && userRole !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Only coaches can create hot takes",
        },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, content } = body;

    // Validate required fields
    if (!title || !content || title.trim() === "" || content.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Title and content are required",
        },
        { status: 400 },
      );
    }

    // Create hot take
    const { data: hotTake, error } = await supabaseAdmin
      .from("hot_takes")
      .insert({
        title: title.trim(),
        content: content.trim(),
        is_active: true,
        published_at: new Date().toISOString(),
      })
      .select("id, title, content, is_active, published_at, created_at")
      .single();

    if (error) {
      console.error("[Hot Takes API] Error creating hot take:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create hot take: ${error.message}`,
          details: error.details || error.hint,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: hotTake,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Hot Takes API] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
