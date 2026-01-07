/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * Centralized LLM Model Configuration
 *
 * GPT-4o-mini pricing (as of 2024):
 * - Input: $0.15 per 1M tokens ($0.00000015 per token)
 * - Output: $0.60 per 1M tokens ($0.0000006 per token)
 *
 * GPT-4o pricing (for vision tasks):
 * - Input: $2.50 per 1M tokens
 * - Output: $10.00 per 1M tokens
 */

// Model identifiers
export const MODELS = {
  // Primary model for text generation (cost-effective)
  TEXT: "gpt-4o-mini",

  // Vision model for image analysis (required for vision capabilities)
  VISION: "gpt-4o",

  // Embedding model for vector search
  EMBEDDING: "text-embedding-ada-002",
} as const;

// Model pricing per 1M tokens (in USD)
export const MODEL_PRICING = {
  "gpt-4o-mini": {
    input: 0.15, // $0.15 per 1M tokens
    output: 0.6, // $0.60 per 1M tokens
  },
  "gpt-4o": {
    input: 2.5, // $2.50 per 1M tokens
    output: 10.0, // $10.00 per 1M tokens
  },
  "text-embedding-ada-002": {
    input: 0.1, // $0.10 per 1M tokens
    output: 0, // No output tokens for embeddings
  },
} as const;

export type ModelName = keyof typeof MODEL_PRICING;

/**
 * Calculate cost for a given number of tokens
 */
export function calculateTokenCost(
  model: ModelName,
  inputTokens: number,
  outputTokens: number = 0,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    console.warn(`Unknown model: ${model}, using gpt-4o-mini pricing`);
    return calculateTokenCost("gpt-4o-mini", inputTokens, outputTokens);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return parseFloat((inputCost + outputCost).toFixed(6));
}

/**
 * Estimate cost before generation (assumes 50/50 input/output split)
 */
export function estimateCost(model: ModelName, totalTokens: number): number {
  const inputTokens = Math.floor(totalTokens * 0.5);
  const outputTokens = Math.floor(totalTokens * 0.5);
  return calculateTokenCost(model, inputTokens, outputTokens);
}

/**
 * Get the appropriate model for a task type
 */
export function getModelForTask(task: "text" | "vision" | "embedding"): string {
  switch (task) {
    case "vision":
      return MODELS.VISION;
    case "embedding":
      return MODELS.EMBEDDING;
    case "text":
    default:
      return MODELS.TEXT;
  }
}

/**
 * Check if a task requires vision capabilities
 */
export function requiresVision(hasImages: boolean): string {
  return hasImages ? MODELS.VISION : MODELS.TEXT;
}
