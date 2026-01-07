/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by tracking API failures and temporarily
 * blocking requests when a service is unhealthy.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Service is failing, requests are blocked (fast fail)
 * - HALF_OPEN: Testing recovery, limited requests allowed
 */

import { logger } from "@/lib/logger";
import {
  triggerAlert,
  AlertSeverity,
  AlertType,
} from "@/lib/monitoring/alerting";

// Circuit breaker states
export enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Blocking requests
  HALF_OPEN = "HALF_OPEN", // Testing recovery
}

// Configuration for circuit breaker behavior
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery (moving to HALF_OPEN) */
  resetTimeoutMs: number;
  /** Number of successful requests in HALF_OPEN before closing */
  successThreshold: number;
  /** Number of requests to allow in HALF_OPEN state */
  halfOpenRequests: number;
  /** Time window for counting failures (sliding window in ms) */
  failureWindowMs: number;
  /** Whether to trigger alerts on state changes */
  alertOnStateChange: boolean;
}

// Service-specific configurations
export const CIRCUIT_BREAKER_CONFIGS: Record<string, CircuitBreakerConfig> = {
  openai: {
    failureThreshold: 5, // Open after 5 failures
    resetTimeoutMs: 30_000, // Try recovery after 30s
    successThreshold: 2, // 2 successes to close
    halfOpenRequests: 2, // Allow 2 test requests
    failureWindowMs: 60_000, // Count failures in last minute
    alertOnStateChange: true,
  },
  shopify: {
    failureThreshold: 10, // Higher threshold (more tolerant)
    resetTimeoutMs: 60_000, // Try recovery after 60s
    successThreshold: 3, // 3 successes to close
    halfOpenRequests: 1, // 1 test request
    failureWindowMs: 120_000, // Count failures in 2 minutes
    alertOnStateChange: true,
  },
  facebook: {
    failureThreshold: 5, // Moderate threshold
    resetTimeoutMs: 120_000, // Longer recovery for rate limits
    successThreshold: 2,
    halfOpenRequests: 1,
    failureWindowMs: 180_000, // Longer window (3 min)
    alertOnStateChange: true,
  },
  anthropic: {
    failureThreshold: 5, // Same as OpenAI (fallback provider)
    resetTimeoutMs: 30_000, // Try recovery after 30s
    successThreshold: 2, // 2 successes to close
    halfOpenRequests: 2, // Allow 2 test requests
    failureWindowMs: 60_000, // Count failures in last minute
    alertOnStateChange: true,
  },
};

const DEFAULT_ALERT_TYPE = AlertType.EXTERNAL_API_FAILURE;
const SERVICE_ALERT_TYPES: Record<string, AlertType> = {
  openai: AlertType.OPENAI_API_FAILURE,
  shopify: AlertType.SHOPIFY_AUTH_FAILURE,
};

function getServiceAlertType(serviceName: string): AlertType {
  return SERVICE_ALERT_TYPES[serviceName] ?? DEFAULT_ALERT_TYPE;
}

// Failure record for sliding window
interface FailureRecord {
  timestamp: number;
  error: string;
}

// Circuit breaker state
interface CircuitBreakerState {
  state: CircuitState;
  failures: FailureRecord[];
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  openedAt: number | null;
  halfOpenRequestsAllowed: number;
}

// Circuit state storage (in-memory, per-service)
const circuitStates = new Map<string, CircuitBreakerState>();

/**
 * Get or initialize circuit state for a service
 */
function getCircuitState(serviceName: string): CircuitBreakerState {
  if (!circuitStates.has(serviceName)) {
    circuitStates.set(serviceName, {
      state: CircuitState.CLOSED,
      failures: [],
      successCount: 0,
      lastFailureTime: null,
      lastStateChange: Date.now(),
      openedAt: null,
      halfOpenRequestsAllowed: 0,
    });
  }
  return circuitStates.get(serviceName)!;
}

/**
 * Get configuration for a service
 */
function getConfig(serviceName: string): CircuitBreakerConfig {
  return CIRCUIT_BREAKER_CONFIGS[serviceName] || CIRCUIT_BREAKER_CONFIGS.openai;
}

/**
 * Clean up old failures outside the sliding window
 */
function cleanupOldFailures(
  state: CircuitBreakerState,
  windowMs: number,
): void {
  const cutoff = Date.now() - windowMs;
  state.failures = state.failures.filter((f) => f.timestamp > cutoff);
}

