import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import type {
  ApiResponse,
  GetBusinessProfileResponse,
  BusinessProfile,
  BusinessProfileResponse,
  ProfileProgress,
  InterviewPrompt,
} from "@/types/business-profile";

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

    // Get current business profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("business_profiles")
      .select("*")
      .eq("store_id", userId)
      .eq("is_current", true)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 = no rows
      console.error("Error fetching business profile:", profileError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch business profile" },
        { status: 500 },
      );
    }

    // Get responses if profile exists
    let responses: BusinessProfileResponse[] = [];
    if (profile) {
      const { data: responsesData, error: responsesError } = await supabaseAdmin
        .from("business_profile_responses")
        .select("*")
        .eq("business_profile_id", profile.id)
        .eq("is_current", true)
        .order("response_order", { ascending: true });

      if (!responsesError && responsesData) {
        responses = responsesData as BusinessProfileResponse[];
      }
    }

    // Calculate progress
    const questionsCompleted = responses.length;
    const totalQuestions = 21;
    const percentageComplete = Math.round(
      (questionsCompleted / totalQuestions) * 100,
    );

    // Get next prompt if interview not complete
    let nextPrompt: InterviewPrompt | null = null;
    if (
      profile &&
      profile.interview_status === "in_progress" &&
      questionsCompleted < totalQuestions
    ) {
      // Get answered prompt keys
      const answeredKeys = responses.map((r) => r.prompt_key);

      // Get next unanswered prompt
      const { data: nextPromptData } = await supabaseAdmin
        .from("interview_prompts")
        .select("*")
        .eq("is_active", true)
        .not("prompt_key", "in", `(${answeredKeys.join(",")})`)
        .order("display_order", { ascending: true })
        .limit(1)
        .single();

      if (nextPromptData) {
        nextPrompt = nextPromptData as InterviewPrompt;
      }
    }

    const progress: ProfileProgress = {
      current_question: questionsCompleted + 1,
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
    console.error("Error in GET /api/business-profile:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
