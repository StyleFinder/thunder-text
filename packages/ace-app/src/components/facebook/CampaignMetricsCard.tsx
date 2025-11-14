/**
 * Campaign Metrics Card
 *
 * Displays key Facebook ad metrics (Conversion Rate, ROAS, Spend) with color-coded
 * performance indicators based on benchmarks:
 * - GREEN: Above 3% (conversion rate) or 3x (ROAS)
 * - RED: Below 3% (conversion rate) or 3x (ROAS)
 */

import { useState, useEffect } from 'react'
import {
  Card,
  BlockStack,
  Text,
  InlineStack,
  Spinner,
  Banner,
  Box,
} from '@shopify/polaris'

interface CampaignInsight {
  campaign_id: string
  campaign_name: string
  spend: number
  purchases: number
  purchase_value: number
  conversion_rate: number
  roas: number
}

interface MetricsCardProps {
  shop: string
  adAccountId: string
}

const CONVERSION_BENCHMARK = 3 // 3%
const ROAS_BENCHMARK = 3 // 3x

export default function CampaignMetricsCard({ shop, adAccountId }: MetricsCardProps) {
  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (shop && adAccountId) {
      fetchMetrics()
    }
  }, [shop, adAccountId])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/facebook/insights?shop=${shop}&ad_account_id=${adAccountId}`
      )
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch metrics')
      }

      setInsights(data.data || [])
    } catch (err) {
      console.error('Error fetching campaign metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  // Calculate aggregated metrics across all active campaigns
  const totalSpend = insights.reduce((sum, i) => sum + i.spend, 0)
  const totalPurchaseValue = insights.reduce((sum, i) => sum + i.purchase_value, 0)
  const totalPurchases = insights.reduce((sum, i) => sum + i.purchases, 0)

  // Weighted average conversion rate and ROAS
  const avgConversionRate = insights.length > 0
    ? insights.reduce((sum, i) => sum + i.conversion_rate, 0) / insights.length
    : 0

  const overallROAS = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0

  // Determine colors based on benchmarks
  const conversionColor = avgConversionRate >= CONVERSION_BENCHMARK ? 'success' : 'critical'
  const roasColor = overallROAS >= ROAS_BENCHMARK ? 'success' : 'critical'

  if (loading) {
    return (
      <Card>
        <InlineStack align="center" blockAlign="center" gap="200">
          <Spinner size="small" />
          <Text as="p" tone="subdued">Loading campaign metrics...</Text>
        </InlineStack>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Banner tone="warning" title="Unable to load metrics">
          <p>{error}</p>
        </Banner>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card>
        <Banner tone="info" title="No active campaigns">
          <p>Create active campaigns to see performance metrics</p>
        </Banner>
      </Card>
    )
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            Campaign Performance (Last 30 Days)
          </Text>
          <InlineStack gap="200">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#108043', borderRadius: '2px' }}></div>
              <Text as="span" variant="bodySm" tone="subdued">≥3% or 3x</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#D72C0D', borderRadius: '2px' }}></div>
              <Text as="span" variant="bodySm" tone="subdued">&lt;3% or 3x</Text>
            </div>
          </InlineStack>
        </InlineStack>

        <div style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Conversion Rate */}
          <div style={{
            border: `3px solid ${conversionColor === 'success' ? '#108043' : '#D72C0D'}`,
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#FFFFFF',
            minWidth: '280px',
            flex: '1 1 280px'
          }}>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Conversion Rate
              </Text>
              <Text as="p" variant="heading2xl">
                {avgConversionRate.toFixed(2)}%
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Benchmark: {CONVERSION_BENCHMARK}%
              </Text>
            </BlockStack>
          </div>

          {/* ROAS */}
          <div style={{
            border: `3px solid ${roasColor === 'success' ? '#108043' : '#D72C0D'}`,
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#FFFFFF',
            minWidth: '280px',
            flex: '1 1 280px'
          }}>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                ROAS (Return on Ad Spend)
              </Text>
              <Text as="p" variant="heading2xl">
                {overallROAS.toFixed(2)}x
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Benchmark: {ROAS_BENCHMARK}x
              </Text>
            </BlockStack>
          </div>

          {/* Total Spend */}
          <div style={{
            border: '3px solid #E1E3E5',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#FFFFFF',
            minWidth: '280px',
            flex: '1 1 280px'
          }}>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Total Spend
              </Text>
              <Text as="p" variant="heading2xl">
                ${totalSpend.toFixed(2)}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {insights.length} active campaign{insights.length !== 1 ? 's' : ''}
              </Text>
            </BlockStack>
          </div>
        </div>

        {/* Campaign Details */}
        <BlockStack gap="200">
          <Text as="p" variant="headingSm">Campaign Breakdown</Text>
          {insights.map((insight) => {
            const campConvColor = insight.conversion_rate >= CONVERSION_BENCHMARK ? '#108043' : '#D72C0D'
            const campRoasColor = insight.roas >= ROAS_BENCHMARK ? '#108043' : '#D72C0D'

            return (
              <Box
                key={insight.campaign_id}
                padding="300"
                background="bg-surface-secondary"
                borderRadius="100"
              >
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {insight.campaign_name}
                  </Text>
                  <InlineStack gap="400" wrap={false}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: campConvColor,
                        borderRadius: '50%'
                      }}></div>
                      <Text as="span" variant="bodySm">
                        Conv: {insight.conversion_rate.toFixed(2)}%
                      </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: campRoasColor,
                        borderRadius: '50%'
                      }}></div>
                      <Text as="span" variant="bodySm">
                        ROAS: {insight.roas.toFixed(2)}x
                      </Text>
                    </div>
                    <Text as="span" variant="bodySm" tone="subdued">
                      Spend: ${insight.spend.toFixed(2)}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Box>
            )
          })}
        </BlockStack>
      </BlockStack>
    </Card>
  )
}
