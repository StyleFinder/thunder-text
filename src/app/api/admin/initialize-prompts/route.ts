import { NextRequest, NextResponse } from "next/server";
import { initializeDefaultPrompts } from "@/lib/prompts";

/**
 * POST /api/admin/initialize-prompts
 *
 * Manually initialize default prompts for a shop
 * This is useful for existing shops that were installed before auto-initialization
 */
export async function POST(request: NextRequest) {
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

    console.log("🚀 Initializing default prompts for shop:", shop);

    await initializeDefaultPrompts(shop);

    console.log("✅ Successfully initialized default prompts");

    return NextResponse.json({
      success: true,
      message: "Default prompts initialized successfully",
    });
  } catch (error) {
    console.error("❌ Error initializing prompts:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize prompts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
