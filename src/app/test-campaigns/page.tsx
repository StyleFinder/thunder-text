'use client'

/**
 * Test page for Facebook Campaign APIs
 *
 * Accessible at: /test-campaigns?shop=zunosai-staging-test-store.myshopify.com
 */

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import CampaignSelector from '@/components/facebook/CampaignSelector'

export default function TestCampaignsPage() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop') || 'zunosai-staging-test-store.myshopify.com'

  const [selectedAdAccountId, setSelectedAdAccountId] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')

  const handleCampaignSelect = (adAccountId: string, campaignId: string) => {
    setSelectedAdAccountId(adAccountId)
    setSelectedCampaignId(campaignId)
    console.log('Selected:', { adAccountId, campaignId })
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Facebook Campaign APIs</h1>
          <p className="text-gray-600 mt-2">Testing with shop: {shop}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Selector Component</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CampaignSelector
                  shop={shop}
                  onSelect={handleCampaignSelect}
                  selectedAdAccountId={selectedAdAccountId}
                  selectedCampaignId={selectedCampaignId}
                />

                {selectedAdAccountId && selectedCampaignId && (
                  <div className="space-y-3 pt-4 border-t">
                    <p className="text-sm font-semibold text-gray-900">Selected Values:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Ad Account ID:</span>
                        <Badge variant="secondary">{selectedAdAccountId}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Campaign ID:</span>
                        <Badge variant="secondary">{selectedCampaignId}</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>API Test Buttons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={async () => {
                    const res = await fetch(`/api/facebook/ad-accounts?shop=${shop}`)
                    const data = await res.json()
                    console.log('Ad Accounts:', data)
                    alert(JSON.stringify(data, null, 2))
                  }}
                >
                  Test Ad Accounts API
                </Button>

                {selectedAdAccountId && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={async () => {
                      const res = await fetch(
                        `/api/facebook/campaigns?shop=${shop}&ad_account_id=${selectedAdAccountId}`
                      )
                      const data = await res.json()
                      console.log('Campaigns:', data)
                      alert(JSON.stringify(data, null, 2))
                    }}
                  >
                    Test Campaigns API
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
