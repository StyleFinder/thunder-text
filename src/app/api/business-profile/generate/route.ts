import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import { generateMasterBusinessProfile } from "@/lib/services/business-profile-generator";
import type {
  ApiResponse,
  GenerateProfileResponse,
  BusinessProfile,
} from "@/types/business-profile";

/**
 * POST /api/business-profile/generate
 * Generate master business profile from interview responses
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<GenerateProfileResponse>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
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
        { success: false, error: "Business profile not found" },
        { status: 404 },
      );
    }

    // Get all responses
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from("business_profile_responses")
      .select("*")
      .eq("business_profile_id", profile.id)
      .eq("is_current", true)
      .order("question_number", { ascending: true });

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch interview responses" },
        { status: 500 },
      );
    }

    // Validate all 21 questions answered
    if (!responses || responses.length < 21) {
      return NextResponse.json(
        {
          success: false,
          error: `Interview incomplete: ${responses?.length || 0}/21 questions answered`,
        },
        { status: 400 },
      );
    }

    // Generate master business profile using AI service
    console.log(`Generating master business profile for store ${userId}...`);

    const { masterProfile, generationMetadata } =
      await generateMasterBusinessProfile(responses);

    // Update profile with all generated documents
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("business_profiles")
      .update({
        // Store complete master profile as JSON
        master_profile_text: JSON.stringify(masterProfile),

        // Store individual documents for easy access
        profile_summary: masterProfile.profileSummary,
        market_research: masterProfile.marketResearch,
        ideal_customer_avatar: masterProfile.idealCustomerAvatar,
        pain_point_strategy: masterProfile.painPointStrategy,
        mission_vision_values: masterProfile.missionVisionValues,
        positioning_statement: masterProfile.positioningStatement,
        ai_engine_instructions: masterProfile.aiEngineInstructions,

        // Update status and metadata
        interview_status: "completed",
        profile_generated_at: new Date().toISOString(),
        last_generated_at: new Date().toISOString(),
        generation_time_ms: generationMetadata.generationTimeMs,
        generation_tokens_used: generationMetadata.totalTokensUsed,
        profile_version: profile.profile_version + 1,
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to save generated profile" },
        { status: 500 },
      );
    }

    console.log(`✅ Profile generated successfully:
      - Stages completed: ${generationMetadata.stagesCompleted}/7
      - Tokens used: ${generationMetadata.totalTokensUsed}
      - Time: ${generationMetadata.generationTimeMs}ms`);

    // Save generation history for audit trail
    await supabaseAdmin.from("profile_generation_history").insert({
      business_profile_id: profile.id,
      profile_version: profile.profile_version + 1,
      master_profile_text: JSON.stringify(masterProfile),
      model_used: "gpt-4o",
      generation_time_ms: generationMetadata.generationTimeMs,
      tokens_used: generationMetadata.totalTokensUsed,
      profile_word_count: masterProfile.profileSummary.split(/\s+/).length,
      validation_passed: true,
      validation_issues: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          profile: updatedProfile as BusinessProfile,
          generation_time_ms: generationMetadata.generationTimeMs,
          tokens_used: generationMetadata.totalTokensUsed,
          validation_passed: true,
          validation_issues: [],
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in POST /api/business-profile/generate:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
