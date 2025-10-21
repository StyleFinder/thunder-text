/**
 * Common API Type Definitions
 * Shared types for API responses and requests
 */

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: string
  code?: string
  type?: string
}

export interface APIError {
  message: string
  code?: string
  statusCode?: number
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

export interface ShopData {
  id: string
  shop_domain: string
  shop_name?: string
  created_at?: string
  updated_at?: string
}

export interface IntegrationData {
  id: string
  shop_id: string
  provider: string
  provider_account_id: string
  provider_account_name: string | null
  encrypted_access_token: string
  encrypted_refresh_token: string | null
  token_expires_at: string | null
  is_active: boolean
  additional_metadata?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export interface DatabaseQueryResult<T> {
  data: T | null
  error: {
    message: string
    details?: string
    hint?: string
    code?: string
  } | null
}

export interface ContentGenerationRequest {
  productId?: string
  productData?: Record<string, unknown>
  prompt?: string
  voiceId?: string
  styleGuide?: Record<string, unknown>
}

export interface ContentGenerationResponse {
  content: string
  metadata?: Record<string, unknown>
  tokens_used?: number
}

export interface VoiceProfile {
  id: string
  shop_id: string
  name: string
  description?: string
  tone?: string
  style_guide?: Record<string, unknown>
  examples?: string[]
  created_at?: string
  updated_at?: string
}
