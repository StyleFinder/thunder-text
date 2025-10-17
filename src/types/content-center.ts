// Content Creation Center TypeScript Types
// Generated: 2025-10-16

// ============================================================================
// Database Model Types
// ============================================================================

export interface ContentSample {
  id: string
  store_id: string
  sample_name?: string
  sample_text: string
  sample_type: 'blog' | 'email' | 'description' | 'other'
  word_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BrandVoiceProfile {
  id: string
  store_id: string
  profile_text: string
  profile_version: number
  is_current: boolean
  user_edited: boolean
  generated_at: string
  sample_ids: string[]
}

export interface GeneratedContent {
  id: string
  store_id: string
  content_type: 'blog' | 'ad' | 'store_copy' | 'social_facebook' | 'social_instagram' | 'social_tiktok'
  platform?: 'facebook' | 'instagram' | 'tiktok'
  topic: string
  generated_text: string
  word_count: number
  generation_params?: GenerationParams
  product_images?: string[]
  is_saved: boolean
  created_at: string
}

export interface GenerationParams {
  word_count: number
  tone_intensity: number // 1-5
  cta_type: 'shop_now' | 'learn_more' | 'visit_website' | 'contact_us' | 'custom'
  custom_cta?: string
}

// ============================================================================
// API Request Types
// ============================================================================

// POST /api/content-center/samples
export interface CreateSampleRequest {
  sample_name?: string
  sample_text: string
  sample_type: 'blog' | 'email' | 'description' | 'other'
}

// PATCH /api/content-center/samples/:id
export interface UpdateSampleRequest {
  sample_name?: string
  is_active?: boolean
  sample_text?: string
  sample_type?: 'blog' | 'email' | 'description' | 'other'
}

// POST /api/content-center/voice/generate
export interface GenerateVoiceProfileRequest {
  // No body params - uses active samples from database
}

// PATCH /api/content-center/voice/:id
export interface UpdateVoiceProfileRequest {
  profile_text: string
}

// POST /api/content-center/generate
export interface GenerateContentRequest {
  content_type: 'blog' | 'ad' | 'store_copy' | 'social_facebook' | 'social_instagram' | 'social_tiktok'
  topic: string
  word_count: number // 500-2000
  tone_intensity: number // 1-5
  cta_type: 'shop_now' | 'learn_more' | 'visit_website' | 'contact_us' | 'custom'
  custom_cta?: string
  platform?: 'facebook' | 'instagram' | 'tiktok'
  product_images?: string[]
  save?: boolean // If true, saves to library immediately
}

// POST /api/content-center/templates/from-voice
export interface CreateVoiceTemplateRequest {
  template_name: string
  product_category: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// GET /api/content-center/samples
export interface ListSamplesResponse {
  samples: ContentSample[]
  active_count: number
  total_count: number
}

// POST /api/content-center/samples
export interface CreateSampleResponse {
  sample: ContentSample
  word_count: number
}

// POST /api/content-center/voice/generate
export interface GenerateVoiceProfileResponse {
  profile: BrandVoiceProfile
  generation_time_ms: number
}

// GET /api/content-center/voice
export interface GetVoiceProfileResponse {
  profile: BrandVoiceProfile | null
  has_sufficient_samples: boolean
  active_sample_count: number
}

// GET /api/content-center/voice/history
export interface VoiceProfileHistoryResponse {
  profiles: BrandVoiceProfile[]
  current_profile_id: string | null
}

// POST /api/content-center/generate
export interface GenerateContentResponse {
  content: GeneratedContent
  generation_time_ms: number
  cost_estimate: number // In USD
}

// GET /api/content-center/content
export interface ListContentResponse {
  content: GeneratedContent[]
  total_count: number
  page: number
  page_size: number
}

// POST /api/content-center/templates/from-voice
export interface CreateVoiceTemplateResponse {
  template_id: string
  template_name: string
  system_prompt: string
}

// ============================================================================
// Error Types
// ============================================================================

export class ContentCenterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ContentCenterError'
  }
}

export class InsufficientSamplesError extends ContentCenterError {
  constructor(currentCount: number, requiredCount: number = 3) {
    super(
      `Insufficient samples: ${currentCount}/${requiredCount}. Please upload at least ${requiredCount} active samples.`,
      'INSUFFICIENT_SAMPLES',
      400
    )
  }
}

export class SampleLimitError extends ContentCenterError {
  constructor(limit: number = 10) {
    super(
      `Sample limit reached: maximum ${limit} samples per user.`,
      'SAMPLE_LIMIT_REACHED',
      400
    )
  }
}

export class VoiceProfileNotFoundError extends ContentCenterError {
  constructor() {
    super(
      'No voice profile found. Please generate a voice profile first by uploading samples.',
      'VOICE_PROFILE_NOT_FOUND',
      404
    )
  }
}

export class InvalidWordCountError extends ContentCenterError {
  constructor(wordCount: number) {
    super(
      `Invalid word count: ${wordCount}. Must be between 500 and 5000.`,
      'INVALID_WORD_COUNT',
      400
    )
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type ContentType = GeneratedContent['content_type']
export type Platform = NonNullable<GeneratedContent['platform']>
export type SampleType = ContentSample['sample_type']
export type CTAType = GenerationParams['cta_type']

// Pagination params
export interface PaginationParams {
  page?: number
  page_size?: number
}

// Filter params for content list
export interface ContentFilterParams extends PaginationParams {
  content_type?: ContentType
  platform?: Platform
  is_saved?: boolean
  date_from?: string
  date_to?: string
  search?: string
}
