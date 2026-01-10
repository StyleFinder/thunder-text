/**
 * Dev Dashboard Metrics API
 *
 * GET /api/dev/metrics?range=7d|30d|90d - Get dashboard metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDevAuthenticated, createUnauthorizedResponse } from '@/lib/auth/dev-auth';
import { getMonitoringMetrics, type TimeRange } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const isAuthenticated = await isDevAuthenticated(request);
  if (!isAuthenticated) {
    return createUnauthorizedResponse();
  }

  // Get time range from query params
  const rangeParam = request.nextUrl.searchParams.get('range');
  const validRanges: TimeRange[] = ['7d', '30d', '90d'];
  const timeRange: TimeRange = validRanges.includes(rangeParam as TimeRange)
    ? (rangeParam as TimeRange)
    : '7d';

  try {
    const metrics = await getMonitoringMetrics(timeRange);

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    logger.error('Failed to fetch metrics', error, { component: 'dev-metrics-api', timeRange });
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
