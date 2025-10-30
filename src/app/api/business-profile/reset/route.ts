import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { queryWithTenant } from "@/lib/postgres";
import { getUserId } from "@/lib/auth/content-center-auth";
import type { ApiResponse } from "@/types/business-profile";

/**
 * POST /api/business-profile/reset
 * Reset the interview by deleting all responses and resetting the profile
 * WARNING: This is a destructive operation intended for testing only
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("🔄 Resetting interview for tenant:", userId);

    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("business_profiles")
      .select("*")
      .eq("store_id", userId)
      .eq("is_current", true)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "No profile found to reset" },
        { status: 404 },
      );
    }

    // SECURITY: Double-check that profile belongs to authenticated tenant
    if (profile.store_id !== userId) {
      console.error("🚨 SECURITY VIOLATION: Profile store_id mismatch", {
        authenticated_store: userId,
        profile_store: profile.store_id,
      });
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Delete all responses for this profile using tenant-aware query
    console.log("🗑️  Deleting all responses for profile:", profile.id);
    const deleteResult = await queryWithTenant(
      userId,
      `DELETE FROM business_profile_responses
       WHERE business_profile_id = $1`,
      [profile.id],
    );

    console.log(
      "✅ Deleted responses:",
      deleteResult.rowCount || 0,
      "rows affected",
    );

    // Reset profile status
    const { error: updateError } = await supabaseAdmin
      .from("business_profiles")
      .update({
        interview_status: "not_started",
        interview_started_at: null,
        interview_completed_at: null,
        questions_completed: 0,
        current_question_number: 0,
        master_profile_text: null,
        profile_summary: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .eq("store_id", userId); // Additional security check

    if (updateError) {
      console.error("❌ Failed to reset profile:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to reset profile status" },
        { status: 500 },
      );
    }

    console.log("✅ Interview reset complete for tenant:", userId);

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "Interview reset successfully",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in POST /api/business-profile/reset:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
