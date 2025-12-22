/**
 * Unified LLM Client with Fallback Support
 *
 * Provides a single interface for AI completions with automatic fallback
 * from OpenAI to Anthropic when the primary provider is unavailable.
 *
 * Priority order: OpenAI → Anthropic
 *
 * Model mapping:
 * - gpt-4o-mini → claude-3-haiku-20240307
 * - gpt-4o → claude-3-5-sonnet-20241022
 * - gpt-4-turbo → claude-3-5-sonnet-20241022
 */

import * as openai from './openai-client'
import * as anthropic from './anthropic-client'
import { canRequest, getCircuitStatus } from '@/lib/resilience/circuit-breaker'
import {
  withQueue,
  QueuePriority,
  getQueueStatus,
  isQueueHealthy,
  estimateWaitTime,
  RequestQueueError,
} from '@/lib/resilience/request-queue'
import { logger } from '@/lib/logger'
import type { ApiRequestLog } from '@/lib/monitoring/request-logger'

export { QueuePriority } from '@/lib/resilience/request-queue'

// Model mapping from OpenAI to Anthropic equivalents
const MODEL_MAPPING: Record<string, string> = {
  'gpt-4o-mini': 'claude-3-haiku-20240307',
  'gpt-4o': 'claude-3-5-sonnet-20241022',
  'gpt-4-turbo': 'claude-3-5-sonnet-20241022',
  'gpt-4-turbo-preview': 'claude-3-5-sonnet-20241022',
  'gpt-4': 'claude-3-5-sonnet-20241022',
  'gpt-3.5-turbo': 'claude-3-haiku-20240307',
}

// Default fallback model if no mapping exists
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-haiku-20240307'

export type LLMProvider = 'openai' | 'anthropic'

export interface LLMCompletionOptions {
  /** OpenAI model name (will be mapped to Anthropic equivalent if fallback occurs) */
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  response_format?: { type: 'text' | 'json_object' }
  // Monitoring options
  shopId?: string
  operationType?: ApiRequestLog['operationType']
  // Fallback behavior
  /** Disable fallback to Anthropic (default: false) */
  disableFallback?: boolean
  /** Preferred provider (default: 'openai') */
  preferredProvider?: LLMProvider
  // Queue behavior
  /** Enable request queueing for burst traffic handling (default: true) */
  enableQueue?: boolean
  /** Queue priority level (default: NORMAL) */
  queuePriority?: QueuePriority
  /** Maximum time to wait in queue before failing (ms) */
  queueTimeoutMs?: number
}

export interface LLMCompletionResult {
  content: string
  provider: LLMProvider
  model: string
  usedFallback: boolean
}

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

/**
 * Call LLM completion with automatic fallback and queue support
 *
 * Tries OpenAI first, falls back to Anthropic if:
 * - OpenAI circuit breaker is open
 * - OpenAI request fails with a retryable error
 *
 * Queue behavior:
 * - Requests are queued to prevent overwhelming API providers
 * - Priority support allows critical requests to skip ahead
 * - Requests timeout if waiting too long in queue
 *
 * @returns The completion content and metadata about which provider was used
 */
export async function callCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: LLMCompletionOptions = {},
  retryOptions: RetryOptions = {}
): Promise<LLMCompletionResult> {
  const {
    model = 'gpt-4o-mini',
    disableFallback = false,
    preferredProvider = 'openai',
    enableQueue = true,
    queuePriority = QueuePriority.NORMAL,
    queueTimeoutMs,
    ...restOptions
  } = options

  // If queue is enabled, wrap the call in queue protection
  if (enableQueue) {
    const primaryProvider = preferredProvider === 'anthropic' ? 'anthropic' : 'openai'

    return withQueue(
      primaryProvider,
      () => executeCompletion(messages, {
        model,
        disableFallback,
        preferredProvider,
        ...restOptions,
      }, retryOptions),
      {
        priority: queuePriority,
        timeoutMs: queueTimeoutMs,
      }
    ).catch((error) => {
      // Handle queue-specific errors
      if (error instanceof RequestQueueError) {
        logger.warn(`LLM request queue error: ${error.reason}`, {
          component: 'llm-client',
          serviceName: error.serviceName,
          reason: error.reason,
          queueDepth: error.queueDepth,
          waitTimeMs: error.waitTimeMs,
        })
      }
      throw error
    })
  }

  // Queue disabled, execute directly
  return executeCompletion(messages, {
    model,
    disableFallback,
    preferredProvider,
    ...restOptions,
  }, retryOptions)
}

