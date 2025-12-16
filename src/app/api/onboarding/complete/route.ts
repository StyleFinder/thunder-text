import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";

/**
 * POST /api/onboarding/complete
 * Mark onboarding as completed for the current user
 *
 * Supports two auth methods:
 * 1. NextAuth session (for logged-in users via email/password)
 * 2. Bearer token / shop domain (for Shopify app context)
 */
export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;

    // First, try NextAuth session (for email/password login)
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      userId = session.user.id;
    }

    // Fallback to shop domain auth (for Shopify app context)
    if (!userId) {
      userId = await getUserId(request);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Update shop to mark onboarding as complete
    // Note: userId is the shop UUID (id), not the shop_domain
    const { data: shop, error: updateError } = await supabaseAdmin
      .from("shops")
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      logger.error(
        "Failed to mark onboarding complete:",
        updateError as Error,
        {
          component: "onboarding-complete",
          userId,
        },
      );
      return NextResponse.json(
        { success: false, error: "Failed to update onboarding status" },
        { status: 500 },
      );
    }

    logger.info("Onboarding completed successfully", {
      component: "onboarding-complete",
      userId,
      completedAt: shop.onboarding_completed_at,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          onboarding_completed: true,
          onboarding_completed_at: shop.onboarding_completed_at,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error in POST /api/onboarding/complete:", error as Error, {
      component: "onboarding-complete",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
