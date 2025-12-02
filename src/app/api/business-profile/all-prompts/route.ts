import { requireAuth } from '@/lib/auth/ace-compat';

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import type { ApiResponse, InterviewPrompt } from "@/types/business-profile";
import { logger } from '@/lib/logger'

/**
 * GET /api/business-profile/all-prompts
 * Get all active interview prompts
 */
export const GET = requireAuth('user')(async (
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ prompts: InterviewPrompt[] }>>> => {
  try {
    const authHeader = request.headers.get("Authorization");
    const shopDomain = authHeader?.replace("Bearer ", "");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify shop exists
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Get all active prompts
    const { data: prompts, error: promptsError } = await supabaseAdmin
      .from("interview_prompts")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (promptsError) {
      logger.error("Error fetching prompts:", promptsError as Error, { component: 'all-prompts' });
      return NextResponse.json(
        { success: false, error: "Failed to fetch prompts" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          prompts: prompts as InterviewPrompt[],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in GET /api/business-profile/all-prompts:", error as Error, { component: 'all-prompts' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