/**
 * Execute the actual LLM completion (internal, without queue wrapper)
 */
async function executeCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: Omit<LLMCompletionOptions, 'enableQueue' | 'queuePriority' | 'queueTimeoutMs'>,
  retryOptions: RetryOptions
): Promise<LLMCompletionResult> {
  const {
    model = 'gpt-4o-mini',
    disableFallback = false,
    preferredProvider = 'openai',
    ...restOptions
  } = options

  // Determine provider order based on preference
  const providers: LLMProvider[] = preferredProvider === 'anthropic'
    ? ['anthropic', 'openai']
    : ['openai', 'anthropic']

  // Check if fallback is available
  const anthropicConfigured = anthropic.isAnthropicConfigured()

  // Try primary provider first
  const primaryProvider = providers[0]
  const fallbackProvider = providers[1]

  // Check if primary circuit is open
  if (!canRequest(primaryProvider)) {
    const status = getCircuitStatus(primaryProvider)
    logger.warn(`${primaryProvider} circuit breaker is OPEN, attempting fallback`, {
      component: 'llm-client',
      failureCount: status.failureCount,
      provider: primaryProvider,
    })

    // If fallback is disabled or not available, throw immediately
    if (disableFallback || (fallbackProvider === 'anthropic' && !anthropicConfigured)) {
      throw new LLMError(
        `${primaryProvider} is unavailable (circuit breaker open) and fallback is ${disableFallback ? 'disabled' : 'not configured'}`,
        primaryProvider,
        null
      )
    }

    // Use fallback provider directly
    return callWithProvider(fallbackProvider, messages, model, restOptions, retryOptions, true)
  }

  // Try primary provider
  try {
    return await callWithProvider(primaryProvider, messages, model, restOptions, retryOptions, false)
  } catch (error) {
    // Check if we should fallback
    if (disableFallback) {
      throw error
    }

    // Check if fallback provider is available
    if (fallbackProvider === 'anthropic' && !anthropicConfigured) {
      logger.warn('Anthropic fallback not available (API key not configured)', {
        component: 'llm-client',
      })
      throw error
    }

    // Check if fallback circuit is also open
    if (!canRequest(fallbackProvider)) {
      const status = getCircuitStatus(fallbackProvider)
      throw new LLMError(
        `Both ${primaryProvider} and ${fallbackProvider} are unavailable. ` +
        `${fallbackProvider} circuit breaker is OPEN with ${status.failureCount} failures.`,
        fallbackProvider,
        error as Error
      )
    }

    // Log fallback attempt
    logger.info(`${primaryProvider} failed, falling back to ${fallbackProvider}`, {
      component: 'llm-client',
      primaryError: (error as Error).message,
      model,
    })

    // Try fallback provider
    try {
      return await callWithProvider(fallbackProvider, messages, model, restOptions, retryOptions, true)
    } catch (fallbackError) {
      // Both providers failed
      throw new LLMError(
        `Both ${primaryProvider} and ${fallbackProvider} failed. ` +
        `Primary: ${(error as Error).message}. ` +
        `Fallback: ${(fallbackError as Error).message}`,
        fallbackProvider,
        fallbackError as Error
      )
    }
  }
}

/**
 * Call a specific provider
 */
