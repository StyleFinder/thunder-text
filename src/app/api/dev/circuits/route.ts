/**
 * Circuit Breaker Status API
 *
 * GET /api/dev/circuits - Get all circuit breaker statuses
 * POST /api/dev/circuits - Reset or trip a circuit
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDevAuthenticated, createUnauthorizedResponse } from '@/lib/auth/dev-auth';
import {
  getAllCircuitStatuses,
  resetCircuit,
  tripCircuit,
  CircuitState,
} from '@/lib/resilience/circuit-breaker';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const isAuthenticated = await isDevAuthenticated(request);
  if (!isAuthenticated) {
    return createUnauthorizedResponse();
  }

  const statuses = getAllCircuitStatuses();

  // Format for API response
  const formattedStatuses = Object.entries(statuses).map(([service, status]) => ({
    service,
    state: status.state,
    isOpen: status.state === CircuitState.OPEN,
    isHalfOpen: status.state === CircuitState.HALF_OPEN,
    failureCount: status.failureCount,
    successCount: status.successCount,
    lastFailure: status.lastFailure?.toISOString() || null,
    lastStateChange: status.lastStateChange.toISOString(),
    openDurationMs: status.openDuration,
    config: {
      failureThreshold: status.config.failureThreshold,
      resetTimeoutMs: status.config.resetTimeoutMs,
      successThreshold: status.config.successThreshold,
      failureWindowMs: status.config.failureWindowMs,
    },
  }));

  return NextResponse.json({
    circuits: formattedStatuses,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const isAuthenticated = await isDevAuthenticated(request);
  if (!isAuthenticated) {
    return createUnauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { action, service, reason } = body;

    if (!service) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    if (action === 'reset') {
      await resetCircuit(service);
      return NextResponse.json({
        success: true,
        message: `Circuit breaker for ${service} has been reset`,
        service,
        action: 'reset',
      });
    } else if (action === 'trip') {
      await tripCircuit(service, reason || 'Manual trip via dev dashboard');
      return NextResponse.json({
        success: true,
        message: `Circuit breaker for ${service} has been tripped`,
        service,
        action: 'trip',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "reset" or "trip"' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
