'use client'

/**
 * Campaign Selector Component
 *
 * Allows users to select a Facebook ad account and campaign
 * Used when creating Facebook ads from product descriptions
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { logger } from '@/lib/logger'

interface AdAccount {
  id: string
  account_id: string
  name: string
  status: number
  currency: string
  timezone: string
}

interface Campaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: string
  lifetime_budget?: string
}

interface CampaignSelectorProps {
  shop: string
  onSelect: (adAccountId: string, campaignId: string, campaignName: string) => void
  selectedAdAccountId?: string
  selectedCampaignId?: string
}

export default function CampaignSelector({
  shop,
  onSelect,
  selectedAdAccountId,
  selectedCampaignId
}: CampaignSelectorProps) {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentAdAccountId, setCurrentAdAccountId] = useState(selectedAdAccountId || '')
  const [currentCampaignId, setCurrentCampaignId] = useState(selectedCampaignId || '')

  // Fetch ad accounts on mount
  useEffect(() => {
    fetchAdAccounts()
  }, [shop])

  // Fetch campaigns when ad account changes
  useEffect(() => {
    if (currentAdAccountId) {
      fetchCampaigns(currentAdAccountId)
    } else {
      setCampaigns([])
      setCurrentCampaignId('')
    }
  }, [currentAdAccountId])

  // Notify parent when selection changes
  useEffect(() => {
    if (currentAdAccountId && currentCampaignId) {
      const campaign = campaigns.find(c => c.id === currentCampaignId)
      if (campaign) {
        onSelect(currentAdAccountId, currentCampaignId, campaign.name)
      }
    }
  }, [currentAdAccountId, currentCampaignId, campaigns])

  const fetchAdAccounts = async () => {
    try {
      setLoadingAccounts(true)
      setError(null)

      const response = await fetch(`/api/facebook/ad-accounts?shop=${shop}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch ad accounts')
      }

      setAdAccounts(data.data || [])

      // Auto-select first account if none selected
      if (!currentAdAccountId && data.data.length > 0) {
        setCurrentAdAccountId(data.data[0].id)
      }
    } catch (err) {
      logger.error('Error fetching ad accounts:', err as Error, { component: 'CampaignSelector' })
      setError(err instanceof Error ? err.message : 'Failed to load ad accounts')
    } finally {
      setLoadingAccounts(false)
    }
  }

  const fetchCampaigns = async (adAccountId: string) => {
    try {
      setLoadingCampaigns(true)
      setError(null)

      const response = await fetch(
        `/api/facebook/campaigns?shop=${shop}&ad_account_id=${adAccountId}&status=ACTIVE`
      )
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch campaigns')
      }

      setCampaigns(data.data || [])

      // Auto-select first campaign if none selected
      if (!currentCampaignId && data.data.length > 0) {
        setCurrentCampaignId(data.data[0].id)
      }
    } catch (err) {
      logger.error('Error fetching campaigns:', err as Error, { component: 'CampaignSelector' })
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const formatBudget = (budget?: string): string => {
    if (!budget) return 'Not set'
    const amount = parseInt(budget) / 100 // Facebook returns cents
    return `$${amount.toLocaleString()}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Active</Badge>
      case 'PAUSED':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Paused</Badge>
      case 'ARCHIVED':
        return <Badge variant="outline">Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loadingAccounts) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Select Campaign</h3>
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading ad accounts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Select Campaign</h3>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Error loading campaigns</p>
            <p className="text-sm">{error}</p>
            <Button
              onClick={() => fetchAdAccounts()}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (adAccounts.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Select Campaign</h3>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">No ad accounts found</p>
            <p className="text-sm">
              No Facebook ad accounts were found for your connected account. Please ensure you have
              access to at least one ad account in Facebook Business Manager.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const selectedCampaign = campaigns.find(c => c.id === currentCampaignId)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Select Campaign</h3>

      <div className="space-y-4">
        {/* Ad Account Selector */}
        <div className="space-y-2">
          <Label htmlFor="ad-account">Ad Account</Label>
          <Select
            value={currentAdAccountId}
            onValueChange={setCurrentAdAccountId}
          >
            <SelectTrigger id="ad-account">
              <SelectValue placeholder="Select an ad account" />
            </SelectTrigger>
            <SelectContent>
              {adAccounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.account_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campaign Selector */}
        {currentAdAccountId && (
          <>
            {loadingCampaigns ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold">No active campaigns</p>
                  <p className="text-sm">
                    No active campaigns found for this ad account. Please create a campaign in
                    Facebook Ads Manager before continuing.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="campaign">Campaign</Label>
                <Select
                  value={currentCampaignId}
                  onValueChange={setCurrentCampaignId}
                >
                  <SelectTrigger id="campaign">
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {/* Selected Campaign Details */}
        {selectedCampaign && (
          <div className="space-y-2 p-3 bg-secondary/50 rounded-md">
            <p className="text-xs font-semibold text-foreground">Campaign Details:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(selectedCampaign.status)}
              <span className="text-xs text-muted-foreground">
                {selectedCampaign.objective}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-foreground">
                Daily Budget: <span className="font-medium">{formatBudget(selectedCampaign.daily_budget)}</span>
              </p>
              {selectedCampaign.lifetime_budget && (
                <p className="text-xs text-foreground">
                  Lifetime Budget: <span className="font-medium">{formatBudget(selectedCampaign.lifetime_budget)}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
