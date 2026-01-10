/**
 * AIE Embeddings Management API Route
 * GET /api/aie/embeddings - Check embedding status
 * POST /api/aie/embeddings - Generate missing embeddings
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/ace-compat";
import { logger } from "@/lib/logger";
import {
  getEmbeddingStats,
  ensureBestPracticeEmbeddings,
} from "@/lib/aie/embedding-manager";

/**
 * GET - Check embedding status
 */
export const GET = requireAuth("user")(async (_request) => {
  try {
    const stats = await getEmbeddingStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("❌ Error checking embeddings:", error as Error, {
      component: "embeddings",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to check embedding status",
        },
      },
      { status: 500 },
    );
  }
});

/**
 * POST - Generate missing embeddings
 */
export const POST = requireAuth("user")(async (_request) => {
  try {
    const result = await ensureBestPracticeEmbeddings();

    return NextResponse.json({
      success: true,
      data: {
        message:
          result.generated > 0
            ? `Successfully generated ${result.generated} embeddings`
            : "All embeddings already exist",
        stats: result,
      },
    });
  } catch (error) {
    logger.error("❌ Error generating embeddings:", error as Error, {
      component: "embeddings",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate embeddings",
        },
      },
      { status: 500 },
    );
  }
});
