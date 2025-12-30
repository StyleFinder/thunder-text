/**
 * Dev Dashboard API Health Endpoint
 *
 * GET /api/dev/health - Get health status for all external APIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDevAuthenticated, createUnauthorizedResponse } from '@/lib/auth/dev-auth';
import { getApiHealthMetrics } from '@/lib/monitoring/metrics';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const isAuthenticated = await isDevAuthenticated(request);
  if (!isAuthenticated) {
    return createUnauthorizedResponse();
  }

  try {
    const health = await getApiHealthMetrics();

    return NextResponse.json(health, {
      headers: {
        'Cache-Control': 'private, max-age=15',
      },
    });
  } catch (error) {
    console.error('Failed to fetch API health:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to fetch API health',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
