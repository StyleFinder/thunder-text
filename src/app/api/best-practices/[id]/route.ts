/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/ace-compat";
import { logger } from "@/lib/logger";

// GET - Get single best practice
export const GET = requireAuth("user")(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const { data: practice, error } = await supabaseAdmin
      .from("aie_best_practices")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error("Error fetching best practice", new Error(error.message), {
        component: "best-practices-id-api",
        operation: "GET",
        id,
        errorCode: error.code,
      });
      return NextResponse.json(
        { error: "Best practice not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ practice });
  } catch (error) {
    logger.error("Error in best practice GET", error as Error, {
      component: "best-practices-id-api",
      operation: "GET",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

// PATCH - Update best practice metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "title",
      "description",
      "platform",
      "category",
      "priority_score",
      "extracted_text",
      "is_active",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: practice, error } = await supabaseAdmin
      .from("aie_best_practices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating best practice", new Error(error.message), {
        component: "best-practices-id-api",
        operation: "PATCH",
        id,
        errorCode: error.code,
      });
      return NextResponse.json(
        { error: "Failed to update best practice" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      practice,
      message: "Resource updated successfully",
    });
  } catch (error) {
    logger.error("Error in best practice PATCH", error as Error, {
      component: "best-practices-id-api",
      operation: "PATCH",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Delete best practice (soft delete by default)
export const DELETE = requireAuth("user")(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const hardDelete = url.searchParams.get("hard") === "true";

    if (hardDelete) {
      // Hard delete: Remove file from storage and database
      // First get the file info
      const { data: practice, error: fetchError } = await supabaseAdmin
        .from("aie_best_practices")
        .select("file_url")
        .eq("id", id)
        .single();

      if (fetchError) {
        return NextResponse.json(
          { error: "Resource not found" },
          { status: 404 },
        );
      }

      // Extract file path from URL
      const fileUrl = practice.file_url;
      const bucketUrl = supabaseAdmin.storage
        .from("aie-best-practices")
        .getPublicUrl("").data.publicUrl;
      const filePath = fileUrl.replace(bucketUrl + "/", "");

      // Delete from storage
      const { error: storageError } = await supabaseAdmin.storage
        .from("aie-best-practices")
        .remove([filePath]);

      if (storageError) {
        logger.error(
          "Error deleting file from storage",
          new Error(storageError.message),
          {
            component: "best-practices-id-api",
            operation: "DELETE-hardDelete",
            id,
            filePath,
          },
        );
        // Continue anyway to delete DB record
      }

      // Delete from database
      const { error: deleteError } = await supabaseAdmin
        .from("aie_best_practices")
        .delete()
        .eq("id", id);

      if (deleteError) {
        logger.error(
          "Error deleting best practice",
          new Error(deleteError.message),
          {
            component: "best-practices-id-api",
            operation: "DELETE-hardDelete",
            id,
            errorCode: deleteError.code,
          },
        );
        return NextResponse.json(
          { error: "Failed to delete resource" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: "Resource permanently deleted",
      });
    } else {
      // Soft delete: Just mark as inactive
      const { data: practice, error } = await supabaseAdmin
        .from("aie_best_practices")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error(
          "Error deactivating best practice",
          new Error(error.message),
          {
            component: "best-practices-id-api",
            operation: "DELETE-softDelete",
            id,
            errorCode: error.code,
          },
        );
        return NextResponse.json(
          { error: "Failed to deactivate resource" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        practice,
        message: "Resource deactivated successfully",
      });
    }
  } catch (error) {
    logger.error("Error in best practice DELETE", error as Error, {
      component: "best-practices-id-api",
      operation: "DELETE",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
