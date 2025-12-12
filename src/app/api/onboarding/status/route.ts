import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";

export interface OnboardingStatus {
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  user_type: 'store' | 'coach';
  shop_domain: string;
}

/**
 * GET /api/onboarding/status
 * Check if user has completed onboarding
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get shop data including onboarding status
    // Note: userId from getUserId() is actually the shop UUID (id), not the shop_domain
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("shop_domain, onboarding_completed, onboarding_completed_at, user_type")
      .eq("id", userId)
      .single();

    if (shopError || !shop) {
      logger.error("Failed to fetch shop onboarding status:", shopError as Error, {
        component: "onboarding-status",
        userId,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    const status: OnboardingStatus = {
      onboarding_completed: shop.onboarding_completed ?? false,
      onboarding_completed_at: shop.onboarding_completed_at,
      user_type: shop.user_type ?? 'store',
      shop_domain: shop.shop_domain,
    };

    return NextResponse.json(
      {
        success: true,
        data: status,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error in GET /api/onboarding/status:", error as Error, {
      component: "onboarding-status",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
