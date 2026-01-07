/**
 * AI Coaches API - Brand Profile
 *
 * GET /api/ai-coaches/brand-profile
 * Get coach-specific brand profile fields
 *
 * PATCH /api/ai-coaches/brand-profile
 * Update coach-specific brand profile fields
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import {
  getBrandProfileFields,
  updateBrandProfileFields,
  hasPremiumAccess,
} from "@/lib/services/ai-coach-service";
import type { ApiResponse, CoachBrandProfileFields } from "@/types/ai-coaches";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

interface GetBrandProfileData {
  profile: Partial<CoachBrandProfileFields>;
  is_complete: boolean;
  missing_fields: string[];
}

/**
 * GET /api/ai-coaches/brand-profile
 * Get coach-specific brand profile fields for the authenticated store
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<GetBrandProfileData>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check premium access
    const isPremium = await hasPremiumAccess(userId);
    if (!isPremium) {
      return NextResponse.json(
        {
          success: false,
          error: "AI Coaches require a Pro plan",
        },
        { status: 403 },
      );
    }

    const { profile, isComplete, missingFields } =
      await getBrandProfileFields(userId);

    logger.info("Retrieved brand profile", {
      component: "ai-coaches",
      storeId: userId,
      isComplete,
    });

    return NextResponse.json({
      success: true,
      data: {
        profile,
        is_complete: isComplete,
        missing_fields: missingFields,
      },
    });
  } catch (error) {
    logger.error("Error getting brand profile", error as Error, {
      component: "ai-coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/ai-coaches/brand-profile
 * Update coach-specific brand profile fields
 */
export async function PATCH(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ updated: boolean; version: number }>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check premium access
    const isPremium = await hasPremiumAccess(userId);
    if (!isPremium) {
      return NextResponse.json(
        {
          success: false,
          error: "AI Coaches require a Pro plan",
        },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();

    // Allowed fields to update
    const allowedFields = [
      "discount_comfort_level",
      "return_policy_summary",
      "shipping_policy_summary",
      "inventory_size",
      "owner_time_constraint",
      "primary_goal_this_quarter",
    ];

    // Filter to only allowed fields
    const updates: Partial<CoachBrandProfileFields> = {};
    for (const field of allowedFields) {
      if (field in body) {
        // eslint-disable-next-line security/detect-object-injection
        (updates as Record<string, unknown>)[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Validate enum fields
    if (
      updates.discount_comfort_level &&
      !["low", "moderate", "aggressive"].includes(
        updates.discount_comfort_level,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid discount_comfort_level. Must be: low, moderate, or aggressive",
        },
        { status: 400 },
      );
    }

    if (
      updates.inventory_size &&
      !["small", "medium", "large"].includes(updates.inventory_size)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid inventory_size. Must be: small, medium, or large",
        },
        { status: 400 },
      );
    }

    if (
      updates.owner_time_constraint &&
      !["very_limited", "moderate", "flexible"].includes(
        updates.owner_time_constraint,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid owner_time_constraint. Must be: very_limited, moderate, or flexible",
        },
        { status: 400 },
      );
    }

    // Update the profile
    const result = await updateBrandProfileFields(userId, updates);

    logger.info("Updated brand profile", {
      component: "ai-coaches",
      storeId: userId,
      fields: Object.keys(updates),
      newVersion: result.version,
    });

    return NextResponse.json({
      success: true,
      data: {
        updated: true,
        version: result.version,
      },
    });
  } catch (error) {
    logger.error("Error updating brand profile", error as Error, {
      component: "ai-coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
