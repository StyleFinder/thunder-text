/**
 * Video Credits API Route
 *
 * GET /api/video/credits
 * Get current credit balance and transaction history
 *
 * POST /api/video/credits
 * Add credits (for testing/admin - production uses Shopify billing)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface CreditsResponse {
  success: boolean;
  data?: {
    balance: number;
    totalPurchased: number;
    totalUsed: number;
    totalRefunded: number;
    refundsToday: number;
    refundsRemaining: number;
    recentTransactions?: {
      id: string;
      type: string;
      amount: number;
      balanceAfter: number;
      description: string;
      createdAt: string;
    }[];
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CreditsResponse>> {
  try {
    // 1. Authenticate
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Get credit balance
    const { data: credits, error: creditsError } = await supabaseAdmin
      .from("video_credits")
      .select("*")
      .eq("shop_id", userId)
      .single();

    // Handle no credits record (new user)
    if (creditsError && creditsError.code === "PGRST116") {
      return NextResponse.json({
        success: true,
        data: {
          balance: 0,
          totalPurchased: 0,
          totalUsed: 0,
          totalRefunded: 0,
          refundsToday: 0,
          refundsRemaining: 3,
          recentTransactions: [],
        },
      });
    }

    if (creditsError) {
      throw creditsError;
    }

    // 3. Get recent transactions
    const { data: transactions } = await supabaseAdmin
      .from("video_credit_transactions")
      .select(
        "id, transaction_type, amount, balance_after, description, created_at",
      )
      .eq("shop_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Calculate refunds remaining
    const today = new Date().toISOString().split("T")[0];
    const refundsToday =
      credits.refunds_reset_at === today ? credits.refunds_today : 0;
    const refundsRemaining = Math.max(0, 3 - refundsToday);

    return NextResponse.json({
      success: true,
      data: {
        balance: credits.balance,
        totalPurchased: credits.total_purchased,
        totalUsed: credits.total_used,
        totalRefunded: credits.total_refunded,
        refundsToday,
        refundsRemaining,
        recentTransactions: transactions?.map((t) => ({
          id: t.id,
          type: t.transaction_type,
          amount: t.amount,
          balanceAfter: t.balance_after,
          description: t.description || "",
          createdAt: t.created_at,
        })),
      },
    });
  } catch (error) {
    logger.error("Credits fetch error", error as Error, {
      component: "video-credits",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Add credits (admin/testing endpoint)
 *
 * In production, credits should be added via:
 * 1. Shopify usage-based billing webhook
 * 2. Admin dashboard
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreditsResponse>> {
  try {
    // 1. Authenticate
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Parse request
    const body = await request.json();
    const amount = parseInt(body.amount, 10);

    if (!amount || amount < 1 || amount > 1000) {
      return NextResponse.json(
        { success: false, error: "Invalid amount (must be 1-1000)" },
        { status: 400 },
      );
    }

    // 3. Check if this is a development environment
    const isDev = process.env.NODE_ENV === "development";
    const isAdmin = body.adminSecret === process.env.DEV_ADMIN_SECRET;

    if (!isDev && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Credits can only be added via Shopify billing",
        },
        { status: 403 },
      );
    }

    // 4. Add credits using database function
    const { data: newBalance, error: addError } = await supabaseAdmin.rpc(
      "add_video_credits",
      {
        p_shop_id: userId,
        p_amount: amount,
        p_shopify_charge_id: body.chargeId || null,
        p_description: body.description || `Added ${amount} credits`,
      },
    );

    if (addError) {
      throw addError;
    }

    logger.info("Credits added", {
      component: "video-credits",
      shopId: userId,
      amount,
      newBalance,
    });

    // 5. Get updated credit info
    const { data: credits } = await supabaseAdmin
      .from("video_credits")
      .select("*")
      .eq("shop_id", userId)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        balance: credits?.balance ?? newBalance,
        totalPurchased: credits?.total_purchased ?? amount,
        totalUsed: credits?.total_used ?? 0,
        totalRefunded: credits?.total_refunded ?? 0,
        refundsToday: credits?.refunds_today ?? 0,
        refundsRemaining: 3,
      },
    });
  } catch (error) {
    logger.error("Credits add error", error as Error, {
      component: "video-credits",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
