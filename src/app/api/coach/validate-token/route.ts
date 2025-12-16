import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/coach/validate-token
 * Validate a coach invitation token
 *
 * SECURITY NOTES:
 * - This endpoint is intentionally unauthenticated (coaches click invitation links before account setup)
 * - Rate limiting should be implemented at the infrastructure level (Vercel/Cloudflare)
 * - Uses generic error messages to prevent token enumeration
 * - Tokens are high-entropy making brute force impractical
 * - TODO: Add IP-based rate limiting middleware (recommended: 10 requests/minute per IP)
 * - SECURITY: Email is returned on valid token - consider if this is necessary
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      // SECURITY: Generic error message prevents token enumeration
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Lookup coach by invite token
    const { data: coach, error } = await supabaseAdmin
      .from("coaches")
      .select("id, email, invite_expires_at, password_set_at")
      .eq("invite_token", token)
      .single();

    if (error || !coach) {
      // SECURITY: Generic error message prevents token enumeration
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Check if password already set
    if (coach.password_set_at) {
      return NextResponse.json(
        { error: "Password already set for this account" },
        { status: 400 },
      );
    }

    // Check if token expired
    const expiresAt = new Date(coach.invite_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      email: coach.email,
    });
  } catch (error) {
    logger.error("[Validate Token] Unexpected error:", error as Error, {
      component: "validate-token",
    });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
