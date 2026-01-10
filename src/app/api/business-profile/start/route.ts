import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from '@/lib/logger'
import type {
  ApiResponse,
  StartInterviewResponse,
  BusinessProfile,
  InterviewPrompt,
} from "@/types/business-profile";

/**
 * POST /api/business-profile/start
 * Start or resume business profile interview
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<StartInterviewResponse>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get mode from request body (quick_start or full)
    const body = await request.json();
    const mode = body.mode === "quick_start" ? "quick_start" : "full";

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("business_profiles")
      .select("*")
      .eq("store_id", userId)
      .eq("is_current", true)
      .single();

    let profile: BusinessProfile;

    if (existingProfile) {
      // Resume existing profile
      profile = existingProfile as BusinessProfile;

      // Update status if not started
      if (profile.interview_status === "not_started") {
        const { data: updated } = await supabaseAdmin
          .from("business_profiles")
          .update({
            interview_status: "in_progress",
            interview_started_at: new Date().toISOString(),
            interview_mode: mode,
          })
          .eq("id", profile.id)
          .select()
          .single();

        if (updated) {
          profile = updated as BusinessProfile;
        }
      }
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("business_profiles")
        .insert({
          store_id: userId,
          interview_status: "in_progress",
          interview_started_at: new Date().toISOString(),
          interview_mode: mode,
        })
        .select()
        .single();

      if (createError) {
        logger.error("Error creating business profile:", createError as Error, { component: 'start' });
        return NextResponse.json(
          { success: false, error: "Failed to create business profile" },
          { status: 500 },
        );
      }

      profile = newProfile as BusinessProfile;
    }

    // Get first prompt based on mode
    let query = supabaseAdmin
      .from("interview_prompts")
      .select("*")
      .eq("is_active", true);

    if (mode === "quick_start") {
      query = query.eq("is_quick_start", true).order("quick_start_order", { ascending: true });
    } else {
      query = query.order("display_order", { ascending: true });
    }

    const { data: firstPrompt, error: promptError } = await query.limit(1).single();

    if (promptError || !firstPrompt) {
      logger.error("Error fetching first prompt:", promptError as Error, { component: 'start' });
      return NextResponse.json(
        { success: false, error: "Failed to fetch interview questions" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          profile,
          first_prompt: firstPrompt as InterviewPrompt,
          interview_mode: mode,
          total_questions: mode === "quick_start" ? 12 : 21,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error in POST /api/business-profile/start:", error as Error, { component: 'start' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
