import { requireAuth } from '@/lib/auth/ace-compat';

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from '@/lib/logger'

/**
 * DELETE /api/business-profile/writing-samples/[id]
 * Delete a writing sample
 */
export const DELETE = requireAuth('user')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("Authorization");
    const shopDomain = authHeader?.replace("Bearer ", "");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Authorization required" },
        { status: 401 }
      );
    }

    // Get shop
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Get the sample to verify ownership and get storage path
    const { data: sample, error: sampleError } = await supabaseAdmin
      .from("writing_samples")
      .select("id, storage_path")
      .eq("id", id)
      .eq("shop_id", shop.id)
      .single();

    if (sampleError || !sample) {
      return NextResponse.json(
        { success: false, error: "Sample not found" },
        { status: 404 }
      );
    }

    // Delete from storage
    if (sample.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("writing-samples")
        .remove([sample.storage_path]);

      if (storageError) {
        logger.error("Storage delete error:", storageError as Error, { component: '[id]' });
        // Continue anyway - we still want to delete the DB record
      }
    }

    // Delete database record
    const { error: deleteError } = await supabaseAdmin
      .from("writing_samples")
      .delete()
      .eq("id", id)
      .eq("shop_id", shop.id);

    if (deleteError) {
      logger.error("Database delete error:", deleteError as Error, { component: '[id]' });
      return NextResponse.json(
        { success: false, error: "Failed to delete sample" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sample deleted successfully"
    });
  } catch (error) {
    logger.error("Error deleting writing sample:", error as Error, { component: '[id]' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/business-profile/writing-samples/[id]
 * Get a specific writing sample's extracted text
 */
export const GET = requireAuth('user')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("Authorization");
    const shopDomain = authHeader?.replace("Bearer ", "");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Authorization required" },
        { status: 401 }
      );
    }

    // Get shop
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Get the sample
    const { data: sample, error: sampleError } = await supabaseAdmin
      .from("writing_samples")
      .select("id, file_name, file_type, file_size, extracted_text, created_at")
      .eq("id", id)
      .eq("shop_id", shop.id)
      .single();

    if (sampleError || !sample) {
      return NextResponse.json(
        { success: false, error: "Sample not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { sample }
    });
  } catch (error) {
    logger.error("Error fetching writing sample:", error as Error, { component: '[id]' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
