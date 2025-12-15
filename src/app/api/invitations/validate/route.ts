/**
 * Invitation Token Validation API
 *
 * GET /api/invitations/validate?token=xxx - Validate an invitation token
 *
 * SECURITY NOTES:
 * - This endpoint is intentionally unauthenticated (users click invitation links before signing in)
 * - Rate limiting should be implemented at the infrastructure level (Vercel/Cloudflare)
 * - Uses generic error messages to prevent token enumeration
 * - Tokens are UUID v4 (122 bits of entropy) making brute force impractical
 * - TODO: Add IP-based rate limiting middleware (recommended: 10 requests/minute per IP)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/invitations/validate
 * Validate an invitation token and return invitation details
 *
 * SECURITY: Intentionally unauthenticated - users validate tokens before login.
 * Protection relies on:
 * 1. High entropy tokens (UUID v4)
 * 2. Token expiration
 * 3. Generic error messages
 * 4. Infrastructure-level rate limiting (TODO)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token parameter required" },
      { status: 400 },
    );
  }

  try {
    // Get the invitation by token
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("staff_invitations")
      .select(
        `
        id,
        master_shop_id,
        invited_email,
        invited_name,
        status,
        expires_at
      `,
      )
      .eq("token", token)
      .single();

    if (invError || !invitation) {
      logger.warn("[Invitations] Invalid token used", {
        component: "invitations",
        tokenPrefix: token.substring(0, 8),
      });
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid invitation link",
        },
        { status: 404 },
      );
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    const isExpired = expiresAt <= now;

    if (isExpired && invitation.status === "pending") {
      // Update status to expired
      await supabaseAdmin
        .from("staff_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return NextResponse.json({
        valid: false,
        error: "This invitation has expired. Please ask for a new invitation.",
        status: "expired",
      });
    }

    // Check status
    if (invitation.status !== "pending") {
      const statusMessages: Record<string, string> = {
        accepted: "This invitation has already been used.",
        expired:
          "This invitation has expired. Please ask for a new invitation.",
        revoked: "This invitation has been cancelled.",
      };

      return NextResponse.json({
        valid: false,
        error: statusMessages[invitation.status] || "Invalid invitation",
        status: invitation.status,
      });
    }

    // Get the master shop details
    const { data: masterShop } = await supabaseAdmin
      .from("shops")
      .select("shop_domain, display_name, store_name")
      .eq("id", invitation.master_shop_id)
      .single();

    if (!masterShop) {
      return NextResponse.json({
        valid: false,
        error: "The store associated with this invitation no longer exists.",
      });
    }

    const storeName =
      masterShop.display_name ||
      masterShop.store_name ||
      masterShop.shop_domain.replace(".myshopify.com", "");

    logger.info("[Invitations] Token validated successfully", {
      component: "invitations",
      invitationId: invitation.id,
      email: invitation.invited_email,
    });

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.invited_email,
        name: invitation.invited_name,
        storeName,
        shopDomain: masterShop.shop_domain,
        expiresAt: invitation.expires_at,
      },
    });
  } catch (error) {
    logger.error("[Invitations] Error validating token", error as Error, {
      component: "invitations",
    });
    return NextResponse.json(
      { valid: false, error: "Failed to validate invitation" },
      { status: 500 },
    );
  }
}
