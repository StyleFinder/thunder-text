'use client'

/**
 * Facebook Ads Dashboard (Shop-Scoped)
 *
 * Main page for managing Facebook ad campaigns and creating ads
 * from product descriptions
 */

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Share2 } from 'lucide-react'
import { CampaignSelector, CreateFacebookAdFlow, CampaignMetricsCard } from '@/features/ads-library'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft } from 'lucide-react'
import { logger } from '@/lib/logger'
import { useShop } from '@/hooks/useShop'
import { ContentLoader } from '@/components/ui/loading/ContentLoader'

interface IntegrationInfo {
  connected: boolean
  accountName: string | null
  adAccountsCount: number
  adAccounts: Array<{ id: string; name: string }>
}

function FacebookAdsContent() {
  const router = useRouter()
  const { shop, shopId, isLoading: shopLoading } = useShop()

  const [integrationInfo, setIntegrationInfo] = useState<IntegrationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAdAccountId, setSelectedAdAccountId] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedCampaignName, setSelectedCampaignName] = useState('')
  const [createAdModalOpen, setCreateAdModalOpen] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerMessage, setBannerMessage] = useState('')
  const [bannerType, setBannerType] = useState<'success' | 'error'>('success')

  // Helper for dynamic routes
  const getDashboardUrl = () => shopId ? `/stores/${shopId}/dashboard` : '/dashboard'

  useEffect(() => {
    if (shop) {
      checkFacebookConnection()
    }
  }, [shop])

  const checkFacebookConnection = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/facebook/ad-accounts?shop=${shop}`)
      const data = await response.json()

      if (data.success) {
        setIntegrationInfo({
          connected: true,
          accountName: 'Connected',
          adAccountsCount: data.data.length,
          adAccounts: data.data.map((acc: { id: string; name: string }) => ({ id: acc.id, name: acc.name }))
        })
      } else if (data.code === 'NOT_CONNECTED') {
        setIntegrationInfo({
          connected: false,
          accountName: null,
          adAccountsCount: 0,
          adAccounts: []
        })
      }
    } catch (error) {
      logger.error('Error checking Facebook connection:', error as Error, { component: 'facebook-ads' })
      setIntegrationInfo({
        connected: false,
        accountName: null,
        adAccountsCount: 0,
        adAccounts: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectFacebook = () => {
    const authorizeUrl = `/api/facebook/oauth/authorize?shop=${shop}`
    window.location.href = authorizeUrl
  }

  const handleCampaignSelect = (adAccountId: string, campaignId: string, campaignName: string) => {
    setSelectedAdAccountId(adAccountId)
    setSelectedCampaignId(campaignId)
    setSelectedCampaignName(campaignName)
  }

  if (shopLoading || loading) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full" style={{ maxWidth: '1000px' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Facebook Ads</h1>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <ContentLoader message="Loading Facebook integration..." />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!integrationInfo?.connected) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full" style={{ maxWidth: '1000px' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Facebook Ads</h1>
            <p className="text-gray-600 mt-1">Create and manage Facebook ads from your product descriptions</p>
          </div>

          <div className="space-y-6">
            {showBanner && bannerMessage && (
              <Alert variant={bannerType === 'success' ? 'default' : 'destructive'}>
                <AlertDescription>{bannerMessage}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Share2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Connect your Facebook account</h2>
                  <p className="text-gray-600 mb-6">
                    Connect your Facebook Business account to create ads directly from your
                    product descriptions. Your campaigns and ad accounts will be available
                    for selection.
                  </p>
                  <Button onClick={handleConnectFacebook} size="lg">
                    Connect Facebook
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What you can do with Facebook Ads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <p className="text-gray-700">Create ads from product descriptions with one click</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <p className="text-gray-700">Select existing campaigns to add your ads to</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <p className="text-gray-700">Use AI-generated titles, copy, and product images</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <p className="text-gray-700">Manage campaign settings in Facebook Ads Manager</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full" style={{ maxWidth: '1000px' }}>
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(getDashboardUrl())}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Facebook Ads</h1>
          <p className="text-gray-600 mt-1">Create ads from your product descriptions</p>
        </div>

        <div className="space-y-6">
          {showBanner && bannerMessage && (
            <Alert variant={bannerType === 'success' ? 'default' : 'destructive'}>
              <AlertDescription>{bannerMessage}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <span className="font-semibold">Facebook account connected</span>
              <span className="text-gray-600">
                {integrationInfo.adAccountsCount} ad account(s) available
              </span>
            </AlertDescription>
          </Alert>

          {selectedAdAccountId && (
            <CampaignMetricsCard
              shop={shop || ''}
              adAccountId={selectedAdAccountId}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <CampaignSelector
                  shop={shop || ''}
                  onSelect={handleCampaignSelect}
                  selectedAdAccountId={selectedAdAccountId}
                  selectedCampaignId={selectedCampaignId}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Facebook Ad</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCampaignId ? (
                    <>
                      <p className="text-sm text-green-600">
                        ✓ Campaign selected: {selectedCampaignName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Click the button below to create a new Facebook ad for this campaign.
                        You'll be able to select a product, generate ad content with AI, and choose images.
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => setCreateAdModalOpen(true)}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Create Facebook Ad
                      </Button>
                    </>
                  ) : (
                    <p className="text-gray-600">
                      Select an ad account and campaign to continue
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to disconnect your Facebook account?')) {
                        fetch(`/api/facebook/oauth/disconnect`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ shop })
                        }).then(() => {
                          window.location.reload()
                        })
                      }
                    }}
                  >
                    Disconnect Facebook
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <CreateFacebookAdFlow
        open={createAdModalOpen}
        onClose={() => setCreateAdModalOpen(false)}
        shop={shop || ''}
        campaignId={selectedCampaignId}
        campaignName={selectedCampaignName}
        adAccountId={selectedAdAccountId}
      />
    </div>
  )
}

export default function FacebookAdsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ContentLoader message="Loading Facebook Ads..." />
      </div>
    }>
      <FacebookAdsContent />
    </Suspense>
  )
}
