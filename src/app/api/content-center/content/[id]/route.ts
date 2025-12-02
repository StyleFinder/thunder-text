import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, GeneratedContent } from "@/types/content-center";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { withRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";
import { logger } from '@/lib/logger'

/**
 * GET /api/content-center/content/:id
 * Get a specific content piece
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<GeneratedContent>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Rate limiting for read operations
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.READ)(
      request,
      userId,
    );
    if (rateLimitCheck)
      return rateLimitCheck as NextResponse<ApiResponse<GeneratedContent>>;

    const { id } = await params;

    // Fetch content
    const { data: content, error } = await supabaseAdmin
      .from("generated_content")
      .select("*")
      .eq("id", id)
      .eq("store_id", userId)
      .single();

    if (error || !content) {
      return NextResponse.json(
        { success: false, error: "Content not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: content as GeneratedContent,
    });
  } catch (error) {
    logger.error("Error in GET /api/content-center/content/:id:", error as Error, { component: '[id]' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/content-center/content/:id
 * Update a content piece (e.g., save it to library)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<GeneratedContent>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Rate limiting for write operations
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.WRITE)(
      request,
      userId,
    );
    if (rateLimitCheck)
      return rateLimitCheck as NextResponse<ApiResponse<GeneratedContent>>;

    const { id } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedUpdates: Partial<GeneratedContent> = {};
    if (typeof body.is_saved === "boolean") {
      allowedUpdates.is_saved = body.is_saved;
    }
    if (typeof body.generated_text === "string") {
      allowedUpdates.generated_text = body.generated_text;
    }

    // Update content
    const { data: content, error } = await supabaseAdmin
      .from("generated_content")
      .update(allowedUpdates)
      .eq("id", id)
      .eq("store_id", userId)
      .select()
      .single();

    if (error || !content) {
      logger.error("Error updating content:", error as Error, { component: '[id]' });
      return NextResponse.json(
        { success: false, error: "Failed to update content" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: content as GeneratedContent,
    });
  } catch (error) {
    logger.error("Error in PATCH /api/content-center/content/:id:", error as Error, { component: '[id]' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/content-center/content/:id
 * Delete a content piece
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Rate limiting for write operations
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.WRITE)(
      request,
      userId,
    );
    if (rateLimitCheck)
      return rateLimitCheck as NextResponse<ApiResponse<{ deleted: boolean }>>;

    const { id } = await params;

    // Delete content (RLS will ensure user owns it)
    const { error } = await supabaseAdmin
      .from("generated_content")
      .delete()
      .eq("id", id)
      .eq("store_id", userId);

    if (error) {
      logger.error("Error deleting content:", error as Error, { component: '[id]' });
      return NextResponse.json(
        { success: false, error: "Failed to delete content" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    logger.error("Error in DELETE /api/content-center/content/:id:", error as Error, { component: '[id]' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