/**
 * Transition circuit state
 */
async function transitionState(
  serviceName: string,
  newState: CircuitState,
  reason: string,
): Promise<void> {
  const state = getCircuitState(serviceName);
  const oldState = state.state;
  const config = getConfig(serviceName);

  if (oldState === newState) return;

  state.state = newState;
  state.lastStateChange = Date.now();

  logger.info(`Circuit breaker [${serviceName}]: ${oldState} → ${newState}`, {
    component: "circuit-breaker",
    serviceName,
    reason,
  });

  if (newState === CircuitState.OPEN) {
    state.openedAt = Date.now();
    state.halfOpenRequestsAllowed = 0;
  } else if (newState === CircuitState.HALF_OPEN) {
    state.halfOpenRequestsAllowed = config.halfOpenRequests;
    state.successCount = 0;
  } else if (newState === CircuitState.CLOSED) {
    state.failures = [];
    state.successCount = 0;
    state.openedAt = null;
    state.lastFailureTime = null;
  }

  // Trigger alert on state change
  if (config.alertOnStateChange) {
    if (newState === CircuitState.OPEN) {
      try {
        await triggerAlert({
          severity: AlertSeverity.CRITICAL,
          type: getServiceAlertType(serviceName),
          title: `Circuit Breaker OPEN: ${serviceName}`,
          message: `The ${serviceName} service circuit breaker has opened due to repeated failures. Requests will fail fast until recovery.`,
          details: {
            serviceName,
            failureCount: state.failures.length,
            reason,
            openedAt: new Date().toISOString(),
          },
          affectedComponent: serviceName,
        });
      } catch (alertError) {
        const wrappedError =
          alertError instanceof Error
            ? alertError
            : new Error(String(alertError));
        logger.warn(
          `Failed to emit alert for ${serviceName} circuit breaker`,
          wrappedError,
          {
            component: "circuit-breaker",
            serviceName,
          },
        );
      }
    } else if (
      newState === CircuitState.CLOSED &&
      oldState === CircuitState.HALF_OPEN
    ) {
      logger.info(`Circuit breaker [${serviceName}] recovered`, {
        component: "circuit-breaker",
        serviceName,
      });
    }
  }
}

/**
 * Check if circuit allows the request
 */
export function canRequest(serviceName: string): boolean {
  const state = getCircuitState(serviceName);
  const config = getConfig(serviceName);

  switch (state.state) {
    case CircuitState.CLOSED:
      return true;

    case CircuitState.OPEN: {
      // Check if reset timeout has elapsed
      const timeSinceOpen = Date.now() - (state.openedAt || 0);
      if (timeSinceOpen >= config.resetTimeoutMs) {
        // Transition to HALF_OPEN
        transitionState(
          serviceName,
          CircuitState.HALF_OPEN,
          "Reset timeout elapsed",
        );
        return state.halfOpenRequestsAllowed > 0;
      }
      return false;
    }

    case CircuitState.HALF_OPEN:
      return state.halfOpenRequestsAllowed > 0;

    default:
      return true;
  }
}

/**
 * Record a successful request
 */
export async function recordSuccess(serviceName: string): Promise<void> {
  const state = getCircuitState(serviceName);
  const config = getConfig(serviceName);

  if (state.state === CircuitState.HALF_OPEN) {
    state.successCount++;

    if (state.successCount >= config.successThreshold) {
      await transitionState(
        serviceName,
        CircuitState.CLOSED,
        "Success threshold reached",
      );
    }
  }
}

/**
 * Record a failed request
 */
export async function recordFailure(
  serviceName: string,
  error: Error | string,
): Promise<void> {
  const state = getCircuitState(serviceName);
  const config = getConfig(serviceName);
  const errorMessage = typeof error === "string" ? error : error.message;

  // Add failure record
  state.failures.push({
    timestamp: Date.now(),
    error: errorMessage,
  });
  state.lastFailureTime = Date.now();

  // Clean up old failures
  cleanupOldFailures(state, config.failureWindowMs);

  if (state.state === CircuitState.HALF_OPEN) {
    // Any failure in HALF_OPEN goes back to OPEN
    await transitionState(
      serviceName,
      CircuitState.OPEN,
      "Failure in HALF_OPEN state",
    );
  } else if (state.state === CircuitState.CLOSED) {
    // Check if we've hit the failure threshold
    if (state.failures.length >= config.failureThreshold) {
      await transitionState(
        serviceName,
        CircuitState.OPEN,
        `Failure threshold reached (${state.failures.length}/${config.failureThreshold})`,
      );
    }
  }
}

