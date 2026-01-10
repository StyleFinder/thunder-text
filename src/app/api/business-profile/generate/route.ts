import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import { generateMasterBusinessProfile } from "@/lib/services/business-profile-generator";
import { logger } from "@/lib/logger";
import { alertAuditFailure } from "@/lib/alerting/critical-alerts";
import type {
  ApiResponse,
  GenerateProfileResponse,
  BusinessProfile,
  BusinessProfileResponse,
} from "@/types/business-profile";

// ============================================================================
// COACH PROFILE FIELD PARSING
// ============================================================================

type DiscountComfortLevel = "low" | "moderate" | "aggressive";
type InventorySize = "small" | "medium" | "large";
type OwnerTimeConstraint = "very_limited" | "moderate" | "flexible";

interface CoachProfileFields {
  discount_comfort_level: DiscountComfortLevel | null;
  inventory_size: InventorySize | null;
  owner_time_constraint: OwnerTimeConstraint | null;
  primary_goal_this_quarter: string | null;
  return_policy_summary: string | null;
  shipping_policy_summary: string | null;
}

/**
 * Parse discount comfort response into enum value
 * Keywords: "rarely/never" → low, "sometimes/occasionally" → moderate, "often/frequently/aggressive" → aggressive
 */
function parseDiscountComfort(text: string): DiscountComfortLevel {
  const lower = text.toLowerCase();

  if (/\b(rarely|never|seldom|avoid|don'?t|do not|hate|against|no discount|full price|premium)\b/.test(lower)) {
    return "low";
  }
  if (/\b(often|frequently|aggressive|love|always|regular|weekly|constant|heavy)\b/.test(lower)) {
    return "aggressive";
  }
  // Default to moderate for "sometimes", "occasionally", or unclear responses
  return "moderate";
}

/**
 * Parse inventory size response into enum value
 * Keywords: "small/<100" → small, "medium/100-500" → medium, "large/>500" → large
 */
function parseInventorySize(text: string): InventorySize {
  const lower = text.toLowerCase();

  // Check for explicit numbers
  const numberMatch = text.match(/(\d+)/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10);
    if (num < 100) return "small";
    if (num <= 500) return "medium";
    return "large";
  }

  // Check keywords
  if (/\b(small|tiny|limited|few|minimal|handful|dozen|boutique|curated)\b/.test(lower)) {
    return "small";
  }
  if (/\b(large|big|extensive|huge|vast|thousands|massive|wide)\b/.test(lower)) {
    return "large";
  }
  // Default to medium
  return "medium";
}

/**
 * Parse time availability response into enum value
 * Keywords: "little/few hours" → very_limited, "some/half" → moderate, "full/flexible" → flexible
 */
function parseTimeAvailability(text: string): OwnerTimeConstraint {
  const lower = text.toLowerCase();

  // Check for hour mentions
  const hourMatch = text.match(/(\d+)\s*(?:hour|hr)/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    if (hours <= 2) return "very_limited";
    if (hours <= 5) return "moderate";
    return "flexible";
  }

  // Check keywords
  if (/\b(very limited|little|few|barely|minimal|side hustle|part.?time|busy|overwhelmed|no time)\b/.test(lower)) {
    return "very_limited";
  }
  if (/\b(full|flexible|plenty|lots|all day|full.?time|dedicated|anytime|whenever)\b/.test(lower)) {
    return "flexible";
  }
  // Default to moderate
  return "moderate";
}

/**
 * Parse policies response, attempting to split into return and shipping summaries
 */
function parsePolicies(text: string): { return_policy: string | null; shipping_policy: string | null } {
  const lower = text.toLowerCase();

  // Try to find distinct sections
  // Using [\s\S] instead of . with 's' flag for cross-line matching
  const returnMatch = text.match(/return[s]?[:\s]*([\s\S]*?)(?=ship|$)/i);
  const shippingMatch = text.match(/ship(?:ping)?[:\s]*([\s\S]*?)(?=return|$)/i);

  if (returnMatch && shippingMatch) {
    return {
      return_policy: returnMatch[1].trim() || null,
      shipping_policy: shippingMatch[1].trim() || null,
    };
  }

  // If we can't split, check which topic the text is more about
  const hasReturn = /\breturn|refund|exchange\b/i.test(lower);
  const hasShipping = /\bship|deliver|freight\b/i.test(lower);

  if (hasReturn && !hasShipping) {
    return { return_policy: text, shipping_policy: null };
  }
  if (hasShipping && !hasReturn) {
    return { return_policy: null, shipping_policy: text };
  }

  // If both or neither, store in both fields
  return { return_policy: text, shipping_policy: text };
}

/**
 * Extract coach profile fields from interview responses
 */
