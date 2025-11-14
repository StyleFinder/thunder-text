/**
 * Facebook Marketing API Type Definitions
 * Provides type safety for Facebook API responses and data structures
 */

export interface FacebookIntegration {
  id: string
  shop_id: string
  provider: string
  provider_account_id: string
  provider_account_name: string | null
  encrypted_access_token: string
  encrypted_refresh_token: string | null
  token_expires_at: string | null
  is_active: boolean
  additional_metadata: FacebookMetadata | null
}

export interface FacebookMetadata {
  ad_accounts?: Array<{
    id: string
    name: string
    account_id?: string
    currency?: string
    timezone_name?: string
  }>
  [key: string]: unknown
}

export interface AdAccount {
  id: string
  account_id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
}

export interface Campaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: string
  lifetime_budget?: string
  created_time: string
  updated_time: string
}

export interface CampaignInsight {
  campaign_id: string
  campaign_name: string
  spend: number
  purchases: number
  purchase_value: number
  conversion_rate: number
  roas: number
}

export interface FacebookAPIResponse<T> {
  data: T
  error?: FacebookAPIErrorResponse
}

export interface FacebookAPIErrorResponse {
  message: string
  code?: string
  type?: string
}

export interface FacebookAction {
  action_type: string
  value: string
}

export interface FacebookActionValue {
  action_type: string
  value: string
}

export interface FacebookInsightData {
  campaign_id: string
  campaign_name: string
  spend: string
  clicks: string
  impressions: string
  actions?: FacebookAction[]
  action_values?: FacebookActionValue[]
}

export interface FacebookTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

export interface FacebookAdDraft {
  id: string
  shop_id: string
  campaign_id: string | null
  ad_account_id: string
  primary_text: string
  headline: string
  description: string
  product_id: string | null
  image_url: string | null
  status: 'draft' | 'submitted' | 'published' | 'error'
  created_at: string
  updated_at: string
}
