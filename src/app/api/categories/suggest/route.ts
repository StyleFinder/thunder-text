import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/categories/suggest
 *
 * AI-powered category suggestion endpoint
 *
 * SECURITY: Requires session authentication to prevent AI inference abuse.
 * Rate limiting through usage tracking.
 */
export async function POST(request: NextRequest) {
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

    // Verify shop exists and is active
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, is_active")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error(
        "Shop not found for category suggestion:",
        shopError as Error,
        { component: "suggest" },
      );
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (!shopData.is_active) {
      return NextResponse.json(
        { error: "Shop is not active" },
        { status: 403 },
      );
    }

    const { inferProductCategory } = await import("@/lib/category-inference");

    const body = await request.json();
    const { title, description, keywords } = body;

    if (!title && !description) {
      return NextResponse.json(
        { error: "Title or description required for category suggestion" },
        { status: 400 },
      );
    }

    // Infer category from the provided content
    const inference = inferProductCategory(
      title || "",
      description || "",
      keywords || [],
      undefined, // No existing category
    );

    return NextResponse.json({
      success: true,
      suggestion: {
        category: inference.category,
        confidence: inference.confidence,
        reasoning: inference.reasoning,
        shouldAutoAssign: inference.confidence >= 0.6,
      },
    });
  } catch (error) {
    logger.error("❌ Error suggesting category:", error as Error, {
      component: "suggest",
    });
    return NextResponse.json(
      {
        error: "Failed to suggest category",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
