'use client'

/**
 * Campaign Selector Component
 *
 * Allows users to select a Facebook ad account and campaign
 * Used when creating Facebook ads from product descriptions
 */

import { useState, useEffect } from 'react'
import {
  BlockStack,
  InlineStack,
  Text,
  Select,
  Spinner,
  Banner,
  Button,
  Badge
} from '@shopify/polaris'

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
  onSelect: (adAccountId: string, campaignId: string) => void
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
      onSelect(currentAdAccountId, currentCampaignId)
    }
  }, [currentAdAccountId, currentCampaignId])

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
      console.error('Error fetching ad accounts:', err)
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
      console.error('Error fetching campaigns:', err)
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
        return <Badge tone="success">Active</Badge>
      case 'PAUSED':
        return <Badge tone="attention">Paused</Badge>
      case 'ARCHIVED':
        return <Badge>Archived</Badge>
      default:
        return <Badge tone="info">{status}</Badge>
    }
  }

  if (loadingAccounts) {
    return (
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">Select Campaign</Text>
        <InlineStack align="center" blockAlign="center" gap="200">
          <Spinner size="small" />
          <Text as="p" tone="subdued">Loading ad accounts...</Text>
        </InlineStack>
      </BlockStack>
    )
  }

  if (error) {
    return (
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">Select Campaign</Text>
        <Banner tone="critical" title="Error loading campaigns">
          <BlockStack gap="200">
            <Text as="p">{error}</Text>
            <Button onClick={() => fetchAdAccounts()}>Try Again</Button>
          </BlockStack>
        </Banner>
      </BlockStack>
    )
  }

  if (adAccounts.length === 0) {
    return (
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">Select Campaign</Text>
        <Banner tone="warning" title="No ad accounts found">
          <Text as="p">
            No Facebook ad accounts were found for your connected account. Please ensure you have
            access to at least one ad account in Facebook Business Manager.
          </Text>
        </Banner>
      </BlockStack>
    )
  }

  const selectedCampaign = campaigns.find(c => c.id === currentCampaignId)

  return (
    <BlockStack gap="400">
      <Text as="h3" variant="headingMd">Select Campaign</Text>

      <BlockStack gap="300">
        {/* Ad Account Selector */}
        <Select
          label="Ad Account"
          options={[
            { label: 'Select an ad account', value: '' },
            ...adAccounts.map(account => ({
              label: `${account.name} (${account.account_id})`,
              value: account.id
            }))
          ]}
          value={currentAdAccountId}
          onChange={setCurrentAdAccountId}
        />

        {/* Campaign Selector */}
        {currentAdAccountId && (
          <>
            {loadingCampaigns ? (
              <InlineStack align="center" blockAlign="center" gap="200">
                <Spinner size="small" />
                <Text as="p" tone="subdued">Loading campaigns...</Text>
              </InlineStack>
            ) : campaigns.length === 0 ? (
              <Banner tone="warning" title="No active campaigns">
                <Text as="p">
                  No active campaigns found for this ad account. Please create a campaign in
                  Facebook Ads Manager before continuing.
                </Text>
              </Banner>
            ) : (
              <Select
                label="Campaign"
                options={[
                  { label: 'Select a campaign', value: '' },
                  ...campaigns.map(campaign => ({
                    label: campaign.name,
                    value: campaign.id
                  }))
                ]}
                value={currentCampaignId}
                onChange={setCurrentCampaignId}
              />
            )}
          </>
        )}

        {/* Selected Campaign Details */}
        {selectedCampaign && (
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" fontWeight="semibold">Campaign Details:</Text>
            <InlineStack gap="200" wrap={false}>
              {getStatusBadge(selectedCampaign.status)}
              <Text as="p" variant="bodySm" tone="subdued">
                {selectedCampaign.objective}
              </Text>
            </InlineStack>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm">
                Daily Budget: <Text as="span" fontWeight="medium">{formatBudget(selectedCampaign.daily_budget)}</Text>
              </Text>
              {selectedCampaign.lifetime_budget && (
                <Text as="p" variant="bodySm">
                  Lifetime Budget: <Text as="span" fontWeight="medium">{formatBudget(selectedCampaign.lifetime_budget)}</Text>
                </Text>
              )}
            </BlockStack>
          </BlockStack>
        )}
      </BlockStack>
    </BlockStack>
  )
}
