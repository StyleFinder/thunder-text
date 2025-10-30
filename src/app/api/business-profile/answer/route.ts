import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import type {
  ApiResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  BusinessProfileResponse,
  InterviewPrompt,
  ProfileProgress,
} from "@/types/business-profile";

/**
 * POST /api/business-profile/answer
 * Submit answer to interview question
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SubmitAnswerResponse>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: SubmitAnswerRequest = await request.json();
    const { prompt_key, question_number, response_text } = body;

    if (!prompt_key || !response_text || response_text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("business_profiles")
      .select("*")
      .eq("store_id", userId)
      .eq("is_current", true)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business profile not found. Please start the interview first.",
        },
        { status: 404 },
      );
    }

    // Get the prompt to validate
    const { data: prompt } = await supabaseAdmin
      .from("interview_prompts")
      .select("*")
      .eq("prompt_key", prompt_key)
      .single();

    if (prompt) {
      const wordCount = response_text.trim().split(/\s+/).length;
      if (wordCount < prompt.min_words) {
        return NextResponse.json(
          {
            success: false,
            error: `Response too short: ${wordCount} words (minimum ${prompt.min_words} required)`,
          },
          { status: 400 },
        );
      }
    }

    // Mark any existing response for this prompt as not current
    await supabaseAdmin
      .from("business_profile_responses")
      .update({ is_current: false })
      .eq("business_profile_id", profile.id)
      .eq("prompt_key", prompt_key);

    // Get current response count for order
    const { data: existingResponses } = await supabaseAdmin
      .from("business_profile_responses")
      .select("response_order")
      .eq("business_profile_id", profile.id)
      .order("response_order", { ascending: false })
      .limit(1);

    const nextOrder =
      existingResponses && existingResponses.length > 0
        ? existingResponses[0].response_order + 1
        : 1;

    // Calculate word and character counts
    const wordCount = response_text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const characterCount = response_text.length;

    // Insert new response using RPC function with ALPHABETICAL parameter order
    // Using save_profile_response (new function name to bypass PostgREST cache)
    const { data: newResponse, error: responseError } = await supabaseAdmin
      .rpc("save_profile_response", {
        p_business_profile_id: profile.id,
        p_character_count: characterCount,
        p_is_current: true,
        p_original_response: response_text,
        p_prompt_key: prompt_key,
        p_question_number: question_number,
        p_response_order: nextOrder,
        p_response_text: response_text,
        p_word_count: wordCount,
      })
      .single();

    if (responseError) {
      console.error("❌ Error saving response:", {
        error: responseError,
        code: responseError.code,
        message: responseError.message,
        details: responseError.details,
        hint: responseError.hint,
      });
      return NextResponse.json(
        { success: false, error: "Failed to save response" },
        { status: 500 },
      );
    }

    // Update profile status to in_progress if this is the first answer
    if (profile.interview_status === "not_started") {
      await supabaseAdmin
        .from("business_profiles")
        .update({
          interview_status: "in_progress",
          interview_started_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }

    // Update profile progress - direct table operation instead of RPC
    const { data: allResponses } = await supabaseAdmin
      .from("business_profile_responses")
      .select("prompt_key")
      .eq("business_profile_id", profile.id)
      .eq("is_current", true);

    const questionsCompleted = allResponses?.length || 0;
    const totalQuestions = 21;
    const percentageComplete = Math.round(
      (questionsCompleted / totalQuestions) * 100,
    );
    const interviewComplete = questionsCompleted >= totalQuestions;

    // Update profile with progress (replaces update_interview_progress RPC)
    await supabaseAdmin
      .from("business_profiles")
      .update({
        questions_completed: questionsCompleted,
        current_question_number: questionsCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    // Get next prompt if not complete
    let nextPrompt: InterviewPrompt | null = null;
    if (!interviewComplete) {
      const answeredKeys = allResponses?.map((r) => r.prompt_key) || [];

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
    } else {
      // Mark interview as completed
      await supabaseAdmin
        .from("business_profiles")
        .update({
          interview_completed_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }

    const progress: ProfileProgress = {
      current_question: questionsCompleted + 1,
      total_questions: totalQuestions,
      percentage_complete: percentageComplete,
      is_complete: interviewComplete,
      next_prompt: nextPrompt,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          response: newResponse as BusinessProfileResponse,
          progress,
          next_prompt: nextPrompt,
          interview_complete: interviewComplete,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/business-profile/answer:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
