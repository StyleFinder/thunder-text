import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { aieEngine } from "@/lib/aie/engine";
import { AiePlatform, AieGoal } from "@/types/aie";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toError } from "@/lib/api/route-config";

/**
 * POST /api/aie/save
 *
 * Save a selected ad variant
 *
 * SECURITY: Requires session authentication. The shopId in body is IGNORED -
 * shop ID is derived from the authenticated session.
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get shop domain from session
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json(
        { error: "No shop associated with account" },
        { status: 403 },
      );
    }

    // Verify shop exists and get shop ID
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, is_active")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop not found for AIE save:", shopError as Error, {
        component: "save",
        shopDomain,
      });
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (!shopData.is_active) {
      return NextResponse.json(
        { error: "Shop is not active" },
        { status: 403 },
      );
    }

    // Use session-derived shop ID
    const shopId = shopData.id;

    const body = await req.json();
    const { productInfo, platform, goal, variant } = body;

    // Note: shopId from body is ignored - we use session-derived shopId

    if (!productInfo || !platform || !goal || !variant) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Save the specific variant with session-derived shopId
    const result = await aieEngine.saveSelectedVariant(
      {
        productInfo,
        platform: platform as AiePlatform,
        goal: goal as AieGoal,
        shopId, // SECURITY: Use session-derived shopId
      },
      variant,
    );

    return NextResponse.json(result);
  } catch (error) {
    const err = toError(error);
    logger.error("AIE Save Error:", err, { component: "save" });
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
