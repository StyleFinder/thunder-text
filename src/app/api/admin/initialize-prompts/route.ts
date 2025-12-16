import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { initializeDefaultPrompts } from "@/lib/prompts";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/initialize-prompts
 *
 * Manually initialize default prompts for a shop
 * This is useful for existing shops that were installed before auto-initialization
 *
 * SECURITY: Requires admin authentication
 */
export async function POST(request: NextRequest) {
  // SECURITY: Require admin authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // SECURITY: Require admin role
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "admin") {
    logger.warn("Non-admin attempted to access initialize-prompts", {
      component: "initialize-prompts",
      userId: session.user.id,
      role: userRole,
    });
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { shop } = body;

    if (!shop) {
      return NextResponse.json(
        { error: "Shop domain is required" },
        { status: 400 },
      );
    }

    logger.info("Admin initializing prompts for shop", {
      component: "initialize-prompts",
      adminId: session.user.id,
      shop,
    });

    await initializeDefaultPrompts(shop);

    return NextResponse.json({
      success: true,
      message: "Default prompts initialized successfully",
    });
  } catch (error) {
    logger.error("❌ Error initializing prompts:", error as Error, {
      component: "initialize-prompts",
    });
    return NextResponse.json(
      {
        error: "Failed to initialize prompts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
