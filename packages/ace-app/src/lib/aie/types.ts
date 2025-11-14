/**
 * Ad Intelligence Engine (AIE) - Type Definitions
 *
 * Core TypeScript types for the AIE module.
 * All AIE-specific types should be defined here to maintain consistency.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const AIE_PLATFORMS = ['meta', 'instagram', 'google', 'tiktok', 'pinterest'] as const;
export type AIEPlatform = typeof AIE_PLATFORMS[number];

export const AIE_GOALS = ['awareness', 'engagement', 'conversion', 'traffic', 'app_installs'] as const;
export type AIEGoal = typeof AIE_GOALS[number];

export const AIE_FORMATS = ['static', 'carousel', 'video', 'story', 'reel', 'collection'] as const;
export type AIEFormat = typeof AIE_FORMATS[number];

export const AIE_VARIANT_TYPES = ['emotional', 'benefit', 'ugc', 'storytelling', 'urgency', 'social_proof'] as const;
export type AIEVariantType = typeof AIE_VARIANT_TYPES[number];

export const AIE_HOOK_TYPES = ['pain_point', 'stat', 'question', 'benefit', 'urgency', 'testimonial', 'social_proof'] as const;
export type AIEHookType = typeof AIE_HOOK_TYPES[number];

export const AIE_TONES = ['casual', 'professional', 'playful', 'urgent', 'empathetic', 'authoritative'] as const;
export type AIETone = typeof AIE_TONES[number];

export const AIE_STATUS = ['pending', 'analyzing', 'generating', 'generated', 'approved', 'published', 'failed'] as const;
export type AIEStatus = typeof AIE_STATUS[number];

export const AIE_PERFORMANCE_TAGS = ['high', 'avg', 'low', 'untracked'] as const;
export type AIEPerformanceTag = typeof AIE_PERFORMANCE_TAGS[number];

// ============================================================================
// IMAGE ANALYSIS
// ============================================================================

export interface AIEImageAnalysisResult {
  category: string;
  subcategory?: string;
  tags: string[];
  colors: {
    dominant: string[];
    palette: string[];
  };
  mood: string[];
  scene_context: string[];
  text_detected?: string;
  object_count?: number;
  quality_score: number; // 0-1
  keywords: string[];
}

export interface AIEImageAnalysisCache {
  id: string;
  image_url: string;
  analysis_provider: 'openai_vision' | 'clip' | 'google_vision';
  category: string;
  subcategory?: string;
  tags: string[];
  colors: Record<string, unknown>;
  mood: string[];
  scene_context: string[];
  text_detected?: string;
  object_count?: number;
  quality_score: number;
  embedding?: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// RAG RETRIEVAL
// ============================================================================

export interface AIEBestPractice {
  id: string;
  title: string;
  platform: AIEPlatform | 'all';
  category: string;
  goal: AIEGoal | 'all';
  format?: AIEFormat | 'all';
  description: string;
  example_text?: string;
  framework_type?: string;
  source_type: 'public' | 'expert' | 'internal' | 'ai_generated';
  source_url?: string;
  source_author?: string;
  verification_status: 'pending' | 'verified' | 'outdated' | 'deprecated';
  verified_by?: string;
  verified_at?: string;
  expiry_reminder_date?: string;
  tags: string[];
  embedding?: number[];
  metadata: Record<string, unknown>;
  similarity?: number; // Added during retrieval
  boost_multiplier?: number; // Added during re-ranking
  final_score?: number; // Added during re-ranking
  created_at: string;
  updated_at: string;
}

export interface AIEAdExample {
  id: string;
  platform: AIEPlatform;
  format: AIEFormat;
  category: string;
  subcategory?: string;
  primary_text: string;
  headline?: string;
  description?: string;
  cta?: string;
  cta_type?: string;
  hook_type?: AIEHookType;
  tone?: AIETone;
  image_url?: string;
  video_url?: string;
  performance_metrics: Record<string, unknown>;
  performance_tag: AIEPerformanceTag;
  performance_percentile?: number;
  source: 'public' | 'anonymized_internal' | 'expert_upload' | 'swipe_file';
  source_store_id?: string;
  source_url?: string;
  contributed_by?: string;
  seasonal_tag?: string[];
  target_audience?: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  is_active: boolean;
  similarity?: number;
  boost_multiplier?: number;
  final_score?: number;
  created_at: string;
  updated_at: string;
}

export interface AIERetrievalContext {
  query_text: string;
  query_embedding: number[];
  best_practices: AIEBestPractice[];
  ad_examples: AIEAdExample[];
  total_similarity_score: number;
  retrieval_metadata: {
    best_practices_count: number;
    ad_examples_count: number;
    avg_similarity: number;
    retrieval_time_ms: number;
  };
}

export interface AIERetrievalParams {
  platform: AIEPlatform;
  goal: AIEGoal;
  category: string;
  userDescription: string;
  imageAnalysis: AIEImageAnalysisResult;
  brandVoice?: AIEBrandVoice;
  seasonalTags?: string[];
  format?: AIEFormat;
}

// ============================================================================
// AD GENERATION
// ============================================================================

export interface AIEBrandVoice {
  tone: string;
  values: string[];
  avoidList: string[];
  forbidden_words?: string[]; // Alias for avoidList
  sampleText?: string;
  example_copy?: string; // Alias for sampleText
}

export interface AIEGenerationRequest {
  shop_id: string;
  user_id?: string;
  product_id?: string;
  platform: AIEPlatform;
  goal: AIEGoal;
  format?: AIEFormat;
  description: string;
  image_url: string;
  image_analysis?: AIEImageAnalysisResult;
  brand_voice_override?: AIEBrandVoice;
  target_audience?: string;
  budget_range?: string;
  campaign_id?: string;
  ad_set_id?: string;
}

export interface AIEAdRequest {
  id: string;
  shop_id: string;
  user_id?: string;
  product_id?: string;
  platform: AIEPlatform;
  goal: AIEGoal;
  format?: AIEFormat;
  description: string;
  image_url: string;
  image_analysis: Record<string, unknown>;
  brand_voice_override?: Record<string, unknown>;
  target_audience?: string;
  budget_range?: string;
  campaign_id?: string;
  ad_set_id?: string;
  status: AIEStatus;
  error_message?: string;
  retry_count: number;
  generation_time_ms?: number;
  ai_cost: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AIEAdVariant {
  id: string;
  ad_request_id: string;
  variant_number: number; // 1, 2, or 3
  variant_type: AIEVariantType;
  headline: string;
  headline_alternatives: string[];
  primary_text: string;
  description?: string; // For Google Ads
  cta?: string;
  cta_rationale?: string;
  hook_technique: AIEHookType;
  tone: AIETone;
  predicted_score: number; // 0-1
  score_breakdown: {
    brand_fit: number;
    context_relevance: number;
    platform_compliance: number;
    hook_strength: number;
    cta_clarity: number;
  };
  generation_reasoning?: string;
  rag_context_used: {
    best_practice_ids: string[];
    example_ids: string[];
  };
  is_selected: boolean;
  user_edited: boolean;
  edit_history: Array<{
    field: string;
    old_value: string;
    new_value: string;
    edited_at: string;
  }>;
  published_at?: string;
  published_ad_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AIEConcept {
  type: AIEVariantType;
  hook: AIEHookType;
  tone: AIETone;
  key_message: string;
}

export interface AIEGenerationResponse {
  request_id: string;
  variants: AIEAdVariant[];
  generation_time_ms: number;
  ai_cost: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// SCORING
// ============================================================================

export interface AIEScoringResult {
  predicted_score: number; // 0-1
  score_breakdown: {
    brand_fit: number;
    context_relevance: number;
    platform_compliance: number;
    hook_strength: number;
    cta_clarity: number;
  };
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

export interface AIEAdPerformance {
  id: string;
  ad_variant_id: string;
  platform_ad_id: string;
  date: string; // Daily metrics
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roas?: number; // Return on Ad Spend
  ctr?: number; // Click-Through Rate
  cpc?: number; // Cost Per Click
  cpa?: number; // Cost Per Acquisition
  engagement_rate?: number;
  video_views?: number;
  video_completion_rate?: number;
  link_clicks?: number;
  post_engagement?: number;
  metadata: Record<string, unknown>;
  synced_at: string;
  created_at: string;
}

export interface AIEPerformanceMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpa: number;
  engagement_rate?: number;
}

// ============================================================================
// LEARNING LOOP & INSIGHTS
// ============================================================================

export interface AIELearningInsight {
  id: string;
  insight_type: 'best_performer' | 'trend' | 'pattern' | 'recommendation';
  platform: AIEPlatform;
  category?: string;
  goal?: AIEGoal;
  title: string;
  description: string;
  data_points_analyzed: number;
  confidence_score: number; // 0-1
  time_period_start?: string;
  time_period_end?: string;
  metrics: Record<string, unknown>;
  examples: string[]; // ad_variant_ids
  actionable_recommendation?: string;
  is_active: boolean;
  viewed_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EXPERT CONTRIBUTIONS
// ============================================================================

export interface AIEExpertContribution {
  id: string;
  expert_user_id: string;
  contribution_type: 'best_practice' | 'ad_example' | 'insight';
  referenced_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  reviewer_id?: string;
  review_notes?: string;
  reviewed_at?: string;
  impact_score?: number; // 0-1
  usage_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface AIEGenerateAPIRequest {
  shopId: string;
  platform: AIEPlatform;
  goal: AIEGoal;
  format?: AIEFormat;
  description: string;
  imageUrl: string;
  targetAudience?: string;
  campaignId?: string;
  adSetId?: string;
}

export interface AIEGenerateAPIResponse {
  success: boolean;
  requestId: string;
  variants: AIEAdVariant[];
  generationTimeMs: number;
  aiCost: number;
  error?: string;
}

export interface AIEPublishAPIRequest {
  requestId: string;
  variantId: string;
  adSetId: string;
}

export interface AIEPublishAPIResponse {
  success: boolean;
  adId: string;
  platform: AIEPlatform;
  status: 'published' | 'paused';
  error?: string;
}

export interface AIEMetricsSyncRequest {
  shopId: string;
  startDate?: string;
  endDate?: string;
}

export interface AIEMetricsSyncResponse {
  success: boolean;
  adsUpdated: number;
  metricsRecorded: number;
  errors: string[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AIEError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIEError';
  }
}

export class AIEImageAnalysisError extends AIEError {
  constructor(message: string, cause?: Error) {
    super(message, 'IMAGE_ANALYSIS_FAILED', 500, { cause });
    this.name = 'AIEImageAnalysisError';
  }
}

export class AIERAGRetrievalError extends AIEError {
  constructor(message: string, cause?: Error) {
    super(message, 'RAG_RETRIEVAL_FAILED', 500, { cause });
    this.name = 'AIERAGRetrievalError';
  }
}

export class AIEGenerationError extends AIEError {
  constructor(message: string, cause?: Error) {
    super(message, 'AD_GENERATION_FAILED', 500, { cause });
    this.name = 'AIEGenerationError';
  }
}

export class AIEPublishingError extends AIEError {
  constructor(message: string, cause?: Error) {
    super(message, 'PUBLISHING_FAILED', 500, { cause });
    this.name = 'AIEPublishingError';
  }
}

export class AIEAuthorizationError extends AIEError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', 403);
    this.name = 'AIEAuthorizationError';
  }
}

export class AIEValidationError extends AIEError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_FAILED', 400, { field });
    this.name = 'AIEValidationError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AIEDatabaseRecord<T> = T & {
  id: string;
  created_at: string;
  updated_at: string;
};

export type AIEPartial<T> = {
  [P in keyof T]?: T[P];
};

export type AIERequired<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

// ============================================================================
// TYPE ALIASES FOR BACKWARD COMPATIBILITY
// ============================================================================

export type AIERAGContext = AIERetrievalContext;
export type AIEAdVariantDraft = AIEAdVariant;
export type AIEHookTechnique = AIEHookType;
