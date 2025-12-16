/**
 * PATCH /api/bhb/shops/[shop_id]/assign-coach
 *
 * Assigns a coach to a shop. Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shop_id: string }> },
) {
  try {
    const { shop_id } = await params;

    // Require admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn("Unauthorized access attempt to assign coach", {
        component: "assign-coach",
      });
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Only admins can assign coaches
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin") {
      logger.warn("Forbidden access attempt to assign coach", {
        component: "assign-coach",
        userId: session.user.id,
        userRole,
      });
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await req.json();
    const { coach_email } = body;

    // coach_email can be null to unassign
    if (coach_email !== null && typeof coach_email !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid coach_email parameter" },
        { status: 400 },
      );
    }

    // Verify the shop exists
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain")
      .eq("id", shop_id)
      .single();

    if (shopError || !shop) {
      logger.error("Shop not found for coach assignment", undefined, {
        component: "assign-coach",
        shopId: shop_id,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // If assigning a coach, verify the coach exists
    if (coach_email) {
      const { data: coach, error: coachError } = await supabaseAdmin
        .from("coaches")
        .select("id, email, name")
        .eq("email", coach_email)
        .single();

      if (coachError || !coach) {
        logger.error("Coach not found for assignment", undefined, {
          component: "assign-coach",
          coachEmail: coach_email,
        });
        return NextResponse.json(
          { success: false, error: "Coach not found" },
          { status: 404 },
        );
      }
    }

    // Update the shop with the assigned coach
    const { error: updateError } = await supabaseAdmin
      .from("shops")
      .update({
        coach_assigned: coach_email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shop_id);

    if (updateError) {
      logger.error("Failed to assign coach to shop", updateError as Error, {
        component: "assign-coach",
        shopId: shop_id,
        coachEmail: coach_email,
      });
      return NextResponse.json(
        { success: false, error: "Failed to assign coach" },
        { status: 500 },
      );
    }

    logger.info("Coach assigned to shop", {
      component: "assign-coach",
      shopId: shop_id,
      shopDomain: shop.shop_domain,
      coachEmail: coach_email,
      assignedBy: session.user.email,
    });

    return NextResponse.json({
      success: true,
      message: coach_email
        ? `Coach ${coach_email} assigned to ${shop.shop_domain}`
        : `Coach unassigned from ${shop.shop_domain}`,
      shop_id,
      coach_assigned: coach_email,
    });
  } catch (error) {
    logger.error(
      "Error in PATCH /api/bhb/shops/[shop_id]/assign-coach:",
      error as Error,
      {
        component: "assign-coach",
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to assign coach",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
