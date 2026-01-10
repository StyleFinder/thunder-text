/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * Request Queue for Burst Traffic Management
 *
 * Buffers outgoing API requests to prevent overwhelming external services.
 * Implements priority queuing, concurrency control, and timeout handling.
 *
 * Key features:
 * - Per-service concurrency limits
 * - Priority support (critical requests skip ahead)
 * - Queue timeout (requests waiting too long fail fast)
 * - Circuit breaker integration (don't queue if circuit is open)
 * - Queue depth monitoring for alerting
 */

import { logger } from "@/lib/logger";
import { canRequest } from "./circuit-breaker";

// Priority levels for queue ordering
export enum QueuePriority {
  CRITICAL = 0, // Immediate processing, skips queue
  HIGH = 1, // Front of queue
  NORMAL = 2, // Standard processing
  LOW = 3, // Background tasks
}

// Queue configuration per service
export interface QueueConfig {
  /** Maximum concurrent requests allowed */
  maxConcurrent: number;
  /** Maximum queue depth before rejecting new requests */
  maxQueueSize: number;
  /** Maximum time a request can wait in queue (ms) */
  queueTimeoutMs: number;
  /** Whether to check circuit breaker before queueing */
  respectCircuitBreaker: boolean;
}

// Default configurations per service
// Calculated based on: maxConcurrent = RPM × (avgResponseTime / 60)
// With ~3s average response time for LLM calls
export const QUEUE_CONFIGS: Record<string, QueueConfig> = {
  openai: {
    maxConcurrent: 25, // Tier 1: 500 RPM → 25 concurrent @ 3s/req
    maxQueueSize: 200, // Handle bursts of 50+ users
    queueTimeoutMs: 30_000, // 30s max wait
    respectCircuitBreaker: true,
  },
  anthropic: {
    maxConcurrent: 25, // Similar to OpenAI for fallback parity
    maxQueueSize: 200,
    queueTimeoutMs: 30_000,
    respectCircuitBreaker: true,
  },
  shopify: {
    maxConcurrent: 40, // Shopify has generous limits, fast responses
    maxQueueSize: 300,
    queueTimeoutMs: 15_000, // Faster timeout for quick API
    respectCircuitBreaker: true,
  },
  facebook: {
    maxConcurrent: 10, // Facebook has stricter rate limits
    maxQueueSize: 50,
    queueTimeoutMs: 60_000, // Facebook has stricter limits
    respectCircuitBreaker: true,
  },
};

// Queued request wrapper
interface QueuedRequest<T> {
  id: string;
  priority: QueuePriority;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  timeoutMs: number;
}

// Queue state per service
interface ServiceQueue {
  pending: QueuedRequest<unknown>[];
  activeCount: number;
  totalProcessed: number;
  totalRejected: number;
  totalTimedOut: number;
}

// Global queue state
const queues = new Map<string, ServiceQueue>();

// Request ID counter
let requestIdCounter = 0;

/**
 * Get or initialize queue for a service
 */
function getQueue(serviceName: string): ServiceQueue {
  if (!queues.has(serviceName)) {
    queues.set(serviceName, {
      pending: [],
      activeCount: 0,
      totalProcessed: 0,
      totalRejected: 0,
      totalTimedOut: 0,
    });
  }
  return queues.get(serviceName)!;
}

/**
 * Get configuration for a service
 */
function getConfig(serviceName: string): QueueConfig {
  return QUEUE_CONFIGS[serviceName] || QUEUE_CONFIGS.openai;
}

/**
 * Generate unique request ID
 */
function generateRequestId(serviceName: string): string {
  return `${serviceName}-${Date.now()}-${++requestIdCounter}`;
}

/**
 * Custom error for queue-related failures
 */
export class RequestQueueError extends Error {
  serviceName: string;
  reason: "queue_full" | "timeout" | "circuit_open";
  queueDepth?: number;
  waitTimeMs?: number;

  constructor(
    message: string,
    serviceName: string,
    reason: "queue_full" | "timeout" | "circuit_open",
    details?: { queueDepth?: number; waitTimeMs?: number },
  ) {
    super(message);
    this.name = "RequestQueueError";
    this.serviceName = serviceName;
    this.reason = reason;
    this.queueDepth = details?.queueDepth;
    this.waitTimeMs = details?.waitTimeMs;
  }
}

/**
 * Process the next item in the queue
 */
async function processNext(serviceName: string): Promise<void> {
  const queue = getQueue(serviceName);
  const config = getConfig(serviceName);

  // Check if we can process more
  if (queue.activeCount >= config.maxConcurrent || queue.pending.length === 0) {
    return;
  }

  // Get next request (already sorted by priority)
  const request = queue.pending.shift();
  if (!request) return;

  // Check if request has timed out while waiting
  const waitTime = Date.now() - request.enqueuedAt;
  if (waitTime > request.timeoutMs) {
    queue.totalTimedOut++;
    request.reject(
      new RequestQueueError(
        `Request timed out after waiting ${waitTime}ms in queue`,
        serviceName,
        "timeout",
        { waitTimeMs: waitTime, queueDepth: queue.pending.length },
      ),
    );
    // Process next immediately
    setImmediate(() => processNext(serviceName));
    return;
  }

  // Execute the request
  queue.activeCount++;

  try {
    const result = await request.execute();
    queue.totalProcessed++;
    request.resolve(result as never);
  } catch (error) {
    request.reject(error as Error);
  } finally {
    queue.activeCount--;
    // Process next request
    setImmediate(() => processNext(serviceName));
  }
}

/**
 * Insert request into queue maintaining priority order
 */
function insertByPriority<T>(
  queue: QueuedRequest<unknown>[],
  request: QueuedRequest<T>,
): void {
  // Find insertion point (maintain stable sort within same priority)
  let insertIndex = queue.length;
  for (let i = 0; i < queue.length; i++) {
    if (queue[i].priority > request.priority) {
      insertIndex = i;
      break;
    }
  }
  queue.splice(insertIndex, 0, request as QueuedRequest<unknown>);
}

/**
 * Enqueue a request for processing
 *
 * @param serviceName - The service to queue for (openai, anthropic, etc.)
 * @param execute - The async function to execute
 * @param options - Queue options
 * @returns Promise that resolves when the request is processed
 */
export async function enqueue<T>(
  serviceName: string,
  execute: () => Promise<T>,
  options: {
    priority?: QueuePriority;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const config = getConfig(serviceName);
  const queue = getQueue(serviceName);
  const priority = options.priority ?? QueuePriority.NORMAL;
  const timeoutMs = options.timeoutMs ?? config.queueTimeoutMs;

  // Check circuit breaker if configured
  if (config.respectCircuitBreaker && !canRequest(serviceName)) {
    throw new RequestQueueError(
      `Cannot queue request: circuit breaker is open for ${serviceName}`,
      serviceName,
      "circuit_open",
    );
  }

  // Critical priority bypasses the queue
  if (
    priority === QueuePriority.CRITICAL &&
    queue.activeCount < config.maxConcurrent
  ) {
    queue.activeCount++;
    try {
      const result = await execute();
      queue.totalProcessed++;
      return result;
    } finally {
      queue.activeCount--;
      setImmediate(() => processNext(serviceName));
    }
  }

  // Check queue depth
  if (queue.pending.length >= config.maxQueueSize) {
    queue.totalRejected++;
    throw new RequestQueueError(
      `Queue full for ${serviceName}: ${queue.pending.length}/${config.maxQueueSize} requests pending`,
      serviceName,
      "queue_full",
      { queueDepth: queue.pending.length },
    );
  }

  // Create promise for this request
  return new Promise<T>((resolve, reject) => {
    const request: QueuedRequest<T> = {
      id: generateRequestId(serviceName),
      priority,
      execute,
      resolve,
      reject,
      enqueuedAt: Date.now(),
      timeoutMs,
    };

    // Insert maintaining priority order
    insertByPriority(queue.pending, request);

    logger.debug(`Request queued: ${request.id}`, {
      component: "request-queue",
      serviceName,
      priority,
      queueDepth: queue.pending.length,
      activeCount: queue.activeCount,
    });

    // Trigger processing
    processNext(serviceName);
  });
}

/**
 * Execute a function with queue protection
 *
 * This is the main entry point for queueing API calls
 */
export async function withQueue<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options: {
    priority?: QueuePriority;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  return enqueue(serviceName, fn, options);
}

/**
 * Get current queue status for monitoring
 */
export function getQueueStatus(serviceName: string): {
  serviceName: string;
  pending: number;
  active: number;
  totalProcessed: number;
  totalRejected: number;
  totalTimedOut: number;
  config: QueueConfig;
  utilizationPercent: number;
  queueDepthPercent: number;
} {
  const queue = getQueue(serviceName);
  const config = getConfig(serviceName);

  return {
    serviceName,
    pending: queue.pending.length,
    active: queue.activeCount,
    totalProcessed: queue.totalProcessed,
    totalRejected: queue.totalRejected,
    totalTimedOut: queue.totalTimedOut,
    config,
    utilizationPercent: (queue.activeCount / config.maxConcurrent) * 100,
    queueDepthPercent: (queue.pending.length / config.maxQueueSize) * 100,
  };
}

/**
 * Get status of all queues
 */
export function getAllQueueStatuses(): Record<
  string,
  ReturnType<typeof getQueueStatus>
> {
  const statuses: Record<string, ReturnType<typeof getQueueStatus>> = {};

  // Include all configured services
  for (const serviceName of Object.keys(QUEUE_CONFIGS)) {
    statuses[serviceName] = getQueueStatus(serviceName);
  }

  // Include any active queues not in default config
  for (const serviceName of queues.keys()) {
    if (!statuses[serviceName]) {
      statuses[serviceName] = getQueueStatus(serviceName);
    }
  }

  return statuses;
}

/**
 * Clear all pending requests for a service (for testing or emergency)
 */
export function clearQueue(serviceName: string, reason: string): number {
  const queue = getQueue(serviceName);
  const clearedCount = queue.pending.length;

  // Reject all pending requests
  for (const request of queue.pending) {
    request.reject(new Error(`Queue cleared: ${reason}`));
  }

  queue.pending = [];

  logger.warn(`Queue cleared for ${serviceName}`, {
    component: "request-queue",
    serviceName,
    clearedCount,
    reason,
  });

  return clearedCount;
}

/**
 * Check if a service queue is healthy
 * Returns false if queue is backed up or rejecting requests
 */
export function isQueueHealthy(serviceName: string): boolean {
  const status = getQueueStatus(serviceName);

  // Unhealthy if queue is more than 80% full
  if (status.queueDepthPercent > 80) {
    return false;
  }

  // Unhealthy if rejection rate is high (more than 10% of processed)
  if (status.totalProcessed > 10) {
    const rejectionRate =
      status.totalRejected / (status.totalProcessed + status.totalRejected);
    if (rejectionRate > 0.1) {
      return false;
    }
  }

  return true;
}

/**
 * Estimate wait time for a new request
 */
export function estimateWaitTime(
  serviceName: string,
  priority: QueuePriority = QueuePriority.NORMAL,
): number {
  const queue = getQueue(serviceName);
  const config = getConfig(serviceName);

  // Count requests ahead in queue (with higher or equal priority)
  let requestsAhead = 0;
  for (const request of queue.pending) {
    if (request.priority <= priority) {
      requestsAhead++;
    }
  }

  // Estimate based on average processing time (assume 2s per request)
  const avgProcessingTimeMs = 2000;
  const availableSlots = config.maxConcurrent - queue.activeCount;

  if (availableSlots > 0 && requestsAhead === 0) {
    return 0; // Can start immediately
  }

  // Estimate: requests ahead / concurrent capacity * avg time
  const batchesAhead = Math.ceil(requestsAhead / config.maxConcurrent);
  return batchesAhead * avgProcessingTimeMs;
}

/**
 * Pause queue processing for a service (for maintenance)
 */
const pausedServices = new Set<string>();

export function pauseQueue(serviceName: string): void {
  pausedServices.add(serviceName);
  logger.info(`Queue paused for ${serviceName}`, {
    component: "request-queue",
    serviceName,
  });
}

export function resumeQueue(serviceName: string): void {
  pausedServices.delete(serviceName);
  logger.info(`Queue resumed for ${serviceName}`, {
    component: "request-queue",
    serviceName,
  });
  // Trigger processing
  processNext(serviceName);
}

export function isQueuePaused(serviceName: string): boolean {
  return pausedServices.has(serviceName);
}
