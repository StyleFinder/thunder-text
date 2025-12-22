/**
 * Request Queue Status API
 *
 * GET /api/dev/queues - Get all queue statuses
 * POST /api/dev/queues - Control queue (pause, resume, clear)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDevAuthenticated, createUnauthorizedResponse } from '@/lib/auth/dev-auth'
import {
  getAllQueueStatuses,
  getQueueStatus,
  pauseQueue,
  resumeQueue,
  clearQueue,
  isQueuePaused,
  isQueueHealthy,
  estimateWaitTime,
  QueuePriority,
} from '@/lib/resilience/request-queue'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const isAuthenticated = await isDevAuthenticated(request)
  if (!isAuthenticated) {
    return createUnauthorizedResponse()
  }

  const statuses = getAllQueueStatuses()

  // Format for API response with additional computed fields
  const formattedStatuses = Object.entries(statuses).map(([service, status]) => ({
    service,
    pending: status.pending,
    active: status.active,
    totalProcessed: status.totalProcessed,
    totalRejected: status.totalRejected,
    totalTimedOut: status.totalTimedOut,
    utilizationPercent: Math.round(status.utilizationPercent * 100) / 100,
    queueDepthPercent: Math.round(status.queueDepthPercent * 100) / 100,
    isPaused: isQueuePaused(service),
    isHealthy: isQueueHealthy(service),
    estimatedWaitMs: estimateWaitTime(service, QueuePriority.NORMAL),
    config: {
      maxConcurrent: status.config.maxConcurrent,
      maxQueueSize: status.config.maxQueueSize,
      queueTimeoutMs: status.config.queueTimeoutMs,
    },
  }))

  // Calculate aggregate stats
  const aggregateStats = {
    totalPending: formattedStatuses.reduce((sum, s) => sum + s.pending, 0),
    totalActive: formattedStatuses.reduce((sum, s) => sum + s.active, 0),
    totalProcessed: formattedStatuses.reduce((sum, s) => sum + s.totalProcessed, 0),
    totalRejected: formattedStatuses.reduce((sum, s) => sum + s.totalRejected, 0),
    totalTimedOut: formattedStatuses.reduce((sum, s) => sum + s.totalTimedOut, 0),
    healthyQueues: formattedStatuses.filter(s => s.isHealthy).length,
    totalQueues: formattedStatuses.length,
  }

  return NextResponse.json({
    queues: formattedStatuses,
    aggregate: aggregateStats,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const isAuthenticated = await isDevAuthenticated(request)
  if (!isAuthenticated) {
    return createUnauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { action, service, reason } = body

    if (!service) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'pause':
        pauseQueue(service)
        return NextResponse.json({
          success: true,
          message: `Queue for ${service} has been paused`,
          service,
          action: 'pause',
          status: getQueueStatus(service),
        })

      case 'resume':
        resumeQueue(service)
        return NextResponse.json({
          success: true,
          message: `Queue for ${service} has been resumed`,
          service,
          action: 'resume',
          status: getQueueStatus(service),
        })

      case 'clear':
        const clearedCount = clearQueue(service, reason || 'Manual clear via dev dashboard')
        return NextResponse.json({
          success: true,
          message: `Queue for ${service} has been cleared`,
          service,
          action: 'clear',
          clearedCount,
          status: getQueueStatus(service),
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "pause", "resume", or "clear"' },
          { status: 400 }
        )
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
