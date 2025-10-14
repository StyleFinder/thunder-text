'use client'

import { useState, useEffect, Suspense } from 'react'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Select,
  ProgressBar,
  Badge,
  Spinner,
  Banner,
  FormLayout,
  RadioButton,
  TextField,
  Modal,
  DataTable,
  Icon,
  Toast,
  Frame,
} from '@shopify/polaris'
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  ImportIcon,
} from '@shopify/polaris-icons'
import { useNavigation } from '../hooks/useNavigation'

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

  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Toast notification state
  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null)

  useEffect(() => {
    if (shop && authenticated) {
      fetchSettings()
    }
  }, [shop, authenticated])

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
      console.error('Error fetching settings:', err)
      setError('Failed to load settings. Please try again.')
    } finally {
      setLoading(false)
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
      <Page title="Thunder Text Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Authentication Required</Text>
                <Text as="p">
                  Please access this page through your Shopify admin panel.
                </Text>
                <Button primary onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#2563eb', fontSize: '2rem' }}>Settings</h1>
          <p style={{ color: '#6b7280' }}>Loading your preferences...</p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div style={{ 
            display: 'inline-block', 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e5e7eb', 
            borderTop: '4px solid #3b82f6', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }}></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#2563eb', fontSize: '2rem' }}>Settings</h1>
        </div>
        
        <div style={{ 
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Error</h2>
          <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>
          <button 
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
            onClick={() => {
              setLoading(true)
              setError(null)
              fetchSettings()
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ color: '#2563eb', fontSize: '2rem', margin: '0' }}>Settings</h1>
            <p style={{ color: '#6b7280', margin: '0.5rem 0' }}>
              Manage your Thunder Text preferences and view usage
            </p>
          </div>
          <button 
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
            onClick={() => router.push(`/dashboard?${searchParams?.toString() || ''}`)}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column - Account & Usage */}
        <div>
          {/* Account Information */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: '#1f2937', fontSize: '1.3rem', margin: 0 }}>
                Account Information
              </h2>
            </div>
            
            {shopInfo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem'
                  }}>
                    Shop
                  </label>
                  <div style={{
                    color: '#1f2937',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    {shopInfo.shop_domain}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem'
                  }}>
                    Installed Since
                  </label>
                  <div style={{
                    color: '#1f2937',
                    fontSize: '1rem'
                  }}>
                    {formatDate(shopInfo.created_at)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Prompts Management */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: '#1f2937', fontSize: '1.3rem', margin: 0, marginBottom: '0.5rem' }}>
                Prompts Management
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                Customize AI writing templates and system prompts for your product descriptions
              </p>
            </div>
            
            <Link href={`/settings/prompts?shop=${shop}`}>
              <button style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6'
                e.currentTarget.style.transform = 'translateY(0px)'
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              >
                <span style={{ fontSize: '1rem' }}>⚙️</span>
                Manage Prompts & Templates
              </button>
            </Link>
            
            <div style={{ 
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                <strong>Current Settings:</strong>
                <div style={{ marginTop: '0.25rem' }}>
                  • Global Default Template: <span style={{ color: '#3b82f6', fontWeight: '500' }}>Women's Clothing</span>
                </div>
                <div>
                  • System Prompt: <span style={{ color: '#059669', fontWeight: '500' }}>Active</span>
                </div>
                <div>
                  • Category Templates: <span style={{ color: '#059669', fontWeight: '500' }}>6 configured</span>
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* Right Column - Preferences */}
        <div>
          {/* Placeholder for future settings */}
        </div>
      </div>


      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.error ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.error ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '8px',
          padding: '1rem',
          maxWidth: '400px',
          zIndex: 1001,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '16px' }}>
              {toast.error ? '❌' : '✅'}
            </span>
            <span style={{ 
              color: toast.error ? '#dc2626' : '#059669',
              fontSize: '0.9rem',
              flex: 1
            }}>
              {toast.content}
            </span>
            <button
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#6b7280',
                padding: '0'
              }}
              onClick={() => setToast(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading Settings...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}