function extractCoachProfileFields(responses: BusinessProfileResponse[]): CoachProfileFields {
  const fields: CoachProfileFields = {
    discount_comfort_level: null,
    inventory_size: null,
    owner_time_constraint: null,
    primary_goal_this_quarter: null,
    return_policy_summary: null,
    shipping_policy_summary: null,
  };

  for (const response of responses) {
    const text = response.response_text?.trim();
    if (!text) continue;

    switch (response.prompt_key) {
      case "discount_comfort":
        fields.discount_comfort_level = parseDiscountComfort(text);
        break;
      case "inventory_size":
        fields.inventory_size = parseInventorySize(text);
        break;
      case "time_availability":
        fields.owner_time_constraint = parseTimeAvailability(text);
        break;
      case "quarterly_goal":
        fields.primary_goal_this_quarter = text;
        break;
      case "policies_summary": {
        const policies = parsePolicies(text);
        fields.return_policy_summary = policies.return_policy;
        fields.shipping_policy_summary = policies.shipping_policy;
        break;
      }
    }
  }

  return fields;
}

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
      logger.error("Error fetching responses", responsesError as Error, {
        component: "business-profile-generate",
        operation: "POST-fetchResponses",
        profileId: profile.id,
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch interview responses" },
        { status: 500 },
      );
    }

    // Validate all questions answered based on interview mode
    // Quick Start: 12 questions (7 original + 5 AI coaching)
    // Full: 21 questions
    const expectedQuestions = profile.interview_mode === "quick_start" ? 12 : 21;
    if (!responses || responses.length < expectedQuestions) {
      return NextResponse.json(
        {
          success: false,
          error: `Interview incomplete: ${responses?.length || 0}/${expectedQuestions} questions answered`,
        },
        { status: 400 },
      );
    }

    // Generate master business profile using AI service
    logger.info("Generating master business profile", {
      component: "business-profile-generate",
      storeId: userId,
    });

    const { masterProfile, generationMetadata } =
      await generateMasterBusinessProfile(responses);

    // Extract coach profile fields from AI coaching questions
    const coachFields = extractCoachProfileFields(responses);

    logger.info("Extracted coach profile fields", {
      component: "business-profile-generate",
      storeId: userId,
      coachFields: {
        discount_comfort_level: coachFields.discount_comfort_level,
        inventory_size: coachFields.inventory_size,
        owner_time_constraint: coachFields.owner_time_constraint,
        has_quarterly_goal: !!coachFields.primary_goal_this_quarter,
        has_return_policy: !!coachFields.return_policy_summary,
        has_shipping_policy: !!coachFields.shipping_policy_summary,
      },
    });

    // Update profile with all generated documents + coach fields
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

        // Voice guidelines (required for AI Coaches)
        // Always provide defaults to ensure AI Coaches has required brand_tone
        voice_tone: masterProfile.voiceGuidelines?.tone || "professional and approachable",
        voice_style: masterProfile.voiceGuidelines?.style || "conversational",
        voice_personality: masterProfile.voiceGuidelines?.personality || "helpful and knowledgeable",

        // Coach profile fields (parsed from AI coaching questions)
        // Required fields get defaults to ensure AI Coaches works
        discount_comfort_level: coachFields.discount_comfort_level || profile.discount_comfort_level || "moderate",
        owner_time_constraint: coachFields.owner_time_constraint || profile.owner_time_constraint || "moderate",
        // Optional fields - only set if provided
        ...(coachFields.inventory_size && {
          inventory_size: coachFields.inventory_size,
        }),
        ...(coachFields.primary_goal_this_quarter && {
          primary_goal_this_quarter: coachFields.primary_goal_this_quarter,
        }),
        ...(coachFields.return_policy_summary && {
          return_policy_summary: coachFields.return_policy_summary,
        }),
        ...(coachFields.shipping_policy_summary && {
          shipping_policy_summary: coachFields.shipping_policy_summary,
        }),
        // Increment coach profile version when any coach fields are set
        coach_profile_version: (profile.coach_profile_version || 0) + 1,

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
      logger.error("Error updating profile", updateError as Error, {
        component: "business-profile-generate",
        operation: "POST-updateProfile",
        profileId: profile.id,
      });
      return NextResponse.json(
        { success: false, error: "Failed to save generated profile" },
        { status: 500 },
      );
    }

    // Save generation history for audit trail
    const { error: historyError } = await supabaseAdmin
      .from("profile_generation_history")
      .insert({
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

    if (historyError) {
      // Alert on audit trail failure - this is critical for compliance
      await alertAuditFailure(
        "Failed to save profile generation history",
        {
          profileId: profile.id,
          storeId: userId,
          profileVersion: profile.profile_version + 1,
        },
        historyError,
      );
      // Note: We don't fail the request since the profile was generated successfully
      // The audit failure is logged and alerted for investigation
    }

    // Mark business profile step as completed in shops table
    const { error: shopUpdateError } = await supabaseAdmin
      .from("shops")
      .update({ business_profile_completed: true })
      .eq("id", userId);

    if (shopUpdateError) {
      logger.warn("Failed to update shop business_profile_completed flag:", {
        component: "business-profile-generate",
        error: shopUpdateError.message,
        userId,
      });
      // Don't fail the request, just log the warning
    }

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
    logger.error(
      "Error in POST /api/business-profile/generate",
      error as Error,
      {
        component: "business-profile-generate",
        operation: "POST",
      },
    );
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
