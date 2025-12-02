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
import { Loader2, AlertCircle } from 'lucide-react'
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
      <div className="w-full flex flex-col items-center" style={{ background: '#fafaf9', minHeight: '100vh', padding: '32px 16px' }}>
        <div className="w-full" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#003366', marginBottom: '8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Settings</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Loading your preferences...</p>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div style={{ padding: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0066cc' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center" style={{ background: '#fafaf9', minHeight: '100vh', padding: '32px 16px' }}>
        <div className="w-full" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#003366', marginBottom: '8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Settings</h1>
          </div>
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle className="h-5 w-5" style={{ color: '#dc2626', marginTop: '2px' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', marginBottom: '4px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Error loading settings</p>
                <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{error}</p>
              </div>
              <button
                onClick={() => {
                  setLoading(true)
                  setError(null)
                  fetchSettings()
                }}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  width: 'fit-content'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#b91c1c'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#dc2626'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center" style={{ background: '#fafaf9', minHeight: '100vh', padding: '32px 16px' }}>
      <div className="w-full" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#003366', marginBottom: '4px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Settings</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Manage your Thunder Text preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '24px' }}>
          {/* Account Information */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Account Information</h3>
            </div>
            <div style={{ padding: '24px' }}>
              {shopInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Shop</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{shopInfo.shop_domain}</p>
                  </div>
                  <div style={{ height: '1px', background: '#e5e7eb' }} />
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Installed Since</p>
                    <p style={{ fontSize: '14px', color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{formatDate(shopInfo.created_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prompts Management */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#003366', marginBottom: '4px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Prompts Management</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                Customize AI writing templates and system prompts for your product descriptions
              </p>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Link href={`/settings/prompts?shop=${shop}`}>
                <button
                  style={{
                    width: '100%',
                    background: '#0066cc',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '16px 24px',
                    fontSize: '16px',
                    fontWeight: 600,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0052a3'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0066cc'
                  }}
                >
                  ⚙️ Manage Prompts & Templates
                </button>
              </Link>

              <div style={{ background: '#f0f7ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Current Settings:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ fontSize: '14px', color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      • Global Default Template: <span style={{ fontWeight: 600 }}>Women's Clothing</span>
                    </p>
                    <p style={{ fontSize: '14px', color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      • System Prompt: <span style={{ fontWeight: 600 }}>Active</span>
                    </p>
                    <p style={{ fontSize: '14px', color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      • Category Templates: <span style={{ fontWeight: 600 }}>6 configured</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connections */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Connections</h3>
                {connectionsCount > 0 && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {connectionsCount}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                Manage integrations with Shopify, Meta, Google, and more
              </p>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Link href={`/settings/connections?shop=${shop}`}>
                <button
                  style={{
                    width: '100%',
                    background: '#0066cc',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '16px 24px',
                    fontSize: '16px',
                    fontWeight: 600,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0052a3'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0066cc'
                  }}
                >
                  🔗 Manage Connections
                </button>
              </Link>

              {connectionsCount > 0 && (
                <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}>
                      ✓
                    </span>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#065f46', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      {connectionsCount} {connectionsCount === 1 ? 'platform' : 'platforms'} connected
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shop Sizes - Full Width */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', gridColumn: '1 / -1' }}>
            <div style={{ padding: '24px' }}>
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
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-smart-blue-500 mx-auto mb-4" />
          <p className="text-oxford-navy">Loading Settings...</p>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
