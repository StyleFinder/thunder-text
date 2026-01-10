import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import {
  OnboardingProgress,
  OnboardingStep,
  ONBOARDING_STEPS,
} from "@/types/onboarding";

/**
 * GET /api/onboarding/progress
 * Get current onboarding progress for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;

    // First, try NextAuth session
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      userId = session.user.id;
    }

    // Fallback to shop domain auth
    if (!userId) {
      userId = await getUserId(request);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.info("[Onboarding Progress] Looking up shop progress", {
      component: "onboarding-progress",
      userId,
    });

    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select(
        `id,
         onboarding_step,
         shop_profile_completed,
         voice_profile_completed,
         business_profile_completed,
         onboarding_completed`
      )
      .eq("id", userId)
      .single();

    if (shopError || !shop) {
      logger.error("Failed to fetch shop onboarding progress:", shopError as Error, {
        component: "onboarding-progress",
        userId,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    const progress: OnboardingProgress = {
      currentStep: (shop.onboarding_step ?? 0) as OnboardingStep,
      shopProfileCompleted: shop.shop_profile_completed ?? false,
      voiceProfileCompleted: shop.voice_profile_completed ?? false,
      businessProfileCompleted: shop.business_profile_completed ?? false,
      onboardingCompleted: shop.onboarding_completed ?? false,
    };

    logger.info("[Onboarding Progress] Progress retrieved", {
      component: "onboarding-progress",
      userId,
      progress,
    });

    return NextResponse.json(
      {
        success: true,
        data: progress,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in GET /api/onboarding/progress:", error as Error, {
      component: "onboarding-progress",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/onboarding/progress
 * Update onboarding progress for the authenticated user
 */
export async function PATCH(request: NextRequest) {
  try {
    let userId: string | null = null;

    // First, try NextAuth session
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      userId = session.user.id;
    }

    // Fallback to shop domain auth
    if (!userId) {
      userId = await getUserId(request);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      step,
      shopProfileCompleted,
      voiceProfileCompleted,
      businessProfileCompleted,
    } = body;

    logger.info("[Onboarding Progress] Updating progress", {
      component: "onboarding-progress",
      userId,
      updates: body,
    });

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (typeof step === "number" && step >= 0 && step <= ONBOARDING_STEPS.COMPLETE) {
      updateData.onboarding_step = step;
    }

    if (typeof shopProfileCompleted === "boolean") {
      updateData.shop_profile_completed = shopProfileCompleted;
    }

    if (typeof voiceProfileCompleted === "boolean") {
      updateData.voice_profile_completed = voiceProfileCompleted;
    }

    if (typeof businessProfileCompleted === "boolean") {
      updateData.business_profile_completed = businessProfileCompleted;
    }

    // Check if all steps are complete to set onboarding_completed
    if (
      shopProfileCompleted === true ||
      voiceProfileCompleted === true ||
      businessProfileCompleted === true
    ) {
      // Fetch current state to check completion
      const { data: currentShop } = await supabaseAdmin
        .from("shops")
        .select("shop_profile_completed, voice_profile_completed, business_profile_completed")
        .eq("id", userId)
        .single();

      if (currentShop) {
        const willBeComplete =
          (shopProfileCompleted ?? currentShop.shop_profile_completed) &&
          (voiceProfileCompleted ?? currentShop.voice_profile_completed) &&
          (businessProfileCompleted ?? currentShop.business_profile_completed);

        if (willBeComplete) {
          updateData.onboarding_completed = true;
          updateData.onboarding_completed_at = new Date().toISOString();
          updateData.onboarding_step = ONBOARDING_STEPS.COMPLETE;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updatedShop, error: updateError } = await supabaseAdmin
      .from("shops")
      .update(updateData)
      .eq("id", userId)
      .select(
        `id,
         onboarding_step,
         shop_profile_completed,
         voice_profile_completed,
         business_profile_completed,
         onboarding_completed`
      )
      .single();

    if (updateError) {
      logger.error("Failed to update onboarding progress:", updateError as Error, {
        component: "onboarding-progress",
        userId,
      });
      return NextResponse.json(
        { success: false, error: "Failed to update progress" },
        { status: 500 }
      );
    }

    const progress: OnboardingProgress = {
      currentStep: (updatedShop.onboarding_step ?? 0) as OnboardingStep,
      shopProfileCompleted: updatedShop.shop_profile_completed ?? false,
      voiceProfileCompleted: updatedShop.voice_profile_completed ?? false,
      businessProfileCompleted: updatedShop.business_profile_completed ?? false,
      onboardingCompleted: updatedShop.onboarding_completed ?? false,
    };

    logger.info("[Onboarding Progress] Progress updated", {
      component: "onboarding-progress",
      userId,
      progress,
    });

    return NextResponse.json(
      {
        success: true,
        data: progress,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in PATCH /api/onboarding/progress:", error as Error, {
      component: "onboarding-progress",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
