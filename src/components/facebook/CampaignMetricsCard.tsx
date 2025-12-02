/**
 * Campaign Metrics Card
 *
 * Displays key Facebook ad metrics (Conversion Rate, ROAS, Spend) with color-coded
 * performance indicators based on benchmarks:
 * - GREEN: Above 3% (conversion rate) or 3x (ROAS)
 * - RED: Below 3% (conversion rate) or 3x (ROAS)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, Info } from 'lucide-react'
import { logger } from '@/lib/logger'

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
      logger.error('Error fetching campaign metrics:', err as Error, { component: 'CampaignMetricsCard' })
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

  // Determine colors based on benchmarks (using semantic colors)
  const conversionColor = avgConversionRate >= CONVERSION_BENCHMARK ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'
  const roasColor = overallROAS >= ROAS_BENCHMARK ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading campaign metrics...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Unable to load metrics</p>
              <p>{error}</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">No active campaigns</p>
              <p>Create active campaigns to see performance metrics</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Campaign Performance (Last 30 Days)</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
              <span className="text-xs text-muted-foreground">≥3% or 3x</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
              <span className="text-xs text-muted-foreground">&lt;3% or 3x</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Conversion Rate */}
          <div className={`border-3 ${conversionColor} rounded-lg p-4 bg-white space-y-2`}>
            <p className="text-sm font-semibold text-foreground">
              Conversion Rate
            </p>
            <p className="text-3xl font-bold text-foreground">
              {avgConversionRate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Benchmark: {CONVERSION_BENCHMARK}%
            </p>
          </div>

          {/* ROAS */}
          <div className={`border-3 ${roasColor} rounded-lg p-4 bg-white space-y-2`}>
            <p className="text-sm font-semibold text-foreground">
              ROAS (Return on Ad Spend)
            </p>
            <p className="text-3xl font-bold text-foreground">
              {overallROAS.toFixed(2)}x
            </p>
            <p className="text-xs text-muted-foreground">
              Benchmark: {ROAS_BENCHMARK}x
            </p>
          </div>

          {/* Total Spend */}
          <div className="border-3 border-gray-300 rounded-lg p-4 bg-white space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Total Spend
            </p>
            <p className="text-3xl font-bold text-foreground">
              ${totalSpend.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {insights.length} active campaign{insights.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Campaign Breakdown</h4>
          <div className="space-y-2">
            {insights.map((insight) => {
              const campConvColor = insight.conversion_rate >= CONVERSION_BENCHMARK ? 'bg-green-600' : 'bg-red-600'
              const campRoasColor = insight.roas >= ROAS_BENCHMARK ? 'bg-green-600' : 'bg-red-600'

              return (
                <div
                  key={insight.campaign_id}
                  className="p-3 bg-secondary/50 rounded-md space-y-2"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {insight.campaign_name}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${campConvColor}`}></div>
                      <span className="text-xs text-foreground">
                        Conv: {insight.conversion_rate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${campRoasColor}`}></div>
                      <span className="text-xs text-foreground">
                        ROAS: {insight.roas.toFixed(2)}x
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Spend: ${insight.spend.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
