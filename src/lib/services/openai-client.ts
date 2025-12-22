/**
 * OpenAI Client Service
 * Wrapper for OpenAI API with retry logic, error handling, and circuit breaker
 */

import OpenAI from 'openai'
import { getOpenAIKey, logAPIUsage } from '../security/api-keys'
import { createRequestTracker, type ApiRequestLog } from '@/lib/monitoring/request-logger'
import { logError } from '@/lib/monitoring/error-logger'
import {
  withCircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitStatus,
} from '@/lib/resilience/circuit-breaker'

// Initialize OpenAI client (server-side only)
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client cannot be used on the client side')
  }

  if (!openaiClient) {
    const apiKey = getOpenAIKey()
    openaiClient = new OpenAI({ apiKey })
  }

  return openaiClient
}

export interface ChatCompletionOptions {
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
 * Call OpenAI Chat Completion API with retry logic and circuit breaker
 */
export async function callChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: ChatCompletionOptions = {},
  retryOptions: RetryOptions = {}
): Promise<string> {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 4000,
    topP = 1,
    frequencyPenalty = 0,
    presencePenalty = 0,
    response_format,
    shopId,
    operationType = 'content_generation'
  } = options

  // Create request tracker for monitoring
  const tracker = createRequestTracker(operationType, shopId)

  // Wrap the API call with circuit breaker protection
  return withCircuitBreaker(
    'openai',
    async () => {
      return executeOpenAICall(
        messages,
        { model, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, response_format, shopId, operationType },
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
      const status = getCircuitStatus('openai')

      await tracker.error({
        model,
        errorCode: 'CIRCUIT_OPEN',
        errorMessage: `Circuit breaker is OPEN. Service unavailable. Retry after ${Math.ceil(error.retryAfterMs / 1000)}s`,
        endpoint: 'chat.completions',
        isTimeout: false,
        isRateLimited: false
      })

      throw new OpenAIError(
        `OpenAI service temporarily unavailable (circuit breaker open). ` +
        `${status.failureCount} failures in last ${Math.floor(status.config.failureWindowMs / 1000)}s. ` +
        `Retry after ${Math.ceil(error.retryAfterMs / 1000)}s.`,
        error
      )
    }
    throw error
  })
}

/**
 * Execute the actual OpenAI API call with retries (internal function)
 */
async function executeOpenAICall(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model: string
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
    response_format?: { type: 'text' | 'json_object' }
    shopId?: string
    operationType: ApiRequestLog['operationType']
  },
  retryOptions: RetryOptions,
  tracker: ReturnType<typeof createRequestTracker>
): Promise<string> {
  const client = getOpenAIClient()
  const retry = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
  const { model, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, response_format, shopId, operationType } = options

  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= retry.maxRetries) {
    try {
      const startTime = Date.now()

      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        ...(response_format && { response_format })
      })

      const responseTime = Date.now() - startTime
      const tokensUsed = completion.usage?.total_tokens || 0

      // Log API usage (legacy)
      logAPIUsage('openai', 'chat_completion', {
        model,
        tokensUsed,
        responseTimeMs: responseTime,
        attempt: attempt + 1
      })

      const content = completion.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Log successful request to monitoring system
      const inputTokens = completion.usage?.prompt_tokens || estimateTokenCount(messages.map(m => m.content).join(' '))
      const outputTokens = completion.usage?.completion_tokens || estimateTokenCount(content)

      await tracker.complete({
        model,
        inputTokens,
        outputTokens,
        endpoint: 'chat.completions',
        metadata: {
          attempt: attempt + 1,
          temperature,
          maxTokens
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
        `OpenAI API call failed (attempt ${attempt}/${retry.maxRetries + 1}). ` +
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
    endpoint: 'chat.completions',
    isTimeout,
    isRateLimited
  })

  // Also log to error tracking system for aggregation
  await logError({
    errorType: isTimeout ? 'timeout' : isRateLimited ? 'rate_limit' : 'api_error',
    errorCode: isRateLimited ? '429' : undefined,
    errorMessage,
    shopId,
    endpoint: 'chat.completions',
    operationType,
    requestData: {
      model,
      attempts: retry.maxRetries + 1,
      temperature,
      maxTokens
    }
  })

  throw new OpenAIError(
    `OpenAI API call failed after ${retry.maxRetries + 1} attempts: ${lastError?.message}`,
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
  if (message.includes('authentication') || message.includes('api key')) {
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
 * Custom error class for OpenAI errors
 */
export class OpenAIError extends Error {
  originalError: Error | null

  constructor(message: string, originalError: Error | null = null) {
    super(message)
    this.name = 'OpenAIError'
    this.originalError = originalError
  }
}

/**
 * Estimate token count for text (rough approximation)
 * Real token counting requires tiktoken library
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text)

  if (estimatedTokens <= maxTokens) {
    return text
  }

  // Calculate how many characters we can keep
  const maxChars = maxTokens * 4 // Rough estimate
  return text.substring(0, maxChars) + '...'
}
