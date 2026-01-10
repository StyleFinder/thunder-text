import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import type {
  ApiResponse,
  GetBusinessProfileResponse,
  BusinessProfile,
  BusinessProfileResponse,
  ProfileProgress,
  InterviewPrompt,
} from "@/types/business-profile";

/**
 * Route segment config - standard JSON API limits
 * - 1MB body size limit for standard JSON payloads
 * - 30s timeout
 */
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * GET /api/business-profile
 * Get current business profile, responses, and progress for authenticated store
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<GetBusinessProfileResponse>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get or create business profile - direct table operations instead of RPC
    let profile: BusinessProfile | null = null;
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from("business_profiles")
      .select("*")
      .eq("store_id", userId)
      .eq("is_current", true)
      .maybeSingle();

    // If no profile exists, create one
    if (!existingProfile && !profileError) {
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("business_profiles")
        .insert({
          store_id: userId,
          interview_status: "not_started",
        })
        .select()
        .single();

      if (createError) {
        logger.error("Error creating profile:", createError as Error, {
          component: "business-profile",
        });
        return NextResponse.json(
          { success: false, error: "Failed to create business profile" },
          { status: 500 },
        );
      }

      profile = newProfile as BusinessProfile;
    } else {
      profile = existingProfile as BusinessProfile | null;
    }

    if (profileError || !profile) {
      logger.error("Error fetching business profile:", profileError as Error, {
        component: "business-profile",
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch business profile" },
        { status: 500 },
      );
    }

    // Get responses with prompt details if profile exists
    let responses: (BusinessProfileResponse & { prompt?: { question_text: string; question_number: number; prompt_key: string } | null })[] = [];
    if (profile) {
      const { data: responsesData, error: responsesError } = await supabaseAdmin
        .from("business_profile_responses")
        .select("*")
        .eq("business_profile_id", profile.id)
        .eq("is_current", true)
        .order("response_order", { ascending: true });

      if (!responsesError && responsesData) {
        // Fetch prompt details for each response
        const enrichedResponses = await Promise.all(
          responsesData.map(async (resp: BusinessProfileResponse) => {
            const { data: promptData } = await supabaseAdmin
              .from("interview_prompts")
              .select("question_text, question_number, prompt_key")
              .eq("prompt_key", resp.prompt_key)
              .single();

            return {
              ...resp,
              prompt: promptData,
            };
          }),
        );
        responses = enrichedResponses;
      }
    }

    // Calculate progress based on interview mode
    const questionsCompleted = responses.length;
    const totalQuestions = profile.interview_mode === "quick_start" ? 7 : 21;
    const percentageComplete = Math.round(
      (questionsCompleted / totalQuestions) * 100,
    );

    // Get next prompt if interview not complete
    let nextPrompt: InterviewPrompt | null = null;
    if (
      profile &&
      (profile.interview_status === "not_started" ||
        profile.interview_status === "in_progress") &&
      questionsCompleted < totalQuestions
    ) {
      // Get answered prompt keys
      const answeredKeys = responses.map((r) => r.prompt_key);

      // Get next unanswered prompt based on interview mode
      let query = supabaseAdmin
        .from("interview_prompts")
        .select("*")
        .eq("is_active", true);

      // Only add the NOT IN filter if there are answered questions
      if (answeredKeys.length > 0) {
        query = query.not("prompt_key", "in", `(${answeredKeys.join(",")})`);
      }

      // Filter by quick_start if in quick_start mode
      if (profile.interview_mode === "quick_start") {
        query = query
          .eq("is_quick_start", true)
          .order("quick_start_order", { ascending: true });
      } else {
        query = query.order("display_order", { ascending: true });
      }

      const { data: nextPromptData } = await query.limit(1).single();

      if (nextPromptData) {
        nextPrompt = nextPromptData as InterviewPrompt;
      }
    }

    const progress: ProfileProgress = {
      current_question: questionsCompleted,
      total_questions: totalQuestions,
      percentage_complete: percentageComplete,
      is_complete: questionsCompleted >= totalQuestions,
      next_prompt: nextPrompt,
    };

    return NextResponse.json({
      success: true,
      data: {
        profile: profile as BusinessProfile | null,
        responses,
        progress,
      },
    });
  } catch (error) {
    logger.error("Error in GET /api/business-profile:", error as Error, {
      component: "business-profile",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
