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
  Grid,
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
        <Text as="h3" variant="headingMd">
          Campaign Performance (Last 30 Days)
        </Text>

        <Grid columns={{ xs: 1, sm: 3 }} gap="400">
          {/* Conversion Rate */}
          <Box
            padding="400"
            background={conversionColor === 'success' ? 'bg-fill-success' : 'bg-fill-critical'}
            borderRadius="200"
          >
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone={conversionColor}>
                Conversion Rate
              </Text>
              <Text as="p" variant="headingLg" tone={conversionColor}>
                {avgConversionRate.toFixed(2)}%
              </Text>
              <Text as="p" variant="bodySm" tone={conversionColor}>
                Benchmark: {CONVERSION_BENCHMARK}%
              </Text>
            </BlockStack>
          </Box>

          {/* ROAS */}
          <Box
            padding="400"
            background={roasColor === 'success' ? 'bg-fill-success' : 'bg-fill-critical'}
            borderRadius="200"
          >
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone={roasColor}>
                ROAS
              </Text>
              <Text as="p" variant="headingLg" tone={roasColor}>
                {overallROAS.toFixed(2)}x
              </Text>
              <Text as="p" variant="bodySm" tone={roasColor}>
                Benchmark: {ROAS_BENCHMARK}x
              </Text>
            </BlockStack>
          </Box>

          {/* Total Spend */}
          <Box
            padding="400"
            background="bg-fill-secondary"
            borderRadius="200"
          >
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                Total Spend
              </Text>
              <Text as="p" variant="headingLg">
                ${totalSpend.toFixed(2)}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {insights.length} active campaign{insights.length !== 1 ? 's' : ''}
              </Text>
            </BlockStack>
          </Box>
        </Grid>

        {/* Campaign Details */}
        <BlockStack gap="200">
          <Text as="p" variant="headingSm">Campaign Breakdown</Text>
          {insights.map((insight) => (
            <Box
              key={insight.campaign_id}
              padding="300"
              background="bg-surface-secondary"
              borderRadius="100"
            >
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {insight.campaign_name}
                  </Text>
                  <InlineStack gap="400">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Conv: {insight.conversion_rate.toFixed(2)}%
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      ROAS: {insight.roas.toFixed(2)}x
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Spend: ${insight.spend.toFixed(2)}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </InlineStack>
            </Box>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  )
}
