/**
 * Staff Invitations API
 *
 * GET /api/invitations - List invitations for a store
 * POST /api/invitations - Create and send a new invitation
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";
import { sendStaffInvitationEmail } from "@/lib/services/resend-service";

// Generate a secure random token for invitation links
function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * GET /api/invitations
 * List all invitations for a store (pending, accepted, expired, revoked)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const status = searchParams.get("status"); // Optional filter

  if (!shop) {
    return NextResponse.json(
      { error: "Shop parameter required" },
      { status: 400 }
    );
  }

  try {
    // Get the shop - try shop_domain first, then email (for standalone users)
    let masterShop = null;
    let shopError = null;

    // Try by shop_domain first (works for Shopify stores and some standalone)
    const { data: shopByDomain, error: domainError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, shop_type, linked_shopify_domain")
      .eq("shop_domain", shop)
      .eq("is_active", true)
      .single();

    if (shopByDomain) {
      masterShop = shopByDomain;
    } else {
      // Try by email (for standalone users where shop_domain = email)
      const { data: shopByEmail, error: emailError } = await supabaseAdmin
        .from("shops")
        .select("id, shop_domain, shop_type, linked_shopify_domain")
        .eq("email", shop)
        .eq("is_active", true)
        .single();

      if (shopByEmail) {
        masterShop = shopByEmail;
      } else {
        shopError = domainError || emailError;
      }
    }

    if (!masterShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // For standalone users, get the master Shopify shop ID for invitation tracking
    let masterShopId = masterShop.id;
    if (masterShop.shop_type === "standalone" && masterShop.linked_shopify_domain) {
      // Get the linked master Shopify shop
      const { data: linkedShop } = await supabaseAdmin
        .from("shops")
        .select("id")
        .eq("shop_domain", masterShop.linked_shopify_domain)
        .eq("shop_type", "shopify")
        .single();

      if (linkedShop) {
        masterShopId = linkedShop.id;
      }
    }

    // Build query
    let query = supabaseAdmin
      .from("staff_invitations")
      .select(
        `
        id,
        invited_email,
        invited_name,
        status,
        created_at,
        expires_at,
        accepted_at,
        accepted_by_user_id
      `
      )
      .eq("master_shop_id", masterShopId)
      .order("created_at", { ascending: false });

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    const { data: invitations, error: invError } = await query;

    if (invError) {
      logger.error("[Invitations] Error fetching invitations", invError, {
        component: "invitations",
        masterShopId,
      });
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    // Get invitation limits - use the standalone user's ID if that's what we have
    // The get_invitation_limit function checks shops.plan for that shop
    const { data: limitData } = await supabaseAdmin.rpc("get_invitation_limit", {
      shop_id: masterShop.id, // Use the original shop found (standalone or shopify)
    });

    const { data: usedData } = await supabaseAdmin.rpc("get_used_invitations", {
      shop_id: masterShopId,
    });

    const limit = limitData || 0;
    const used = usedData || 0;

    // Determine the linked domain for finding staff members
    // If standalone user, use their linked_shopify_domain
    // If shopify store, use their shop_domain
    let staffLookupDomain = shop;
    if (masterShop.shop_type === "standalone") {
      const { data: standaloneShop } = await supabaseAdmin
        .from("shops")
        .select("linked_shopify_domain")
        .eq("id", masterShop.id)
        .single();
      if (standaloneShop?.linked_shopify_domain) {
        staffLookupDomain = standaloneShop.linked_shopify_domain;
      }
    }

    // Get staff members (accepted invitations with user accounts)
    const { data: staffMembers } = await supabaseAdmin
      .from("shops")
      .select("id, email, display_name, created_at, staff_role, invited_via_invitation_id")
      .eq("linked_shopify_domain", staffLookupDomain)
      .eq("shop_type", "standalone")
      .eq("is_active", true);

    return NextResponse.json({
      success: true,
      invitations: invitations || [],
      staffMembers: staffMembers || [],
      limits: {
        limit,
        used,
        canInvite: used < limit,
      },
    });
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
 * POST /api/invitations
 * Create and send a new staff invitation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shop, email, name } = body;

    if (!shop || !email) {
      return NextResponse.json(
        { error: "Shop and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get the master shop (must be a Shopify store, not standalone)
    const { data: masterShop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, shop_type, display_name, store_name")
      .eq("shop_domain", shop)
      .eq("shop_type", "shopify")
      .eq("is_active", true)
      .single();

    if (shopError || !masterShop) {
      // Try finding via linked domain (if caller is a staff member)
      const { data: staffShop } = await supabaseAdmin
        .from("shops")
        .select("linked_shopify_domain")
        .eq("shop_domain", shop)
        .eq("shop_type", "standalone")
        .single();

      if (staffShop?.linked_shopify_domain) {
        // Re-query with the master domain
        const { data: realMaster } = await supabaseAdmin
          .from("shops")
          .select("id, shop_domain, shop_type, display_name, store_name")
          .eq("shop_domain", staffShop.linked_shopify_domain)
          .eq("shop_type", "shopify")
          .eq("is_active", true)
          .single();

        if (!realMaster) {
          return NextResponse.json(
            { error: "Master shop not found" },
            { status: 404 }
          );
        }
        // Continue with realMaster
        return await createInvitation(realMaster, email, name);
      }

      return NextResponse.json(
        { error: "Shop not found or not authorized to send invitations" },
        { status: 404 }
      );
    }

    return await createInvitation(masterShop, email, name);
  } catch (error) {
    logger.error("[Invitations] Error creating invitation", error as Error, {
      component: "invitations",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function createInvitation(
  masterShop: {
    id: string;
    shop_domain: string;
    display_name: string | null;
    store_name: string | null;
  },
  email: string,
  name?: string
) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already has an account linked to this store
  const { data: existingUser } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("linked_shopify_domain", masterShop.shop_domain)
    .single();

  if (existingUser) {
    return NextResponse.json(
      { error: "This email is already a team member" },
      { status: 409 }
    );
  }

  // Check invitation limits
  const { data: canSend } = await supabaseAdmin.rpc("can_send_invitation", {
    shop_id: masterShop.id,
  });

  if (!canSend) {
    return NextResponse.json(
      {
        error:
          "Invitation limit reached. Upgrade your plan to invite more team members.",
      },
      { status: 403 }
    );
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabaseAdmin
    .from("staff_invitations")
    .select("id, status")
    .eq("master_shop_id", masterShop.id)
    .eq("invited_email", normalizedEmail)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return NextResponse.json(
      { error: "An invitation is already pending for this email" },
      { status: 409 }
    );
  }

  // Generate secure token
  const token = generateInvitationToken();

  // Create invitation
  const { data: invitation, error: createError } = await supabaseAdmin
    .from("staff_invitations")
    .insert({
      master_shop_id: masterShop.id,
      invited_email: normalizedEmail,
      invited_name: name || null,
      token,
      status: "pending",
    })
    .select()
    .single();

  if (createError) {
    logger.error("[Invitations] Error creating invitation", createError, {
      component: "invitations",
      masterShopId: masterShop.id,
      email: normalizedEmail,
    });
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }

  // Send invitation email
  const storeName =
    masterShop.display_name ||
    masterShop.store_name ||
    masterShop.shop_domain.replace(".myshopify.com", "");

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`;

  try {
    await sendStaffInvitationEmail({
      to: normalizedEmail,
      storeName,
      inviterName: storeName,
      inviteUrl,
      expiresInDays: 7,
    });

    logger.info("[Invitations] Invitation sent successfully", {
      component: "invitations",
      invitationId: invitation.id,
      email: normalizedEmail,
      storeName,
    });
  } catch (emailError) {
    // Log error but don't fail - invitation is created
    logger.error("[Invitations] Failed to send invitation email", emailError as Error, {
      component: "invitations",
      invitationId: invitation.id,
      email: normalizedEmail,
    });
  }

  return NextResponse.json({
    success: true,
    invitation: {
      id: invitation.id,
      email: normalizedEmail,
      status: invitation.status,
      expiresAt: invitation.expires_at,
    },
  });
}
