/**
 * Staff Invitation Management API
 *
 * DELETE /api/invitations/[id] - Revoke an invitation
 * POST /api/invitations/[id]/resend - Resend invitation email
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { sendStaffInvitationEmail } from "@/lib/services/resend-service";

/**
 * DELETE /api/invitations/[id]
 * Revoke a pending invitation
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json(
      { error: "Shop parameter required" },
      { status: 400 }
    );
  }

  try {
    // Get the invitation
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("staff_invitations")
      .select("id, master_shop_id, status, invited_email")
      .eq("id", id)
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify the shop owns this invitation
    const { data: masterShop } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain")
      .eq("id", invitation.master_shop_id)
      .single();

    if (!masterShop || masterShop.shop_domain !== shop) {
      return NextResponse.json(
        { error: "Not authorized to revoke this invitation" },
        { status: 403 }
      );
    }

    // Can only revoke pending invitations
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot revoke invitation with status: ${invitation.status}` },
        { status: 400 }
      );
    }

    // Update status to revoked
    const { error: updateError } = await supabaseAdmin
      .from("staff_invitations")
      .update({ status: "revoked" })
      .eq("id", id);

    if (updateError) {
      logger.error("[Invitations] Error revoking invitation", updateError, {
        component: "invitations",
        invitationId: id,
      });
      return NextResponse.json(
        { error: "Failed to revoke invitation" },
        { status: 500 }
      );
    }

    logger.info("[Invitations] Invitation revoked", {
      component: "invitations",
      invitationId: id,
      email: invitation.invited_email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Invitations] Unexpected error", error as Error, {
      component: "invitations",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations/[id]
 * Resend invitation email (for pending invitations)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const action = searchParams.get("action");

  if (!shop) {
    return NextResponse.json(
      { error: "Shop parameter required" },
      { status: 400 }
    );
  }

  if (action !== "resend") {
    return NextResponse.json(
      { error: "Invalid action. Use action=resend" },
      { status: 400 }
    );
  }

  try {
    // Get the invitation with master shop details
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("staff_invitations")
      .select(
        `
        id,
        master_shop_id,
        status,
        invited_email,
        invited_name,
        token,
        expires_at
      `
      )
      .eq("id", id)
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify the shop owns this invitation
    const { data: masterShop } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, display_name, store_name")
      .eq("id", invitation.master_shop_id)
      .single();

    if (!masterShop || masterShop.shop_domain !== shop) {
      return NextResponse.json(
        { error: "Not authorized to resend this invitation" },
        { status: 403 }
      );
    }

    // Can only resend pending invitations
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot resend invitation with status: ${invitation.status}` },
        { status: 400 }
      );
    }

    // Check if expired - if so, extend expiration
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    let newExpiresAt = expiresAt;

    if (expiresAt <= now) {
      // Extend by 7 days from now
      newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await supabaseAdmin
        .from("staff_invitations")
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq("id", id);
    }

    // Send invitation email
    const storeName =
      masterShop.display_name ||
      masterShop.store_name ||
      masterShop.shop_domain.replace(".myshopify.com", "");

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${invitation.token}`;

    await sendStaffInvitationEmail({
      to: invitation.invited_email,
      storeName,
      inviterName: storeName,
      inviteUrl,
      expiresInDays: 7,
    });

    logger.info("[Invitations] Invitation email resent", {
      component: "invitations",
      invitationId: id,
      email: invitation.invited_email,
    });

    return NextResponse.json({
      success: true,
      expiresAt: newExpiresAt.toISOString(),
    });
  } catch (error) {
    logger.error("[Invitations] Error resending invitation", error as Error, {
      component: "invitations",
    });
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
