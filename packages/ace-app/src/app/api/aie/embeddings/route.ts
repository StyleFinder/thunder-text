/**
 * AIE Embeddings Management API Route
 * GET /api/aie/embeddings - Check embedding status
 * POST /api/aie/embeddings - Generate missing embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApp } from '@thunder-text/shared-backend';
import {
  getEmbeddingStats,
  ensureBestPracticeEmbeddings,
} from '@/lib/aie/embedding-manager';

/**
 * GET - Check embedding status
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require ACE app subscription
    const claims = await requireApp('ace')(request);
    if (claims instanceof NextResponse) return claims;

    const stats = await getEmbeddingStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error checking embeddings:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to check embedding status',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate missing embeddings
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require ACE app subscription
    const claims = await requireApp('ace')(request);
    if (claims instanceof NextResponse) return claims;

    console.log('⚡ Generating embeddings...');

    const result = await ensureBestPracticeEmbeddings();

    return NextResponse.json({
      success: true,
      data: {
        message:
          result.generated > 0
            ? `Successfully generated ${result.generated} embeddings`
            : 'All embeddings already exist',
        stats: result,
      },
    });
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate embeddings',
        },
      },
      { status: 500 }
    );
  }
}