async function callWithProvider(
  provider: LLMProvider,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  requestedModel: string,
  options: Omit<LLMCompletionOptions, 'model' | 'disableFallback' | 'preferredProvider'>,
  retryOptions: RetryOptions,
  usedFallback: boolean
): Promise<LLMCompletionResult> {
  if (provider === 'openai') {
    const content = await openai.callChatCompletion(
      messages,
      {
        model: requestedModel,
        ...options,
      },
      retryOptions
    )

    return {
      content,
      provider: 'openai',
      model: requestedModel,
      usedFallback,
    }
  } else {
    // Map OpenAI model to Anthropic equivalent
    const anthropicModel = mapToAnthropicModel(requestedModel)

    const content = await anthropic.callChatCompletion(
      messages,
      {
        model: anthropicModel,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        shopId: options.shopId,
        operationType: options.operationType,
        // Note: response_format, frequencyPenalty, presencePenalty not supported by Anthropic
      },
      retryOptions
    )

    return {
      content,
      provider: 'anthropic',
      model: anthropicModel,
      usedFallback,
    }
  }
}

/**
 * Map OpenAI model name to Anthropic equivalent
 */
function mapToAnthropicModel(openaiModel: string): string {
  return MODEL_MAPPING[openaiModel] || DEFAULT_ANTHROPIC_MODEL
}

/**
 * Check provider health status
 */
export function getProviderHealth(): {
  openai: { available: boolean; circuitOpen: boolean; failureCount: number }
  anthropic: { available: boolean; circuitOpen: boolean; failureCount: number; configured: boolean }
} {
  const openaiStatus = getCircuitStatus('openai')
  const anthropicStatus = getCircuitStatus('anthropic')
  const anthropicConfigured = anthropic.isAnthropicConfigured()

  return {
    openai: {
      available: canRequest('openai'),
      circuitOpen: openaiStatus.state === 'OPEN',
      failureCount: openaiStatus.failureCount,
    },
    anthropic: {
      available: anthropicConfigured && canRequest('anthropic'),
      circuitOpen: anthropicStatus.state === 'OPEN',
      failureCount: anthropicStatus.failureCount,
      configured: anthropicConfigured,
    },
  }
}

/**
 * Custom error class for LLM errors
 */
export class LLMError extends Error {
  provider: LLMProvider
  originalError: Error | null

  constructor(message: string, provider: LLMProvider, originalError: Error | null = null) {
    super(message)
    this.name = 'LLMError'
    this.provider = provider
    this.originalError = originalError
  }
}

/**
 * Convenience function - simple completion call that returns just the content string
 * For cases where you don't need provider metadata
 */
export async function complete(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: LLMCompletionOptions = {}
): Promise<string> {
  const result = await callCompletion(messages, options)
  return result.content
}

/**
 * Check if any LLM provider is available
 */
export function isAnyProviderAvailable(): boolean {
  const health = getProviderHealth()
  return health.openai.available || health.anthropic.available
}

/**
 * Get comprehensive LLM system health including queue status
 */
export function getLLMSystemHealth(): {
  providers: ReturnType<typeof getProviderHealth>
  queues: {
    openai: ReturnType<typeof getQueueStatus>
    anthropic: ReturnType<typeof getQueueStatus>
  }
  overall: {
    healthy: boolean
    availableProviders: number
    healthyQueues: number
  }
} {
  const providers = getProviderHealth()
  const openaiQueue = getQueueStatus('openai')
  const anthropicQueue = getQueueStatus('anthropic')

  const availableProviders = (providers.openai.available ? 1 : 0) + (providers.anthropic.available ? 1 : 0)
  const healthyQueues = (isQueueHealthy('openai') ? 1 : 0) + (isQueueHealthy('anthropic') ? 1 : 0)

  return {
    providers,
    queues: {
      openai: openaiQueue,
      anthropic: anthropicQueue,
    },
    overall: {
      healthy: availableProviders > 0 && healthyQueues > 0,
      availableProviders,
      healthyQueues,
    },
  }
}

/**
 * Estimate wait time for a new LLM request
 */
export function estimateLLMWaitTime(
  priority: QueuePriority = QueuePriority.NORMAL,
  preferredProvider: LLMProvider = 'openai'
): {
  provider: LLMProvider
  estimatedWaitMs: number
  queueDepth: number
} {
  const provider = preferredProvider
  const waitMs = estimateWaitTime(provider, priority)
  const status = getQueueStatus(provider)

  return {
    provider,
    estimatedWaitMs: waitMs,
    queueDepth: status.pending,
  }
}
