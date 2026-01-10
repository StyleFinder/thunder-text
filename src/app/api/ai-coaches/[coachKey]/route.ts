/**
 * AI Coaches API - Coach Details
 *
 * GET /api/ai-coaches/[coachKey]
 * Returns details for a specific coach including rendered prompts
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import {
  requireCoachInstance,
  getConversationsForCoach,
  hasPremiumAccess,
} from "@/lib/services/ai-coach-service";
import { COACH_KEYS, CoachKey } from "@/types/ai-coaches";
import type { ApiResponse, AICoachInstance } from "@/types/ai-coaches";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

interface CoachDetailsResponse {
  coach: AICoachInstance;
  conversations: Array<{
    id: string;
    title: string | null;
    message_count: number;
    updated_at: string;
  }>;
}

/**
 * GET /api/ai-coaches/[coachKey]
 * Get details for a specific coach
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coachKey: string }> },
): Promise<NextResponse<ApiResponse<CoachDetailsResponse>>> {
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

    const { coachKey } = await params;

    // Validate coach key
    if (!COACH_KEYS.includes(coachKey as CoachKey)) {
      return NextResponse.json(
        { success: false, error: `Invalid coach key: ${coachKey}` },
        { status: 400 },
      );
    }

    // Get rendered coach instance
    const coachInstance = await requireCoachInstance(
      userId,
      coachKey as CoachKey,
    );

    // Get recent conversations for this coach
    const conversations = await getConversationsForCoach(
      userId,
      coachKey as CoachKey,
      10,
    );

    logger.info("Retrieved coach details", {
      component: "ai-coaches",
      storeId: userId,
      coachKey,
    });

    return NextResponse.json({
      success: true,
      data: {
        coach: coachInstance,
        conversations: conversations.map((c) => ({
          id: c.id,
          title: c.title,
          message_count: c.message_count,
          updated_at: c.updated_at,
        })),
      },
    });
  } catch (error) {
    const err = error as Error;

    // Handle specific error types
    if (err.message?.includes("Profile incomplete")) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          code: "PROFILE_INCOMPLETE",
        },
        { status: 400 },
      );
    }

    if (err.message?.includes("Coach not found")) {
      return NextResponse.json(
        { success: false, error: err.message, code: "COACH_NOT_FOUND" },
        { status: 404 },
      );
    }

    logger.error("Error getting coach details", err, {
      component: "ai-coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
