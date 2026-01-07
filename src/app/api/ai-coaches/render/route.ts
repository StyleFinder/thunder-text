/**
 * AI Coaches API - Render
 *
 * POST /api/ai-coaches/render
 * Trigger re-rendering of coach instances for the authenticated store
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import { hasPremiumAccess } from "@/lib/services/ai-coach-service";
import { renderCoachInstances } from "@/lib/services/ai-coach-renderer";
import type { ApiResponse } from "@/types/ai-coaches";

export const maxDuration = 60; // Rendering may take time
export const dynamic = "force-dynamic";

interface RenderResponse {
  rendered_count: number;
  coaches: Array<{
    coach_key: string;
    name: string;
    template_version: number;
    profile_version: number;
  }>;
}

/**
 * POST /api/ai-coaches/render
 * Trigger re-rendering of all coach instances
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<RenderResponse>>> {
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

    // Render all coach instances
    const result = await renderCoachInstances(userId);

    logger.info("Rendered coach instances", {
      component: "ai-coaches",
      storeId: userId,
      renderedCount: result.renderedCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        rendered_count: result.renderedCount,
        coaches: result.coaches.map((coach) => ({
          coach_key: coach.coach_key,
          name: coach.coach_key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          template_version: coach.template_version,
          profile_version: coach.profile_version,
        })),
      },
    });
  } catch (error) {
    const err = error as Error;

    // Handle specific error types
    if (err.message?.includes("Business profile not found")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business profile not found. Complete the brand interview first.",
          code: "PROFILE_NOT_FOUND",
        },
        { status: 400 },
      );
    }

    if (err.message?.includes("Missing required")) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          code: "PROFILE_INCOMPLETE",
        },
        { status: 400 },
      );
    }

    logger.error("Error rendering coach instances", err, {
      component: "ai-coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
