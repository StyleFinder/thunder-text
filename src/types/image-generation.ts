/**
 * Image Generation Types
 *
 * Type definitions for the AI image generation feature.
 * Uses OpenAI for image generation.
 */

// Provider types (OpenAI only)
export type ImageProvider = 'openai';

// Model types for OpenAI
// Note: DALL-E 3 was removed because it does not support the images.edit API
// which is required for incorporating reference images. Only gpt-image-1 supports this.
export type OpenAIImageModel = 'gpt-image-1';
export type ImageModel = OpenAIImageModel;

// Aspect ratio options
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

// Quality levels
export type ImageQuality = 'standard' | 'hd';

// Size options for OpenAI
export type OpenAIImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';

/**
 * Request to generate an image
 */
export interface ImageGenerationRequest {
  /** Text description of the desired image */
  prompt: string;
  /** Reference image as base64 or URL (optional) */
  referenceImage?: string;
  /** Preferred provider (user's choice) */
  provider: ImageProvider;
  /** Specific model to use (optional, defaults to best for provider) */
  model?: ImageModel;
  /** Image aspect ratio */
  aspectRatio?: AspectRatio;
  /** Image quality level */
  quality?: ImageQuality;
  /** Conversation ID for iteration tracking */
  conversationId?: string;
  /** Shop ID for usage tracking */
  shopId: string;
}

/**
 * Result from image generation
 */
export interface ImageGenerationResult {
  /** URL to the generated image (temporary, stored in Supabase) */
  imageUrl: string;
  /** Unique conversation ID for iteration */
  conversationId: string;
  /** Provider that generated the image */
  provider: ImageProvider;
  /** Model used for generation */
  model: string;
  /** Cost in cents */
  costCents: number;
  /** Whether fallback was used */
  usedFallback: boolean;
  /** Original prompt used */
  prompt: string;
  /** Generation timestamp */
  createdAt: string;
  /** Debug information about the prompt parsing (optional) */
  promptDebug?: PromptDebugInfo;
}

/**
 * Request to iterate/refine an existing image
 */
export interface ImageIterationRequest {
  /** Conversation ID from previous generation */
  conversationId: string;
  /** URL of the image to iterate on */
  previousImageUrl: string;
  /** Feedback/refinement instructions */
  feedback: string;
  /** Override provider for this iteration */
  provider?: ImageProvider;
  /** Shop ID for usage tracking */
  shopId: string;
}

/**
 * Request to save an image to the library
 */
export interface ImageSaveRequest {
  /** URL of the image to save */
  imageUrl: string;
  /** Conversation ID for tracking */
  conversationId: string;
  /** Optional product ID to associate with */
  productId?: string;
  /** Shop ID */
  shopId: string;
  /** Original prompt */
  prompt: string;
  /** Provider used */
  provider: ImageProvider;
  /** Model used */
  model: string;
}

/**
 * Saved image record from the library
 */
export interface SavedImage {
  /** Unique image ID */
  id: string;
  /** Shop ID */
  shopId: string;
  /** Conversation ID */
  conversationId: string;
  /** Permanent URL in Supabase storage */
  imageUrl: string;
  /** Original prompt */
  prompt: string;
  /** Reference image URL (if used) */
  referenceImageUrl?: string;
  /** Provider used */
  provider: ImageProvider;
  /** Model used */
  model: string;
  /** Cost in cents */
  costCents: number;
  /** Aspect ratio */
  aspectRatio?: AspectRatio;
  /** Whether this was marked as final/saved */
  isFinal: boolean;
  /** Associated product ID */
  productId?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Expiration date (30 days from creation) */
  expiresAt: string;
  /** Days until deletion */
  daysUntilExpiration: number;
}

/**
 * Chat message for the image generation conversation
 */
export interface ImageChatMessage {
  /** Unique message ID */
  id: string;
  /** Role: user prompt or AI response */
  role: 'user' | 'assistant';
  /** Text content of the message */
  content: string;
  /** Generated image URL (for assistant messages) */
  imageUrl?: string;
  /** Provider used (for assistant messages) */
  provider?: ImageProvider;
  /** Model used (for assistant messages) */
  model?: string;
  /** Cost in cents (for assistant messages) */
  costCents?: number;
  /** Timestamp */
  timestamp: string;
}

