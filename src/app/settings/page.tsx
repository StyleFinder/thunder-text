'use client'

import { useState, useEffect, Suspense } from 'react'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  AlertCircle,
  Settings,
  ArrowLeft,
  Zap,
  RefreshCw,
  Link2,
  FileText,
  Info
} from 'lucide-react'
import { useNavigation } from '../hooks/useNavigation'
import ShopSizes from '@/components/ShopSizes'
import FacebookSettingsCard from '@/components/facebook/FacebookSettingsCard'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

// Thunder Text shop info (not Zeus store info)
interface ShopInfo {
  id: string
  shop_domain: string
  created_at: string
  updated_at: string
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')
  const { toast } = useToast()

  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionsCount, setConnectionsCount] = useState(0)

  useEffect(() => {
    // Always fetch settings if we have a shop parameter
    if (shop) {
      fetchSettings()
      fetchConnections()
    } else {
      // If no shop parameter, just stop loading
      setLoading(false)
    }
  }, [shop])

  const fetchSettings = async () => {
    try {
      // Thunder Text doesn't track usage limits like Zeus
      // This just shows basic shop info
      setShopInfo({
        id: '1',
        shop_domain: shop || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      setError(null)
    } catch (err) {
      logger.error('Error fetching settings:', err as Error, { component: 'settings' })
      setError('Failed to load settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchConnections = async () => {
    try {
      const response = await fetch(`/api/settings/connections?shop=${shop}`)
      const data = await response.json()

      if (data.success && data.connections) {
        // Count connected integrations
        const connected = data.connections.filter((c: any) => c.connected).length
        setConnectionsCount(connected)
      }
    } catch (err) {
      logger.error('Error fetching connections:', err as Error, { component: 'settings' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Temporarily disable auth check for development
  if (false) { // if (!shop || !authenticated) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full" style={{ maxWidth: '800px' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-oxford-navy mb-2">Thunder Text Settings</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-oxford-navy">Authentication Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-oxford-navy">
                Please access this page through your Shopify admin panel.
              </p>
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-smart-blue-500 hover:bg-smart-blue-600 text-white"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background: 'linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)'
        }}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Thunder Text</span>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(220, 38, 38, 0.1)' }}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Failed to Load Settings
              </h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
                onClick={() => {
                  setLoading(true)
                  setError(null)
                  fetchSettings()
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)' }}
              >
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 text-sm">Manage your Thunder Text preferences</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-gray-200 hover:bg-gray-50"
              onClick={() => router.push(`/dashboard?shop=${shop}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Info banner */}
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(0, 102, 204, 0.05)', border: '1px solid rgba(0, 102, 204, 0.1)' }}
          >
            <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#0066cc' }} />
            <p className="text-sm" style={{ color: '#0066cc' }}>
              Configure your prompts, templates, integrations, and size guides to customize your Thunder Text experience.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            </div>
            <div className="p-6">
              {shopInfo && (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Shop</p>
                    <p className="text-sm font-semibold text-gray-900">{shopInfo.shop_domain}</p>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Installed Since</p>
                    <p className="text-sm text-gray-900">{formatDate(shopInfo.created_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prompts Management */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" style={{ color: '#0066cc' }} />
                <h3 className="text-lg font-semibold text-gray-900">Prompts Management</h3>
              </div>
              <p className="text-sm text-gray-500">
                Customize AI writing templates and system prompts for your product descriptions
              </p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <Link href={`/settings/prompts?shop=${shop}`}>
                <Button
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                    border: 'none'
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Prompts & Templates
                </Button>
              </Link>

              <div
                className="rounded-lg p-4"
                style={{ background: 'rgba(0, 102, 204, 0.05)', border: '1px solid rgba(0, 102, 204, 0.1)' }}
              >
                <p className="text-sm font-semibold text-gray-900 mb-2">Current Settings:</p>
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-700">
                    • Global Default Template: <span className="font-semibold">Women's Clothing</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    • System Prompt: <span className="font-semibold">Active</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    • Category Templates: <span className="font-semibold">6 configured</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Connections */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-5 h-5" style={{ color: '#0066cc' }} />
                <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
                {connectionsCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-semibold">
                    {connectionsCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Manage integrations with Shopify, Meta, Google, and more
              </p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <Link href={`/settings/connections?shop=${shop}`}>
                <Button
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                    border: 'none'
                  }}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Manage Connections
                </Button>
              </Link>

              {connectionsCount > 0 && (
                <div className="rounded-lg p-4 bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm">
                      ✓
                    </span>
                    <p className="text-sm font-semibold text-green-700">
                      {connectionsCount} {connectionsCount === 1 ? 'platform' : 'platforms'} connected
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shop Sizes - Full Width */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm col-span-1 lg:col-span-2">
            <div className="p-6">
              {shop && (
                <ShopSizes
                  shop={shop}
                  onToast={(message: string, error?: boolean) => {
                    toast({
                      title: error ? 'Error' : 'Success',
                      description: message,
                      variant: error ? 'destructive' : 'default',
                    })
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
          >
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#0066cc' }} />
            <p className="text-sm text-gray-500">Loading Settings...</p>
          </div>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
