/**
 * Facebook Marketing API Service
 *
 * Handles all interactions with Facebook Marketing API v21.0
 * Includes token management, refresh logic, and error handling
 */

import { createClient } from '@supabase/supabase-js'
import { decryptToken, encryptToken } from './encryption'
import type {
  FacebookIntegration,
  AdAccount,
  Campaign,
  CampaignInsight,
  FacebookAPIResponse,
  FacebookInsightData,
  FacebookTokenResponse
} from '@/types/facebook'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const FACEBOOK_API_VERSION = 'v21.0'
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`

export class FacebookAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public errorType?: string
  ) {
    super(message)
    this.name = 'FacebookAPIError'
  }
}

/**
 * Get Facebook integration for a shop
 */
async function getIntegration(shopId: string): Promise<FacebookIntegration | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('shop_id', shopId)
    .eq('provider', 'facebook')
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching Facebook integration:', error)
    return null
  }

  return data as FacebookIntegration
}

/**
 * Check if access token is expired or about to expire (within 1 hour)
 */
function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false

  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  const oneHour = 60 * 60 * 1000

  return expiryTime - now < oneHour
}

/**
 * Refresh Facebook access token using long-lived token exchange
 */
async function refreshAccessToken(integration: FacebookIntegration): Promise<string> {
  try {
    const decryptedToken = await decryptToken(integration.encrypted_access_token)

    const url = new URL(`${FACEBOOK_GRAPH_URL}/oauth/access_token`)
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!)
    url.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET!)
    url.searchParams.set('fb_exchange_token', decryptedToken)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!response.ok || data.error) {
      throw new FacebookAPIError(
        data.error?.message || 'Failed to refresh token',
        response.status,
        data.error?.code,
        data.error?.type
      )
    }

    // Update token in database
    const newEncryptedToken = await encryptToken(data.access_token)
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

    await supabase
      .from('integrations')
      .update({
        encrypted_access_token: newEncryptedToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id)

    return data.access_token
  } catch (error) {
    console.error('Error refreshing Facebook token:', error)
    throw error
  }
}

/**
 * Get valid access token, refreshing if necessary
 */
async function getAccessToken(shopId: string): Promise<string> {
  const integration = await getIntegration(shopId)

  if (!integration) {
    throw new FacebookAPIError('Facebook account not connected', 404, 'NOT_CONNECTED')
  }

  // Check if token needs refresh
  if (isTokenExpired(integration.token_expires_at)) {
    return await refreshAccessToken(integration)
  }

  return await decryptToken(integration.encrypted_access_token)
}

/**
 * Make authenticated request to Facebook API
 */
async function makeRequest<T>(
  shopId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken(shopId)

  const url = new URL(`${FACEBOOK_GRAPH_URL}${endpoint}`)
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    throw new FacebookAPIError(
      data.error?.message || 'Facebook API request failed',
      response.status,
      data.error?.code,
      data.error?.type
    )
  }

  return data as T
}

/**
 * Get all ad accounts for the connected Facebook user
 */
export async function getAdAccounts(shopId: string): Promise<AdAccount[]> {
  try {
    const integration = await getIntegration(shopId)

    if (!integration) {
      throw new FacebookAPIError('Facebook account not connected', 404, 'NOT_CONNECTED')
    }

    const userId = integration.provider_account_id

    const data = await makeRequest<FacebookAPIResponse<AdAccount[]>>(
      shopId,
      `/${userId}/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name`
    )

    return data.data || []
  } catch (error) {
    console.error('Error fetching ad accounts:', error)
    throw error
  }
}

/**
 * Get campaigns for a specific ad account
 * Note: Facebook API doesn't support status filtering, so we filter client-side
 */
export async function getCampaigns(
  shopId: string,
  adAccountId: string,
  options: {
    status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
    limit?: number
  } = {}
): Promise<Campaign[]> {
  try {
    const { status, limit = 100 } = options

    const fields = 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time'
    const endpoint = `/${adAccountId}/campaigns?fields=${fields}&limit=${limit}`

    const data = await makeRequest<FacebookAPIResponse<Campaign[]>>(shopId, endpoint)

    let campaigns = data.data || []

    // Filter by status client-side if specified
    if (status) {
      campaigns = campaigns.filter(campaign => campaign.status === status)
    }

    return campaigns
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    throw error
  }
}

/**
 * Get a specific campaign by ID
 */
export async function getCampaign(
  shopId: string,
  campaignId: string
): Promise<Campaign> {
  try {
    const fields = 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time'

    const data = await makeRequest<Campaign>(
      shopId,
      `/${campaignId}?fields=${fields}`
    )

    return data
  } catch (error) {
    console.error('Error fetching campaign:', error)
    throw error
  }
}

/**
 * Check if Facebook integration is active for a shop
 */
export async function isFacebookConnected(shopId: string): Promise<boolean> {
  const integration = await getIntegration(shopId)
  return integration !== null && integration.is_active
}

/**
 * Get Facebook integration metadata (account name, ad accounts count)
 */
export async function getIntegrationInfo(shopId: string): Promise<{
  connected: boolean
  accountName: string | null
  adAccountsCount: number
  adAccounts: Array<{ id: string; name: string }>
}> {
  const integration = await getIntegration(shopId)

  if (!integration) {
    return {
      connected: false,
      accountName: null,
      adAccountsCount: 0,
      adAccounts: []
    }
  }

  const adAccounts = integration.additional_metadata?.ad_accounts || []

  return {
    connected: true,
    accountName: integration.provider_account_name,
    adAccountsCount: adAccounts.length,
    adAccounts: adAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name
    }))
  }
}

/**
 * Get campaign insights for active campaigns
 * Calculates conversion rate and ROAS from Facebook Ads Insights API
 */
export async function getCampaignInsights(
  shopId: string,
  adAccountId: string
): Promise<CampaignInsight[]> {
  try {
    // First, get all active campaigns
    const campaigns = await getCampaigns(shopId, adAccountId, { status: 'ACTIVE' })

    if (campaigns.length === 0) {
      return []
    }

    // Calculate date range in YYYY-MM-DD format (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const since = thirtyDaysAgo.toISOString().split('T')[0]
    const until = today.toISOString().split('T')[0]

    // Get insights for all active campaigns
    const fields = [
      'campaign_id',
      'campaign_name',
      'spend',
      'actions',
      'action_values',
      'impressions',
      'clicks'
    ].join(',')

    const timeRange = JSON.stringify({ since, until })
    const filtering = JSON.stringify([{
      field: 'campaign.effective_status',
      operator: 'IN',
      value: ['ACTIVE']
    }])

    const endpoint = `/${adAccountId}/insights?fields=${fields}&level=campaign&filtering=${encodeURIComponent(filtering)}&time_range=${encodeURIComponent(timeRange)}`

    const data = await makeRequest<FacebookAPIResponse<FacebookInsightData[]>>(shopId, endpoint)

    const insights: CampaignInsight[] = []

    for (const insight of data.data || []) {
      const spend = parseFloat(insight.spend || '0')
      const clicks = parseInt(insight.clicks || '0')

      // Extract purchase actions and values
      const actions = insight.actions || []
      const actionValues = insight.action_values || []

      const purchaseAction = actions.find((a) => a.action_type === 'purchase')
      const purchaseValue = actionValues.find((a) => a.action_type === 'purchase')

      const purchases = purchaseAction ? parseInt(purchaseAction.value) : 0
      const purchaseValueAmount = purchaseValue ? parseFloat(purchaseValue.value) : 0

      // Calculate conversion rate: (purchases / clicks) * 100
      const conversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0

      // Calculate ROAS: purchase_value / spend
      const roas = spend > 0 ? purchaseValueAmount / spend : 0

      insights.push({
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        spend,
        purchases,
        purchase_value: purchaseValueAmount,
        conversion_rate: conversionRate,
        roas
      })
    }

    return insights
  } catch (error) {
    console.error('Error fetching campaign insights:', error)
    throw error
  }
}
