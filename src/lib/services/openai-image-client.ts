/**
 * OpenAI Image Client Service
 *
 * Wrapper for OpenAI's GPT Image 1 API with retry logic, error handling,
 * and circuit breaker integration.
 *
 * Supports:
 * - GPT Image 1 for cost-effective generation with reference image support
 *
 * Note: DALL-E 3 was removed because it doesn't support the images.edit API
 * which is required for incorporating reference images into generated output.
 */

import OpenAI from 'openai';
import { getOpenAIKey, logAPIUsage } from '@/lib/security/api-keys';
import { createRequestTracker, type ApiRequestLog } from '@/lib/monitoring/request-logger';
import { logError } from '@/lib/monitoring/error-logger';
import {
  withCircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitStatus,
} from '@/lib/resilience/circuit-breaker';
import { logger } from '@/lib/logger';
import { parsePrompt, buildEnhancedPrompt, type QuestionnaireAnswerInput } from './image-prompt-parser';
import type { ProductSize } from '@/types/image-generation';
// Background removal disabled due to native dependency (sharp) conflicts with Next.js/Turbopack
// TODO: Implement cloud-based background removal API (e.g., Remove.bg, Photoroom API)
// import { removeBackgroundAndGenerateMask } from './background-removal-service';
import type {
  OpenAIImageModel,
  AspectRatio,
  ImageQuality,
  OpenAIImageSize,
  PromptDebugInfo,
} from '@/types/image-generation';

