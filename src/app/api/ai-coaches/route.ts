/**
 * AI Coaches API - List Coaches
 *
 * GET /api/ai-coaches
 * Returns list of available coaches for the authenticated store
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import {
  getCoachTemplates,
  getActiveCoachInstances,
  hasPremiumAccess,
  getBrandProfileFields,
} from "@/lib/services/ai-coach-service";
import type {
  ApiResponse,
  ListCoachesResponse,
  CoachKey,
} from "@/types/ai-coaches";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-coaches
 * List all available coaches for the authenticated store
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ListCoachesResponse>>> {
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

    // Get coach templates, rendered instances, and profile completeness in parallel
    const [templates, instances, profileData] = await Promise.all([
      getCoachTemplates(),
      getActiveCoachInstances(userId),
      getBrandProfileFields(userId),
    ]);

    const instanceMap = new Map(instances.map((i) => [i.coach_key, i]));

    // Build response with render status
    const coaches = templates.map((template) => {
      const instance = instanceMap.get(template.coach_key);
      return {
        coach_key: template.coach_key as CoachKey,
        name: template.name,
        is_rendered: !!instance,
        conversation_starters: instance
          ? instance.rendered_conversation_starters
          : template.conversation_starters_template,
      };
    });

    logger.info("Listed coaches for store", {
      component: "ai-coaches",
      storeId: userId,
      coachCount: coaches.length,
      renderedCount: instances.length,
      profileComplete: profileData.isComplete,
      missingFields: profileData.missingFields,
    });

    return NextResponse.json({
      success: true,
      data: {
        coaches,
        profile_complete: profileData.isComplete,
        missing_fields: profileData.missingFields,
      },
    });
  } catch (error) {
    logger.error("Error listing coaches", error as Error, {
      component: "ai-coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