/**
 * Image generation conversation state (session-only)
 */
export interface ImageConversation {
  /** Conversation ID */
  id: string;
  /** Shop ID */
  shopId: string;
  /** Reference image (if uploaded) */
  referenceImage?: string;
  /** Selected provider */
  provider: ImageProvider;
  /** Chat messages */
  messages: ImageChatMessage[];
  /** Total cost accumulated */
  totalCostCents: number;
  /** Number of generations in this conversation */
  generationCount: number;
  /** Session start time */
  startedAt: string;
}

/**
 * Provider health status
 */
export interface ImageProviderHealth {
  /** Whether the provider is available */
  available: boolean;
  /** Whether the circuit breaker is open */
  circuitOpen: boolean;
  /** Number of recent failures */
  failureCount: number;
  /** Whether the provider is configured */
  configured: boolean;
}

/**
 * Combined system health for image generation
 */
export interface ImageSystemHealth {
  providers: {
    openai: ImageProviderHealth;
  };
  overall: {
    healthy: boolean;
    availableProviders: number;
  };
}

/**
 * Usage limits and tracking
 */
export interface ImageUsageLimits {
  /** Monthly generation limit */
  monthlyLimit: number;
  /** Generations used this month */
  usedThisMonth: number;
  /** Remaining generations */
  remaining: number;
  /** Plan name (starter/pro) */
  plan: 'starter' | 'pro';
  /** Reset date for the month */
  resetDate: string;
}

/**
 * Cost per image by provider/model
 */
export const IMAGE_COSTS: Record<string, number> = {
  // OpenAI models (cents) - prices vary by size, using standard
  'gpt-image-1': 1, // $0.01 (mini, standard quality)
  'gpt-image-1-hd': 2, // $0.02 (mini, HD quality)
};

/**
 * Default models per provider
 */
export const DEFAULT_MODELS: Record<ImageProvider, ImageModel> = {
  openai: 'gpt-image-1',
};

/**
 * Monthly credit limits by plan
 */
export const CREDIT_LIMITS: Record<string, number> = {
  starter: 50,
  pro: 100,
};

/**
 * Generated image for UI display (simplified interface)
 */
export interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  provider: ImageProvider;
  model: string;
  costCents: number;
  aspectRatio?: AspectRatio;
  isFinal: boolean;
  createdAt: string;
  conversationId?: string;
}

/**
 * Library image with expiration info (alias for SavedImage with UI-specific fields)
 */
export interface LibraryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  provider: ImageProvider;
  model: string;
  costCents: number;
  aspectRatio?: AspectRatio;
  createdAt: string;
  expiresAt: string;
  daysUntilExpiration: number;
  productId?: string;
}

/** Product type classification for adaptive framing */
export type ProductType = 'tall' | 'small' | 'tabletop' | 'standard';

/**
 * Product size for explicit user-specified scale control
 * Used to override automatic product type detection when user specifies size in questionnaire
 */
export type ProductSize = 'tiny' | 'small' | 'tabletop' | 'medium' | 'large' | 'xlarge';

/** Product category for scene selection */
export type ProductCategory = 'apparel' | 'jewelry' | 'shoes' | 'home_decor' | 'food_beverage' | 'tech' | 'beauty' | 'general';

/** Photography style (UGC vs professional) */
export type PhotographyStyle = 'professional' | 'ugc' | 'editorial';

/** Atmosphere intent for mood guidance */
export type AtmosphereIntent = 'luxury' | 'everyday' | 'bold' | 'minimal' | 'cozy' | 'energetic' | 'natural';

/**
 * Prompt debug information for session export
 */