// Initialize OpenAI client (server-side only)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client cannot be used on the client side');
  }

  if (!openaiClient) {
    const apiKey = getOpenAIKey();
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

export interface OpenAIImageOptions {
  model?: OpenAIImageModel;
  aspectRatio?: AspectRatio;
  quality?: ImageQuality;
  size?: OpenAIImageSize;
  // Monitoring options
  shopId?: string;
  operationType?: ApiRequestLog['operationType'];
  // Questionnaire answers for prompt enhancement
  questionnaireAnswers?: QuestionnaireAnswerInput[];
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Map aspect ratio to OpenAI size parameter
 */
function aspectRatioToSize(aspectRatio: AspectRatio): OpenAIImageSize {
  switch (aspectRatio) {
    case '1:1':
      return '1024x1024';
    case '16:9':
    case '4:3':
      return '1536x1024'; // Landscape
    case '9:16':
    case '3:4':
      return '1024x1536'; // Portrait
    default:
      return '1024x1024';
  }
}

/**
 * Map OpenAI size back to aspect ratio string (for prompt building)
 */
function sizeToAspectRatio(size: OpenAIImageSize): string {
  switch (size) {
    case '1024x1024':
      return '1:1';
    case '1536x1024':
      return '16:9';
    case '1024x1536':
      return '9:16';
    default:
      return '1:1';
  }
}

/**
 * Generate an image using OpenAI's image generation API
 *
 * @param prompt Text description of the desired image
 * @param referenceImage Optional base64 encoded reference image (for edit mode)
 * @param options Generation options
 * @param retryOptions Retry configuration
 * @returns Base64 encoded image data
 */
export async function generateImage(
  prompt: string,
  referenceImage?: string,
  options: OpenAIImageOptions = {},
  retryOptions: RetryOptions = {}
): Promise<{ imageData: string; model: string; costCents: number; promptDebug?: PromptDebugInfo }> {
  const {
    model = 'gpt-image-1',
    aspectRatio = '1:1',
    quality = 'standard',
    size,
    shopId,
    operationType = 'image_generation',
    questionnaireAnswers,
  } = options;

  // Calculate actual size from aspect ratio or use explicit size
  const actualSize = size || aspectRatioToSize(aspectRatio);

  // Create request tracker for monitoring
  const tracker = createRequestTracker(operationType, shopId);

  // Wrap the API call with circuit breaker protection
  return withCircuitBreaker(
    'openai-image',
    async () => {
      return executeOpenAIImageGeneration(
        prompt,
        referenceImage,
        { model, quality, size: actualSize, shopId, operationType, questionnaireAnswers },
        retryOptions,
        tracker
      );
    },
    {
      isNonRetryableError: (error) => isNonRetryableError(error),
    }
  ).catch(async (error) => {
    // Handle circuit breaker open errors specially
    if (error instanceof CircuitBreakerOpenError) {
      const status = getCircuitStatus('openai-image');

      await tracker.error({
        model,
        errorCode: 'CIRCUIT_OPEN',
        errorMessage: `Circuit breaker is OPEN. Service unavailable. Retry after ${Math.ceil(error.retryAfterMs / 1000)}s`,
        endpoint: 'images.generate',
        isTimeout: false,
        isRateLimited: false,
      });

      throw new OpenAIImageError(
        `OpenAI Image service temporarily unavailable (circuit breaker open). ` +
          `${status.failureCount} failures in last ${Math.floor(status.config.failureWindowMs / 1000)}s. ` +
          `Retry after ${Math.ceil(error.retryAfterMs / 1000)}s.`,
        error
      );
    }
    throw error;
  });
}

/**
 * Execute the actual OpenAI image generation (internal function)
 */
async function executeOpenAIImageGeneration(
  prompt: string,
  referenceImage: string | undefined,
  options: {
    model: OpenAIImageModel;
    quality: ImageQuality;
    size: OpenAIImageSize;
    shopId?: string;
    operationType: ApiRequestLog['operationType'];
    questionnaireAnswers?: QuestionnaireAnswerInput[];
  },
  retryOptions: RetryOptions,
  tracker: ReturnType<typeof createRequestTracker>
): Promise<{ imageData: string; model: string; costCents: number; promptDebug?: PromptDebugInfo }> {
  const client = getOpenAIClient();
  const retry = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let { model } = options;
  const { quality, size, shopId, operationType, questionnaireAnswers } = options;

  // CRITICAL FIX: When a reference image is provided, we MUST use gpt-image-1
  // because DALL-E 3 does not support the images.edit API for reference images.
  // Only gpt-image-1 can incorporate reference images via the edit endpoint.
  if (referenceImage && model !== 'gpt-image-1') {
    logger.warn('Reference image provided with non-gpt-image-1 model. Switching to gpt-image-1 for edit API support.', {
      component: 'openai-image-client',
      originalModel: model,
      newModel: 'gpt-image-1',
      reason: 'DALL-E 3 does not support images.edit API for reference images',
    });
    model = 'gpt-image-1';
  }

  // Calculate cost
  const costCents = getCostForModel(model, quality, size);

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retry.maxRetries) {
    try {
      const startTime = Date.now();

      let result: { imageData: string; promptDebug: PromptDebugInfo };

      if (referenceImage && model === 'gpt-image-1') {
        // Use edit endpoint for reference image with GPT Image 1
        result = await generateWithEdit(client, prompt, referenceImage, model, quality, size, questionnaireAnswers);
      } else {
        // Use standard generation endpoint
        result = await generateWithCreate(client, prompt, model, quality, size, questionnaireAnswers);
      }

      const responseTime = Date.now() - startTime;

      // Log API usage (legacy)
      logAPIUsage('openai', 'image_generation', {
        model,
        responseTimeMs: responseTime,
        attempt: attempt + 1,
        quality,
        size,
      });

      // Log successful request to monitoring
      await tracker.complete({
        model,
        inputTokens: estimatePromptTokens(prompt),
        outputTokens: 0, // Images don't have output tokens
        endpoint: 'images.generate',
        metadata: {
          attempt: attempt + 1,
          quality,
          size,
          responseTimeMs: responseTime,
          costCents,
        },
      });

      logger.info('OpenAI image generation successful', {
        component: 'openai-image-client',
        model,
        quality,
        size,
        responseTimeMs: responseTime,
        costCents,
      });

      return { imageData: result.imageData, model, costCents, promptDebug: result.promptDebug };
    } catch (error) {
      lastError = error as Error;
      attempt++;

      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }

      // If we've exhausted retries, throw the last error
      if (attempt > retry.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        retry.initialDelayMs * Math.pow(retry.backoffMultiplier, attempt - 1),
        retry.maxDelayMs
      );

      logger.warn(
        `OpenAI Image API call failed (attempt ${attempt}/${retry.maxRetries + 1}). Retrying in ${delay}ms...`,
        {
          component: 'openai-image-client',
          error: (error as Error).message,
        }
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted - log error
  const errorMessage = lastError?.message || 'Unknown error';
  const isTimeout = errorMessage.toLowerCase().includes('timeout');
  const isRateLimited =
    errorMessage.toLowerCase().includes('rate limit') ||
    errorMessage.toLowerCase().includes('429');

  await tracker.error({
    model,
    errorCode: isRateLimited ? 'RATE_LIMITED' : isTimeout ? 'TIMEOUT' : 'API_ERROR',
    errorMessage,
    endpoint: 'images.generate',
    isTimeout,
    isRateLimited,
  });

  // Also log to error tracking system
  await logError({
    errorType: isTimeout ? 'timeout' : isRateLimited ? 'rate_limit' : 'api_error',
    errorCode: isRateLimited ? '429' : undefined,
    errorMessage,
    shopId,
    endpoint: 'images.generate',
    operationType,
    requestData: {
      model,
      attempts: retry.maxRetries + 1,
      quality,
      size,
    },
  });

  throw new OpenAIImageError(
    `OpenAI Image API call failed after ${retry.maxRetries + 1} attempts: ${lastError?.message}`,
    lastError
  );
}

/**
 * Generate image using the create endpoint
 */
async function generateWithCreate(
  client: OpenAI,
  prompt: string,
  model: OpenAIImageModel,
  quality: ImageQuality,
  size: OpenAIImageSize,
  questionnaireAnswers?: QuestionnaireAnswerInput[]
): Promise<{ imageData: string; promptDebug: PromptDebugInfo }> {
  // Only gpt-image-1 is supported (DALL-E 3 removed - doesn't support reference images)
  const apiModel = 'gpt-image-1';

  // Parse prompt and build enhanced version for better results
  const parsedPrompt = parsePrompt(prompt, questionnaireAnswers);
  const aspectRatio = sizeToAspectRatio(size);

  // Extract explicit product size from questionnaire answers (if provided)
  const productSize = questionnaireAnswers?.find(a => a.questionId === 'productSize')?.answer as ProductSize | undefined;

  const enhancedPrompt = buildEnhancedPrompt(parsedPrompt, aspectRatio, false, productSize);

  // Build prompt debug info
  const promptDebug: PromptDebugInfo = {
    originalPrompt: prompt,
    environmentType: parsedPrompt.environmentType,
    confidence: parsedPrompt.confidence,
    location: parsedPrompt.location,
    mood: parsedPrompt.mood,
    lighting: parsedPrompt.lighting,
    productType: parsedPrompt.productType,
    productCategory: parsedPrompt.productCategory,
    photographyStyle: parsedPrompt.photographyStyle,
    atmosphereIntent: parsedPrompt.atmosphereIntent,
    negativePrompts: parsedPrompt.negativePrompts,
    enhancedPrompt,
    provider: 'openai',
    model,
    timestamp: new Date().toISOString(),
  };

  logger.info('OpenAI generateWithCreate - using enhanced prompt', {
    component: 'openai-image-client',
    originalPrompt: prompt,
    environmentType: parsedPrompt.environmentType,
    confidence: parsedPrompt.confidence,
    productType: parsedPrompt.productType,
    enhancedPromptLength: enhancedPrompt.length,
    enhancedPromptPreview: enhancedPrompt.substring(0, 500),
  });

  // gpt-image-1 doesn't support response_format, always returns base64
  // DALL-E 3 supports response_format
  if (model === 'gpt-image-1') {
    const response = await client.images.generate({
      model: apiModel,
      prompt: enhancedPrompt,
      n: 1,
      size: size as '1024x1024' | '1536x1024' | '1024x1536',
      quality: quality === 'hd' ? 'hd' : 'standard',
    });

    const imageData = response.data;
    if (!imageData || imageData.length === 0) {
      throw new Error('No image data in OpenAI response');
    }

    // gpt-image-1 returns base64 in b64_json field
    const imageB64 = imageData[0]?.b64_json;
    if (!imageB64) {
      throw new Error('No base64 data in OpenAI response');
    }

    return { imageData: `data:image/png;base64,${imageB64}`, promptDebug };
  } else {
    // DALL-E 3 supports response_format
    const response = await client.images.generate({
      model: apiModel,
      prompt: enhancedPrompt,
      n: 1,
      size: size as '1024x1024' | '1536x1024' | '1024x1536',
      quality: quality === 'hd' ? 'hd' : 'standard',
      response_format: 'b64_json',
    });

    const imageData = response.data;
    if (!imageData || imageData.length === 0) {
      throw new Error('No image data in OpenAI response');
    }

    const imageB64 = imageData[0]?.b64_json;
    if (!imageB64) {
      throw new Error('No base64 data in OpenAI response');
    }

    return { imageData: `data:image/png;base64,${imageB64}`, promptDebug };
  }
}

/**
 * Generate image using the edit endpoint with reference image
 *
 * NOTE: Mask-based background replacement is currently disabled due to
 * native dependency conflicts with @imgly/background-removal-node (sharp module).
 *
 * Current behavior:
 * - Uses OpenAI's edit API with the reference image
 * - Relies on strong prompt instructions to preserve product identity
 * - Less precise than mask-based approach but functional
 *
 * Future improvement: Integrate cloud-based background removal API
 * (e.g., Remove.bg, Photoroom API, Replicate's background removal models)
 */
async function generateWithEdit(
  client: OpenAI,
  prompt: string,
  referenceImage: string,
  model: OpenAIImageModel,
  quality: ImageQuality,
  size: OpenAIImageSize,
  questionnaireAnswers?: QuestionnaireAnswerInput[]
): Promise<{ imageData: string; promptDebug: PromptDebugInfo }> {
  // Parse prompt and build enhanced version using shared parser
  const parsedPrompt = parsePrompt(prompt, questionnaireAnswers);
  const aspectRatio = sizeToAspectRatio(size);

  // Extract explicit product size from questionnaire answers (if provided)
  const productSize = questionnaireAnswers?.find(a => a.questionId === 'productSize')?.answer as ProductSize | undefined;

  // Build a prompt that emphasizes product preservation with size-aware framing
  const editPrompt = buildEditPromptWithProductPreservation(parsedPrompt, aspectRatio, productSize);

  // Build prompt debug info
  const promptDebug: PromptDebugInfo = {
    originalPrompt: prompt,
    environmentType: parsedPrompt.environmentType,
    confidence: parsedPrompt.confidence,
    location: parsedPrompt.location,
    mood: parsedPrompt.mood,
    lighting: parsedPrompt.lighting,
    productType: parsedPrompt.productType,
    productCategory: parsedPrompt.productCategory,
    photographyStyle: parsedPrompt.photographyStyle,
    atmosphereIntent: parsedPrompt.atmosphereIntent,
    negativePrompts: parsedPrompt.negativePrompts,
    props: parsedPrompt.props,
    enhancedPrompt: editPrompt,
    provider: 'openai',
    model,
    timestamp: new Date().toISOString(),
  };

  logger.info('OpenAI generateWithEdit - using reference image without mask', {
    component: 'openai-image-client',
    originalPrompt: prompt,
    environmentType: parsedPrompt.environmentType,
    confidence: parsedPrompt.confidence,
    productType: parsedPrompt.productType,
    props: parsedPrompt.props,
    hasReferenceImage: true,
    editPromptLength: editPrompt.length,
  });

  // Convert reference image to File object for OpenAI API
  let rawBase64 = referenceImage;
  let mimeType = 'image/png';

  const dataUrlMatch = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    rawBase64 = dataUrlMatch[2];
  }

  const imageBuffer = Buffer.from(rawBase64, 'base64');
  const imageFile = new File([imageBuffer], 'reference.png', { type: mimeType });

  // Call OpenAI edit API with image (no mask - relies on prompt for preservation)
  logger.info('Calling OpenAI edit API with reference image', {
    component: 'openai-image-client',
    model,
    size,
  });

  // Only gpt-image-1 is supported for edit operations
  const editModel = 'gpt-image-1';
  const editSize = size === '1536x1024' || size === '1024x1536' ? '1024x1024' : (size as '1024x1024');

  const response = await client.images.edit({
    model: editModel,
    image: imageFile,
    prompt: editPrompt,
    n: 1,
    size: editSize,
  });

  const imageData = response.data;
  if (!imageData || imageData.length === 0) {
    throw new Error('No image data in OpenAI edit response');
  }

  const imageB64 = imageData[0]?.b64_json;
  if (!imageB64) {
    throw new Error('No base64 data in OpenAI edit response');
  }

  logger.info('Image edit with reference completed successfully', {
    component: 'openai-image-client',
    model,
  });

  return { imageData: `data:image/png;base64,${imageB64}`, promptDebug };
}

/**
 * Size-specific framing instructions for edit prompts
 * These are critical for maintaining proper product scale in generated images
 */
const EDIT_SIZE_FRAMING_INSTRUCTIONS: Record<ProductSize, string> = {
  tiny: `SCALE: This is a TINY product (jewelry, coins). Show it at realistic small scale. Include contextual elements like hands or surfaces to convey size.`,

  small: `SCALE: This is a SMALL handheld product. Show it at realistic scale relative to surrounding objects.`,

  tabletop: `SCALE: This is a TABLETOP/DECORATIVE item (6-24 inches). It should appear appropriately sized for a table, shelf, or mantel - NOT floor-standing. Show it ON a surface.`,

  medium: `SCALE: This is a MEDIUM-sized product (desk/counter item). Show it at realistic desk or counter scale.`,

  large: `SCALE: This is a LARGE floor-standing product (3-6 feet). Show full height from floor level with room context.`,

  xlarge: `SCALE: This is EXTRA LARGE furniture-sized product. Show in room context with proper human-scale reference points.`,
};

/**
 * Build a prompt for edit API that emphasizes product preservation
 * Used when mask-based editing is not available
 */
function buildEditPromptWithProductPreservation(
  parsed: ReturnType<typeof parsePrompt>,
  aspectRatio: string,
  explicitSize?: ProductSize
): string {
  const { environmentType, location, placement, lighting, mood, photographyStyle, atmosphereIntent, props } = parsed;

  const parts: string[] = [];

  // CRITICAL: Product preservation instructions (strongest possible language)
  parts.push(
    'CRITICAL: Keep the product in the reference image EXACTLY as it is. ' +
      'Do NOT modify, replace, or alter the product in any way. ' +
      'Only change the background/environment around it.'
  );

  // Add size-specific framing instructions if explicit size provided
  if (explicitSize && EDIT_SIZE_FRAMING_INSTRUCTIONS[explicitSize]) {
    parts.push(EDIT_SIZE_FRAMING_INSTRUCTIONS[explicitSize]);
    parts.push('IMPORTANT: Do NOT resize or rescale the product. Maintain its exact proportions from the reference image.');
  }

  // Style instruction
  switch (photographyStyle) {
    case 'ugc':
      parts.push('Create an authentic, natural setting like a real customer photo.');
      break;
    case 'editorial':
      parts.push('Create a high-fashion editorial setting with dramatic styling.');
      break;
    default:
      parts.push('Create a professional product photography setting with excellent lighting.');
  }

  // Environment/scene description
  if (environmentType === 'indoor' && location.type) {
    parts.push(`Place in an indoor ${location.type} setting.`);
  } else if (environmentType === 'outdoor' && location.type) {
    parts.push(`Place in an outdoor ${location.type} setting.`);
  } else {
    parts.push(`Create scene based on: "${parsed.originalPrompt}".`);
  }

  // Surface/placement
  if (placement.surface) {
    parts.push(`Position the product on ${placement.surface}.`);
  }

  // Lighting
  if (lighting.type || lighting.quality || lighting.timeOfDay) {
    const lightingDesc = [lighting.type, lighting.quality, lighting.timeOfDay].filter(Boolean).join(', ');
    parts.push(`Use ${lightingDesc} lighting.`);
  }

  // Mood/atmosphere
  if (atmosphereIntent) {
    const moodMap: Record<string, string> = {
      luxury: 'Luxurious and premium atmosphere.',
      everyday: 'Casual, approachable everyday setting.',
      bold: 'Bold and dramatic atmosphere.',
      minimal: 'Clean, minimalist background.',
      cozy: 'Warm, cozy, inviting atmosphere.',
      energetic: 'Vibrant, energetic setting.',
      natural: 'Natural, organic, authentic feel.',
    };
    parts.push(moodMap[atmosphereIntent] || '');
  } else if (mood.primary) {
    parts.push(`${mood.primary} atmosphere.`);
  }

  // Seasonal
  if (mood.seasonal) {
    parts.push(`${mood.seasonal} seasonal theme.`);
  }

  // Props and accessories - CRITICAL for scene accuracy
  if (props && props.length > 0) {
    parts.push(`IMPORTANT: Include these specific elements in the scene: ${props.join(', ')}.`);
  }

  // Reiterate product preservation
  parts.push('The product must remain identical to the reference - exact same shape, color, details, and appearance.');

  // Format
  parts.push(`Output in ${aspectRatio} aspect ratio.`);

  // Quality
  parts.push('High resolution, professional quality.');

  return parts.filter(Boolean).join(' ');
}

/**
 * Build a prompt focused solely on background/environment generation
 * Since the mask protects the product, we don't need preservation instructions
 * NOTE: Currently unused since mask-based editing is disabled
 */
function buildBackgroundOnlyPrompt(parsed: ReturnType<typeof parsePrompt>, aspectRatio: string): string {
  const { environmentType, location, placement, lighting, mood, photographyStyle, atmosphereIntent } = parsed;

  const parts: string[] = [];

  // Style instruction
  switch (photographyStyle) {
    case 'ugc':
      parts.push('Create an authentic, natural background setting like a real customer photo.');
      break;
    case 'editorial':
      parts.push('Create a high-fashion editorial background with dramatic styling.');
      break;
    default:
      parts.push('Create a professional product photography background with excellent lighting.');
  }

  // Environment/scene description
  if (environmentType === 'indoor' && location.type) {
    parts.push(`Indoor ${location.type} setting.`);
  } else if (environmentType === 'outdoor' && location.type) {
    parts.push(`Outdoor ${location.type} setting.`);
  } else {
    parts.push(`Scene based on: "${parsed.originalPrompt}".`);
  }

  // Surface/placement
  if (placement.surface) {
    parts.push(`Product placed on ${placement.surface}.`);
  }

  // Lighting
  if (lighting.type || lighting.quality || lighting.timeOfDay) {
    const lightingDesc = [lighting.type, lighting.quality, lighting.timeOfDay]
      .filter(Boolean)
      .join(', ');
    parts.push(`Lighting: ${lightingDesc}.`);
  }

  // Mood/atmosphere
  if (atmosphereIntent) {
    const moodMap: Record<string, string> = {
      luxury: 'Luxurious and premium atmosphere.',
      everyday: 'Casual, approachable everyday setting.',
      bold: 'Bold and dramatic atmosphere.',
      minimal: 'Clean, minimalist background.',
      cozy: 'Warm, cozy, inviting atmosphere.',
      energetic: 'Vibrant, energetic setting.',
      natural: 'Natural, organic, authentic feel.',
    };
    parts.push(moodMap[atmosphereIntent] || '');
  } else if (mood.primary) {
    parts.push(`${mood.primary} atmosphere.`);
  }

  // Seasonal
  if (mood.seasonal) {
    parts.push(`${mood.seasonal} seasonal theme.`);
  }

  // Format
  parts.push(`Output in ${aspectRatio} aspect ratio.`);

  // Quality requirements
  parts.push('High resolution, professional quality, cohesive scene that complements the product.');

  return parts.filter(Boolean).join(' ');
}

/**
 * Get cost in cents for a given model/quality/size combination
 */
function getCostForModel(
  model: OpenAIImageModel,
  quality: ImageQuality,
  size: OpenAIImageSize
): number {
  // GPT Image 1 pricing (per image)
  if (model === 'gpt-image-1') {
    if (quality === 'hd') {
      // HD quality pricing
      if (size === '1024x1024') return 2; // $0.02
      if (size === '1536x1024' || size === '1024x1536') return 2; // $0.02
      return 1; // Default $0.01
    }
    // Standard quality pricing
    if (size === '1024x1024') return 1; // $0.01
    if (size === '1536x1024' || size === '1024x1536') return 1; // $0.01
    return 1; // $0.01
  }

  // Note: DALL-E 3 pricing removed - model no longer supported (doesn't support reference images)

  return 1; // Default fallback for gpt-image-1
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Don't retry on authentication errors
  if (
    message.includes('authentication') ||
    message.includes('api key') ||
    message.includes('invalid_api_key') ||
    message.includes('unauthorized')
  ) {
    return true;
  }

  // Don't retry on invalid request errors
  if (message.includes('invalid') || message.includes('malformed') || message.includes('bad request')) {
    return true;
  }

  // Don't retry on quota exceeded
  if (message.includes('quota') || message.includes('billing')) {
    return true;
  }

  // Don't retry on content policy violations
  if (message.includes('safety') || message.includes('content policy') || message.includes('rejected')) {
    return true;
  }

  return false;
}

/**
 * Estimate token count for prompt
 */
function estimatePromptTokens(prompt: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(prompt.length / 4);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Custom error class for OpenAI Image errors
 */
export class OpenAIImageError extends Error {
  originalError: Error | null;

  constructor(message: string, originalError: Error | null = null) {
    super(message);
    this.name = 'OpenAIImageError';
    this.originalError = originalError;
  }
}

/**
 * Check if OpenAI API key is configured
 */
export function isOpenAIImageConfigured(): boolean {
  try {
    getOpenAIKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get available OpenAI image models
 * Note: DALL-E 3 was removed because it doesn't support the images.edit API
 * required for incorporating reference images. Only gpt-image-1 supports this.
 */
export function getAvailableOpenAIModels(): OpenAIImageModel[] {
  return ['gpt-image-1'];
}
