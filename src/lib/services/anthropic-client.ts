/**
 * Anthropic Client Service
 * Wrapper for Anthropic API with retry logic, error handling, and circuit breaker
 * Used as fallback provider when OpenAI is unavailable
 */

import Anthropic from '@anthropic-ai/sdk'
import { createRequestTracker, type ApiRequestLog } from '@/lib/monitoring/request-logger'
import { logError } from '@/lib/monitoring/error-logger'
import {
  withCircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitStatus,
} from '@/lib/resilience/circuit-breaker'

// Initialize Anthropic client (server-side only)
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (typeof window !== 'undefined') {
    throw new Error('Anthropic client cannot be used on the client side')
  }

  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    anthropicClient = new Anthropic({ apiKey })
  }

  return anthropicClient
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  // Monitoring options
  shopId?: string
  operationType?: ApiRequestLog['operationType']
}

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
}

/**
 * Call Anthropic Chat Completion API with retry logic and circuit breaker
 */
export async function callChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: ChatCompletionOptions = {},
  retryOptions: RetryOptions = {}
): Promise<string> {
  const {
    model = 'claude-3-haiku-20240307',
    temperature = 0.7,
    maxTokens = 4000,
    topP = 1,
    shopId,
    operationType = 'content_generation'
  } = options

  // Create request tracker for monitoring
  const tracker = createRequestTracker(operationType, shopId)

  // Wrap the API call with circuit breaker protection
  return withCircuitBreaker(
    'anthropic',
    async () => {
      return executeAnthropicCall(
        messages,
        { model, temperature, maxTokens, topP, shopId, operationType },
        retryOptions,
        tracker
      )
    },
    {
      isNonRetryableError: (error) => isNonRetryableError(error),
    }
  ).catch(async (error) => {
    // Handle circuit breaker open errors specially
    if (error instanceof CircuitBreakerOpenError) {
      const status = getCircuitStatus('anthropic')

      await tracker.error({
        model,
        errorCode: 'CIRCUIT_OPEN',
        errorMessage: `Circuit breaker is OPEN. Service unavailable. Retry after ${Math.ceil(error.retryAfterMs / 1000)}s`,
        endpoint: 'messages.create',
        isTimeout: false,
        isRateLimited: false
      })

      throw new AnthropicError(
        `Anthropic service temporarily unavailable (circuit breaker open). ` +
        `${status.failureCount} failures in last ${Math.floor(status.config.failureWindowMs / 1000)}s. ` +
        `Retry after ${Math.ceil(error.retryAfterMs / 1000)}s.`,
        error
      )
    }
    throw error
  })
}

/**
 * Execute the actual Anthropic API call with retries (internal function)
 */
async function executeAnthropicCall(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model: string
    temperature: number
    maxTokens: number
    topP: number
    shopId?: string
    operationType: ApiRequestLog['operationType']
  },
  retryOptions: RetryOptions,
  tracker: ReturnType<typeof createRequestTracker>
): Promise<string> {
  const client = getAnthropicClient()
  const retry = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
  const { model, temperature, maxTokens, topP, shopId, operationType } = options

  // Extract system message if present
  const systemMessage = messages.find(m => m.role === 'system')?.content
  const nonSystemMessages = messages.filter(m => m.role !== 'system')

  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= retry.maxRetries) {
    try {
      const startTime = Date.now()

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        ...(systemMessage && { system: systemMessage }),
        messages: nonSystemMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      })

      const responseTime = Date.now() - startTime

      // Extract text content from response
      const textBlock = response.content.find(block => block.type === 'text')
      const content = textBlock && 'text' in textBlock ? textBlock.text : null

      if (!content) {
        throw new Error('No text content in Anthropic response')
      }

      // Log successful request to monitoring system
      const inputTokens = response.usage?.input_tokens || estimateTokenCount(messages.map(m => m.content).join(' '))
      const outputTokens = response.usage?.output_tokens || estimateTokenCount(content)

      await tracker.complete({
        model,
        inputTokens,
        outputTokens,
        endpoint: 'messages.create',
        metadata: {
          attempt: attempt + 1,
          temperature,
          maxTokens,
          responseTimeMs: responseTime
        }
      })

      return content

    } catch (error) {
      lastError = error as Error
      attempt++

      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error
      }

      // If we've exhausted retries, throw the last error
      if (attempt > retry.maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        retry.initialDelayMs * Math.pow(retry.backoffMultiplier, attempt - 1),
        retry.maxDelayMs
      )

      console.warn(
        `Anthropic API call failed (attempt ${attempt}/${retry.maxRetries + 1}). ` +
        `Retrying in ${delay}ms...`,
        error
      )

      // Wait before retrying
      await sleep(delay)
    }
  }

  // All retries exhausted - log error to monitoring system
  const errorMessage = lastError?.message || 'Unknown error'
  const isTimeout = errorMessage.toLowerCase().includes('timeout')
  const isRateLimited = errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('429')

  await tracker.error({
    model,
    errorCode: isRateLimited ? 'RATE_LIMITED' : isTimeout ? 'TIMEOUT' : 'API_ERROR',
    errorMessage,
    endpoint: 'messages.create',
    isTimeout,
    isRateLimited
  })

  // Also log to error tracking system for aggregation
  await logError({
    errorType: isTimeout ? 'timeout' : isRateLimited ? 'rate_limit' : 'api_error',
    errorCode: isRateLimited ? '429' : undefined,
    errorMessage,
    shopId,
    endpoint: 'messages.create',
    operationType,
    requestData: {
      model,
      attempts: retry.maxRetries + 1,
      temperature,
      maxTokens
    }
  })

  throw new AnthropicError(
    `Anthropic API call failed after ${retry.maxRetries + 1} attempts: ${lastError?.message}`,
    lastError
  )
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  // Don't retry on authentication errors
  if (message.includes('authentication') || message.includes('api key') || message.includes('invalid_api_key')) {
    return true
  }

  // Don't retry on invalid request errors
  if (message.includes('invalid') || message.includes('malformed')) {
    return true
  }

  // Don't retry on quota exceeded
  if (message.includes('quota') || message.includes('billing')) {
    return true
  }

  return false
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Custom error class for Anthropic errors
 */
export class AnthropicError extends Error {
  originalError: Error | null

  constructor(message: string, originalError: Error | null = null) {
    super(message)
    this.name = 'AnthropicError'
    this.originalError = originalError
  }
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4)
}

/**
 * Check if Anthropic API key is configured
 */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
