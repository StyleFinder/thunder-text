/**
 * Unified Image Generation Client
 *
 * Provides a single interface for AI image generation using OpenAI GPT Image 1.
 *
 * Key features:
 * - OpenAI GPT Image 1 with reference image support via images.edit API
 * - Circuit breaker integration for resilience
 * - Cost tracking per generation
 * - Consistent response format
 *
 * Note: DALL-E 3 was removed - it doesn't support reference images.
 */

import * as openaiImage from './openai-image-client';
import { parsePrompt, buildEnhancedPrompt, type QuestionnaireAnswerInput } from './image-prompt-parser';
import { canRequest, getCircuitStatus, CircuitState } from '@/lib/resilience/circuit-breaker';
import { logger } from '@/lib/logger';
import type {
  ImageProvider,
  ImageModel,
  AspectRatio,
  ImageQuality,
  ImageGenerationResult,
  ImageProviderHealth,
  ImageSystemHealth,
  PromptDebugInfo,
} from '@/types/image-generation';

export type { ImageProvider } from '@/types/image-generation';

/**
 * Image generation options
 */
export interface ImageGenerationOptions {
  /** User-selected provider (always openai now) */
  provider: ImageProvider;
  /** Optional specific model (defaults to gpt-image-1) */
  model?: ImageModel;
  /** Image aspect ratio */
  aspectRatio?: AspectRatio;
  /** Image quality level */
  quality?: ImageQuality;
  /** Shop ID for usage tracking */
  shopId: string;
  /** Conversation ID for iteration tracking */
  conversationId?: string;
  /** Questionnaire answers for prompt enhancement */
  questionnaireAnswers?: QuestionnaireAnswerInput[];
}

/**
 * Generate an image using OpenAI
 *
 * @param prompt Text description of the desired image
 * @param referenceImage Optional base64 encoded reference image
 * @param options Generation options including model selection
 * @returns Generation result with image data and metadata
 */
export async function generateImage(
  prompt: string,
  referenceImage: string | undefined,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const {
    provider,
    model,
    aspectRatio = '1:1',
    quality = 'standard',
    shopId,
    conversationId = generateConversationId(),
    questionnaireAnswers,
  } = options;

  // Check if OpenAI is available
  const health = getProviderHealth();

  if (!health.openai.available) {
    throw new ImageGenerationError(
      `OpenAI Image is unavailable. ${getUnavailableReason(health.openai)}`,
      provider
    );
  }

  logger.info('Starting image generation', {
    component: 'image-generation-client',
    provider: 'openai',
    model: model || 'default',
    aspectRatio,
    quality,
    shopId,
    conversationId,
    hasReferenceImage: !!referenceImage,
  });

  try {
    const result = await openaiImage.generateImage(prompt, referenceImage, {
      model: model as openaiImage.OpenAIImageOptions['model'],
      aspectRatio,
      quality,
      shopId,
      operationType: 'image_generation',
      questionnaireAnswers,
    });

    return {
      imageUrl: result.imageData, // Base64 data URL
      conversationId,
      provider: 'openai',
      model: result.model,
      costCents: result.costCents,
      usedFallback: false,
      prompt,
      createdAt: new Date().toISOString(),
      promptDebug: result.promptDebug,
    };
  } catch (error) {
    logger.error('Image generation failed', {
      component: 'image-generation-client',
      provider: 'openai',
      error: (error as Error).message,
      shopId,
    });

    throw error;
  }
}

/**
 * Get the reason why the provider is unavailable
 */
function getUnavailableReason(health: ImageProviderHealth): string {
  if (!health.configured) {
    return 'API key not configured.';
  }
  if (health.circuitOpen) {
    return `Circuit breaker is open due to ${health.failureCount} recent failures. Please try again later.`;
  }
  return 'Service is currently unavailable.';
}

/**
 * Generate a unique conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check provider health status
 */
export function getProviderHealth(): ImageSystemHealth['providers'] {
  const openaiConfigured = openaiImage.isOpenAIImageConfigured();

  // Try to get circuit status, use defaults if circuit doesn't exist yet
  let openaiState: CircuitState = CircuitState.CLOSED;
  let openaiFailureCount = 0;

  try {
    const openaiStatus = getCircuitStatus('openai-image');
    openaiState = openaiStatus.state;
    openaiFailureCount = openaiStatus.failureCount;
  } catch {
    // Circuit may not exist yet
  }

  return {
    openai: {
      available: openaiConfigured && canRequest('openai-image'),
      circuitOpen: openaiState === CircuitState.OPEN,
      failureCount: openaiFailureCount,
      configured: openaiConfigured,
    },
  };
}

/**
 * Get comprehensive system health
 */
export function getSystemHealth(): ImageSystemHealth {
  const providers = getProviderHealth();

  const availableProviders = providers.openai.available ? 1 : 0;

  return {
    providers,
    overall: {
      healthy: availableProviders > 0,
      availableProviders,
    },
  };
}

/**
 * Check if the provider is available
 */
export function isAnyProviderAvailable(): boolean {
  const health = getProviderHealth();
  return health.openai.available;
}

/**
 * Get available providers (those that are configured and not circuit-broken)
 */
export function getAvailableProviders(): ImageProvider[] {
  const health = getProviderHealth();
  const available: ImageProvider[] = [];

  if (health.openai.available) available.push('openai');

  return available;
}

/**
 * Get default model for the provider
 */
export function getDefaultModel(provider: ImageProvider): ImageModel {
  return 'gpt-image-1';
}

/**
 * Get available models for the provider
 */
export function getModelsForProvider(provider: ImageProvider): ImageModel[] {
  return openaiImage.getAvailableOpenAIModels();
}

/**
 * Get cost estimate for a generation
 */
export function estimateCost(
  provider: ImageProvider,
  model?: ImageModel,
  quality: ImageQuality = 'standard'
): number {
  const actualModel = model || getDefaultModel(provider);

  // Cost lookup table (in cents)
  // Note: Only gpt-image-1 supported - DALL-E 3 removed (doesn't support reference images)
  const costs: Record<string, number> = {
    'gpt-image-1': quality === 'hd' ? 2 : 1,
  };

  return costs[actualModel] || 1;
}

/**
 * Custom error class for image generation errors
 */
export class ImageGenerationError extends Error {
  provider: ImageProvider;
  originalError: Error | null;

  constructor(message: string, provider: ImageProvider, originalError: Error | null = null) {
    super(message);
    this.name = 'ImageGenerationError';
    this.provider = provider;
    this.originalError = originalError;
  }
}
