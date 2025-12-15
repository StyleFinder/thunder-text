import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * PATCH /api/hot-takes/:id
 * Update hot take (deactivate) - coaches only
 * Body: { is_active }
 *
 * SECURITY: Requires session authentication with coach role.
 * The hardcoded "coach-token" bypass has been REMOVED.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // SECURITY: Require session authentication with coach role
    // REMOVED: Hardcoded "coach-token" bypass
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
          error: "Only coaches can update hot takes",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { is_active, title, content } = body;

    // Build update object based on what fields are provided
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    if (content !== undefined) {
      updateData.content = content;
    }

    // Update hot take
    const { data: hotTake, error } = await supabaseAdmin
      .from("hot_takes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Hot take not found",
          },
          { status: 404 },
        );
      }

      console.error("[Hot Takes API] Error updating hot take:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update hot take",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: hotTake,
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
 * DELETE /api/hot-takes/:id
 * Delete hot take - coaches only
 *
 * SECURITY: Requires session authentication with coach role.
 * The hardcoded "coach-token" bypass has been REMOVED.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // SECURITY: Require session authentication with coach role
    // REMOVED: Hardcoded "coach-token" bypass
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
          error: "Only coaches can delete hot takes",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Delete hot take
    const { error } = await supabaseAdmin
      .from("hot_takes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Hot Takes API] Error deleting hot take:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete hot take",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Hot take deleted successfully",
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