export interface PromptDebugInfo {
  /** Original user prompt */
  originalPrompt: string;
  /** Detected environment type */
  environmentType: 'indoor' | 'outdoor' | 'studio' | 'ambiguous';
  /** Confidence score (0-1) */
  confidence: number;
  /** Detected location */
  location?: {
    type: string | null;
    category: string | null;
  };
  /** Detected mood */
  mood?: {
    primary: string | null;
    seasonal: string | null;
    style: string | null;
  };
  /** Detected lighting */
  lighting?: {
    type: string | null;
    quality: string | null;
    timeOfDay: string | null;
  };
  /** Detected product type for adaptive framing */
  productType?: ProductType;
  /** Product category for scene selection */
  productCategory?: ProductCategory;
  /** Photography style (professional, UGC, editorial) */
  photographyStyle?: PhotographyStyle;
  /** Atmosphere intent for mood guidance */
  atmosphereIntent?: AtmosphereIntent | null;
  /** Negative prompts (exclusions) */
  negativePrompts?: string[];
  /** Props and accessories detected in the prompt */
  props?: string[];
  /** The full enhanced prompt sent to the API */
  enhancedPrompt: string;
  /** Provider used */
  provider: ImageProvider;
  /** Model used */
  model: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Session export data for debugging and refinement
 */
export interface SessionExportData {
  /** Export version for compatibility */
  version: '1.0';
  /** Export timestamp */
  exportedAt: string;
  /** Session metadata */
  session: {
    conversationId: string | null;
    provider: ImageProvider;
    model: string;
    aspectRatio: AspectRatio;
    startedAt: string;
    totalCostCents: number;
    generationCount: number;
  };
  /** Reference image as base64 data URL */
  referenceImage: string | null;
  /** All chat messages with images */
  messages: Array<{
    id: string;
    type: 'user' | 'assistant' | 'error' | 'system' | 'question';
    content: string;
    timestamp: string;
    image?: {
      imageUrl: string;
      provider: ImageProvider;
      model: string;
      costCents: number;
      aspectRatio?: AspectRatio;
    };
    /** Prompt debug info for this message (if assistant with image) */
    promptDebug?: PromptDebugInfo;
  }>;
  /** All prompt debug logs from the session */
  promptLogs: PromptDebugInfo[];
}

// ===========================================
// Questionnaire Types
// ===========================================

/**
 * Single option for a questionnaire question
 */
export interface QuestionOption {
  /** Display label for the option */
  label: string;
  /** Value to store when selected */
  value: string;
  /** Optional emoji or icon name */
  icon?: string;
  /** Brief description shown on hover */
  description?: string;
}

/**
 * Question definition for the guided questionnaire
 */
export interface Question {
  /** Unique question identifier */
  id: string;
  /** Question text to display */
  text: string;
  /** Available options to choose from */
  options: QuestionOption[];
  /** Whether user can type a custom answer */
  allowCustom: boolean;
  /** Whether options are loaded dynamically (e.g., from Shopify) */
  isDynamic?: boolean;
  /** ID of the question that determines if this question is shown */
  conditionalOn?: string;
  /** Function to evaluate if this question should be shown based on answers */
  shouldShow?: (answers: QuestionnaireAnswer[]) => boolean;
}

/**
 * A user's answer to a questionnaire question
 */
export interface QuestionnaireAnswer {
  /** ID of the question answered */
  questionId: string;
  /** Text of the question */
  questionText: string;
  /** The answer value (from option or custom) */
  answer: string;
  /** Display label of the answer (for showing in chat) */
  answerLabel: string;
  /** Whether user typed a custom answer */
  isCustom: boolean;
}

/**
 * State of the questionnaire flow
 */
export interface QuestionnaireState {
  /** Current question index (0-based) */
  currentQuestionIndex: number;
  /** All answers collected so far */
  answers: QuestionnaireAnswer[];
  /** Whether questionnaire is complete */
  isComplete: boolean;
  /** Whether user skipped the questionnaire */
  wasSkipped: boolean;
}

/**
 * Intended use for the generated image
 */
export type IntendedUse = 'website' | 'social' | 'ads' | 'marketing';

/**
 * Environment setting for the image
 */
export type EnvironmentSetting = 'indoor_home' | 'indoor_commercial' | 'outdoor' | 'studio';

/**
 * Lighting preference for the image
 */
export type LightingPreference = 'natural' | 'warm' | 'bright' | 'dramatic';
