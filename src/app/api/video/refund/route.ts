/**
 * Video Refund API Route
 *
 * POST /api/video/refund
 * Request a refund for a poor quality video generation
 *
 * Implements the "generous refund" policy:
 * - Instant credit refund (no manual review)
 * - Capped at 3 refunds per 24 hours to prevent abuse
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RefundRequest {
  generationId: string;
  reason?: string;
}

interface RefundResponse {
  success: boolean;
  data?: {
    refunded: boolean;
    creditsRefunded: number;
    newBalance: number;
    refundsRemaining: number;
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<RefundResponse>> {
  try {
    // 1. Authenticate
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Parse request
    const body: RefundRequest = await request.json();

    if (!body.generationId) {
      return NextResponse.json(
        { success: false, error: "Missing generation ID" },
        { status: 400 },
      );
    }

    const reason = body.reason || "User reported poor quality";

    // 3. Verify generation exists and belongs to user
    const { data: generation, error: fetchError } = await supabaseAdmin
      .from("video_generations")
      .select("id, status, credits_used")
      .eq("id", body.generationId)
      .eq("shop_id", userId)
      .single();

    if (fetchError || !generation) {
      return NextResponse.json(
        { success: false, error: "Generation not found" },
        { status: 404 },
      );
    }

    // 4. Check if already refunded
    if (generation.status === "refunded") {
      return NextResponse.json(
        { success: false, error: "This generation has already been refunded" },
        { status: 409 },
      );
    }

    // 5. Check if eligible for refund (only completed or failed)
    if (generation.status !== "completed" && generation.status !== "failed") {
      return NextResponse.json(
        {
          success: false,
          error: "Only completed or failed generations can be refunded",
        },
        { status: 400 },
      );
    }

    // 6. Check refund limits
    const { data: credits } = await supabaseAdmin
      .from("video_credits")
      .select("refunds_today, refunds_reset_at")
      .eq("shop_id", userId)
      .single();

    if (credits) {
      const today = new Date().toISOString().split("T")[0];
      const resetAt = credits.refunds_reset_at;
      const refundsToday = resetAt === today ? credits.refunds_today : 0;

      if (refundsToday >= 3) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Daily refund limit reached (3 per day). Try again tomorrow.",
          },
          { status: 429 },
        );
      }
    }

    // 7. Process refund using database function
    const { data: refundResult, error: refundError } = await supabaseAdmin.rpc(
      "refund_video_credit",
      {
        p_shop_id: userId,
        p_video_generation_id: body.generationId,
        p_reason: reason,
      },
    );

    if (refundError || !refundResult) {
      logger.error("Refund failed", refundError as Error, {
        component: "video-refund",
        shopId: userId,
        generationId: body.generationId,
      });
      return NextResponse.json(
        { success: false, error: "Failed to process refund" },
        { status: 500 },
      );
    }

    // 8. Get updated balance and refund count
    const { data: updatedCredits } = await supabaseAdmin
      .from("video_credits")
      .select("balance, refunds_today")
      .eq("shop_id", userId)
      .single();

    const newBalance = updatedCredits?.balance ?? 0;
    const refundsToday = updatedCredits?.refunds_today ?? 0;
    const refundsRemaining = Math.max(0, 3 - refundsToday);

    logger.info("Video refund processed", {
      component: "video-refund",
      shopId: userId,
      generationId: body.generationId,
      creditsRefunded: generation.credits_used,
      newBalance,
      refundsRemaining,
    });

    return NextResponse.json({
      success: true,
      data: {
        refunded: true,
        creditsRefunded: generation.credits_used,
        newBalance,
        refundsRemaining,
      },
    });
  } catch (error) {
    logger.error("Refund error", error as Error, {
      component: "video-refund",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
