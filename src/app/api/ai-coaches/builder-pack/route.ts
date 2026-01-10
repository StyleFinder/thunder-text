/**
 * AI Coaches API - Builder Pack
 *
 * GET /api/ai-coaches/builder-pack
 * Download the AI builder pack markdown file
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import { hasPremiumAccess } from "@/lib/services/ai-coach-service";
import { generateBuilderPack } from "@/lib/services/ai-coach-renderer";
import type { ApiResponse, BuilderPackResponse } from "@/types/ai-coaches";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-coaches/builder-pack
 * Generate and return the builder pack markdown
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<BuilderPackResponse>> | NextResponse> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check premium access
    const isPremium = await hasPremiumAccess(userId);
    if (!isPremium) {
      return NextResponse.json(
        {
          success: false,
          error: "AI Coaches require a Pro plan",
        },
        { status: 403 },
      );
    }

    // Check if download format requested
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get("download") === "true";

    // Generate the builder pack
    const builderPack = await generateBuilderPack(userId);

    logger.info("Generated builder pack", {
      component: "ai-coaches",
      storeId: userId,
      download,
      packLength: builderPack.packMd.length,
    });

    // If download requested, return as file
    if (download) {
      return new NextResponse(builderPack.packMd, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${builderPack.filename}"`,
        },
      });
    }

    // Otherwise return JSON response
    return NextResponse.json({
      success: true,
      data: {
        pack_md: builderPack.packMd,
        filename: builderPack.filename,
      },
    });
  } catch (error) {
    const err = error as Error;

    // Handle specific error types
    if (err.message?.includes("No coach instances")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No coach instances rendered yet. Call /api/ai-coaches/render first.",
          code: "NO_INSTANCES",
        },
        { status: 400 },
      );
    }

    logger.error("Error generating builder pack", err, {
      component: "ai-coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
