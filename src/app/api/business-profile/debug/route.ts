import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";

/**
 * GET /api/business-profile/debug
 * Debug endpoint to check authentication and database access
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("authorization");
    const shop = authHeader?.replace("Bearer ", "");

    const debugInfo = {
      timestamp: new Date().toISOString(),
      authHeader: authHeader ? "present" : "missing",
      shopDomain: shop || "not provided",
      userId: null as string | null,
      errors: [] as string[],
      tables: {
        shops: { exists: false, error: null as string | null },
        business_profiles: { exists: false, error: null as string | null },
        interview_prompts: {
          exists: false,
          count: 0,
          error: null as string | null,
        },
      },
    };

    // Test getUserId
    try {
      const userId = await getUserId(request);
      debugInfo.userId = userId;
      if (!userId) {
        debugInfo.errors.push("getUserId returned null");
      }
    } catch (error) {
      debugInfo.errors.push(`getUserId error: ${error}`);
    }

    // Test shops table
    try {
      const { error } = await supabaseAdmin.from("shops").select("id").limit(1);

      debugInfo.tables.shops.exists = !error;
      if (error) {
        debugInfo.tables.shops.error = error.message;
        debugInfo.errors.push(`shops table: ${error.message}`);
      }
    } catch (error) {
      debugInfo.tables.shops.error = String(error);
      debugInfo.errors.push(`shops table exception: ${error}`);
    }

    // Test business_profiles table
    try {
      const { error } = await supabaseAdmin
        .from("business_profiles")
        .select("id")
        .limit(1);

      debugInfo.tables.business_profiles.exists = !error;
      if (error) {
        debugInfo.tables.business_profiles.error = error.message;
        debugInfo.errors.push(`business_profiles table: ${error.message}`);
      }
    } catch (error) {
      debugInfo.tables.business_profiles.error = String(error);
      debugInfo.errors.push(`business_profiles exception: ${error}`);
    }

    // Test interview_prompts table
    try {
      const { error, count } = await supabaseAdmin
        .from("interview_prompts")
        .select("*", { count: "exact" });

      debugInfo.tables.interview_prompts.exists = !error;
      debugInfo.tables.interview_prompts.count = count || 0;
      if (error) {
        debugInfo.tables.interview_prompts.error = error.message;
        debugInfo.errors.push(`interview_prompts table: ${error.message}`);
      }
    } catch (error) {
      debugInfo.tables.interview_prompts.error = String(error);
      debugInfo.errors.push(`interview_prompts exception: ${error}`);
    }

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Debug endpoint error",
        message: String(error),
      },
      { status: 500 },
    );
  }
}