/**
 * Get current circuit status for monitoring
 */
export function getCircuitStatus(serviceName: string): {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailure: Date | null;
  lastStateChange: Date;
  openDuration: number | null;
  config: CircuitBreakerConfig;
} {
  const state = getCircuitState(serviceName);
  const config = getConfig(serviceName);

  // Clean up old failures for accurate count
  cleanupOldFailures(state, config.failureWindowMs);

  return {
    state: state.state,
    failureCount: state.failures.length,
    successCount: state.successCount,
    lastFailure: state.lastFailureTime ? new Date(state.lastFailureTime) : null,
    lastStateChange: new Date(state.lastStateChange),
    openDuration: state.openedAt ? Date.now() - state.openedAt : null,
    config,
  };
}

/**
 * Get status of all circuits
 */
export function getAllCircuitStatuses(): Record<
  string,
  ReturnType<typeof getCircuitStatus>
> {
  const statuses: Record<string, ReturnType<typeof getCircuitStatus>> = {};

  // Include all configured services
  for (const serviceName of Object.keys(CIRCUIT_BREAKER_CONFIGS)) {
    statuses[serviceName] = getCircuitStatus(serviceName);
  }

  // Include any active circuits not in default config
  for (const serviceName of circuitStates.keys()) {
    if (!statuses[serviceName]) {
      statuses[serviceName] = getCircuitStatus(serviceName);
    }
  }

  return statuses;
}

/**
 * Manually reset a circuit (for testing or manual intervention)
 */
export async function resetCircuit(serviceName: string): Promise<void> {
  await transitionState(serviceName, CircuitState.CLOSED, "Manual reset");
}

/**
 * Manually trip a circuit (for maintenance or known outages)
 */
export async function tripCircuit(
  serviceName: string,
  reason: string,
): Promise<void> {
  await transitionState(serviceName, CircuitState.OPEN, reason);
}

/**
 * Circuit breaker error - thrown when circuit is open
 */
export class CircuitBreakerOpenError extends Error {
  serviceName: string;
  openSince: Date;
  retryAfterMs: number;

  constructor(serviceName: string, openSince: Date, retryAfterMs: number) {
    super(
      `Circuit breaker is OPEN for ${serviceName}. Service is temporarily unavailable.`,
    );
    this.name = "CircuitBreakerOpenError";
    this.serviceName = serviceName;
    this.openSince = openSince;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options?: {
    /** Fallback function when circuit is open */
    fallback?: () => Promise<T>;
    /** Whether to throw specific errors without circuit breaking */
    isNonRetryableError?: (error: Error) => boolean;
  },
): Promise<T> {
  const state = getCircuitState(serviceName);
  const config = getConfig(serviceName);

  // Check if request is allowed
  if (!canRequest(serviceName)) {
    const retryAfterMs =
      config.resetTimeoutMs - (Date.now() - (state.openedAt || 0));

    // Use fallback if provided
    if (options?.fallback) {
      logger.debug(`Circuit open for ${serviceName}, using fallback`, {
        component: "circuit-breaker",
      });
      return options.fallback();
    }

    throw new CircuitBreakerOpenError(
      serviceName,
      new Date(state.openedAt || Date.now()),
      Math.max(0, retryAfterMs),
    );
  }

  // Decrement half-open request counter
  if (state.state === CircuitState.HALF_OPEN) {
    state.halfOpenRequestsAllowed--;
  }

  try {
    const result = await fn();
    await recordSuccess(serviceName);
    return result;
  } catch (error) {
    // Check if error should skip circuit breaking
    if (options?.isNonRetryableError && error instanceof Error) {
      if (options.isNonRetryableError(error)) {
        throw error; // Don't count this as a circuit breaker failure
      }
    }

    await recordFailure(serviceName, error as Error);
    throw error;
  }
}

/**
 * Decrement half-open request count (used when starting a test request)
 */
export function consumeHalfOpenRequest(serviceName: string): void {
  const state = getCircuitState(serviceName);
  if (
    state.state === CircuitState.HALF_OPEN &&
    state.halfOpenRequestsAllowed > 0
  ) {
    state.halfOpenRequestsAllowed--;
  }
}
