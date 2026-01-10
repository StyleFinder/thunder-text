/**
 * Dev Dashboard Real-time Stats API
 *
 * GET /api/dev/realtime - Get real-time stats (last 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDevAuthenticated, createUnauthorizedResponse } from '@/lib/auth/dev-auth';
import { getRealTimeStats } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const isAuthenticated = await isDevAuthenticated(request);
  if (!isAuthenticated) {
    return createUnauthorizedResponse();
  }

  try {
    const stats = await getRealTimeStats();

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=5',
      },
    });
  } catch (error) {
    logger.error('Failed to fetch real-time stats', error, { component: 'dev-realtime-api' });
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to fetch real-time stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
