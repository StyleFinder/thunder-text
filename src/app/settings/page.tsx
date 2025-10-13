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

interface CustomSizing {
  id: string
  store_id: string
  name: string
  sizes: string[]
  is_active: boolean
  is_default?: boolean
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

  // Custom sizing management state
  const [customSizing, setCustomSizing] = useState<CustomSizing[]>([])
  const [sizingLoading, setSizingLoading] = useState(false)
  const [showSizingModal, setShowSizingModal] = useState(false)
  const [editingSizing, setEditingSizing] = useState<CustomSizing | null>(null)
  const [newSizingName, setNewSizingName] = useState('')
  const [newSizingSizes, setNewSizingSizes] = useState('')

  useEffect(() => {
    if (shop && authenticated) {
      fetchSettings()
      fetchCustomSizing()
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

  // Custom sizing management functions
  const fetchCustomSizing = async () => {
    setSizingLoading(true)
    try {
      const response = await fetch(`/api/sizing?shop=${shop}`)
      const data = await response.json()
      
      if (data.success) {
        setCustomSizing(data.data)
      } else {
        setToast({ content: 'Failed to load custom sizing options', error: true })
      }
    } catch (err) {
      console.error('Error fetching custom sizing:', err)
      setToast({ content: 'Failed to load custom sizing options', error: true })
    } finally {
      setSizingLoading(false)
    }
  }

  const handleCreateSizing = async () => {
    if (!newSizingName.trim()) {
      setToast({ content: 'Sizing name is required', error: true })
      return
    }

    if (!newSizingSizes.trim()) {
      setToast({ content: 'Sizes are required', error: true })
      return
    }

    setSizingLoading(true)
    try {
      const sizesArray = newSizingSizes.split(',').map(size => size.trim()).filter(size => size.length > 0)
      
      const response = await fetch(`/api/sizing?shop=${shop}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSizingName,
          sizes: sizesArray
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchCustomSizing()
        setNewSizingName('')
        setNewSizingSizes('')
        setShowSizingModal(false)
        setToast({ content: 'Sizing option created successfully!' })
      } else {
        setToast({ content: data.error || 'Failed to create sizing option', error: true })
      }
    } catch (err) {
      console.error('Error creating sizing option:', err)
      setToast({ content: 'Failed to create sizing option', error: true })
    } finally {
      setSizingLoading(false)
    }
  }

  const handleUpdateSizing = async () => {
    if (!editingSizing || !newSizingName.trim()) {
      setToast({ content: 'Sizing name is required', error: true })
      return
    }

    if (!newSizingSizes.trim()) {
      setToast({ content: 'Sizes are required', error: true })
      return
    }

    setSizingLoading(true)
    try {
      const sizesArray = newSizingSizes.split(',').map(size => size.trim()).filter(size => size.length > 0)
      
      const response = await fetch(`/api/sizing?shop=${shop}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSizing.id,
          name: newSizingName,
          sizes: sizesArray,
          is_default: editingSizing.is_default
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchCustomSizing()
        setNewSizingName('')
        setNewSizingSizes('')
        setEditingSizing(null)
        setShowSizingModal(false)
        setToast({ content: 'Sizing option updated successfully!' })
      } else {
        setToast({ content: data.error || 'Failed to update sizing option', error: true })
      }
    } catch (err) {
      console.error('Error updating sizing option:', err)
      setToast({ content: 'Failed to update sizing option', error: true })
    } finally {
      setSizingLoading(false)
    }
  }

  const handleDeleteSizing = async (sizingId: string, sizingName: string) => {
    if (!confirm(`Are you sure you want to delete "${sizingName}"?`)) {
      return
    }

    setSizingLoading(true)
    try {
      const response = await fetch(`/api/sizing?shop=${shop}&id=${sizingId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchCustomSizing()
        setToast({ content: 'Sizing option deleted successfully!' })
      } else {
        setToast({ content: data.error || 'Failed to delete sizing option', error: true })
      }
    } catch (err) {
      console.error('Error deleting sizing option:', err)
      setToast({ content: 'Failed to delete sizing option', error: true })
    } finally {
      setSizingLoading(false)
    }
  }

  const openCreateSizingModal = () => {
    setEditingSizing(null)
    setNewSizingName('')
    setNewSizingSizes('')
    setShowSizingModal(true)
  }

  const openEditSizingModal = (sizing: CustomSizing) => {
    setEditingSizing(sizing)
    setNewSizingName(sizing.name)
    setNewSizingSizes(sizing.sizes.join(', '))
    setShowSizingModal(true)
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
          {/* Custom Sizing Management */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            marginTop: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: '#1f2937', fontSize: '1.3rem', margin: 0 }}>
                Custom Sizing Options
              </h2>
              <button
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onClick={openCreateSizingModal}
                disabled={sizingLoading}
              >
                <span style={{ fontSize: '14px' }}>+</span>
                Add Sizing Option
              </button>
            </div>
            
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Manage sizing options for your products. Default sizes are provided automatically and can be edited. Create additional custom sizing options as needed.
            </p>

            {sizingLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  border: '2px solid #e5e7eb', 
                  borderTop: '2px solid #3b82f6', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }}></div>
                <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Loading sizing options...</p>
              </div>
            ) : customSizing.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                backgroundColor: '#f9fafb',
                border: '1px dashed #d1d5db',
                borderRadius: '6px'
              }}>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No custom sizing options yet</p>
                <button
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                  onClick={openCreateSizingModal}
                >
                  Create your first sizing option
                </button>
              </div>
            ) : (
              <div style={{ 
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  backgroundColor: '#f9fafb',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'grid',
                  gridTemplateColumns: '2fr 3fr 1fr',
                  gap: '1rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  <div>Name</div>
                  <div>Sizes</div>
                  <div>Actions</div>
                </div>
                {customSizing.map((sizing, index) => (
                  <div key={sizing.id} style={{ 
                    padding: '0.75rem 1rem',
                    borderBottom: index < customSizing.length - 1 ? '1px solid #f3f4f6' : 'none',
                    display: 'grid',
                    gridTemplateColumns: '2fr 3fr 1fr',
                    gap: '1rem',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                    backgroundColor: 'white'
                  }}>
                    <div style={{ 
                      color: '#1f2937',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {sizing.name}
                      {sizing.is_default && (
                        <span style={{
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8',
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          Default
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      {sizing.sizes.join(', ')}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #d1d5db',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                        onClick={() => openEditSizingModal(sizing)}
                        title="Edit sizing option"
                      >
                        ✏️
                      </button>
                      <button
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #fecaca',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
                        onClick={() => handleDeleteSizing(sizing.id, sizing.name)}
                        title="Delete sizing option"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Sizing Modal */}
      {showSizingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>
              {editingSizing ? 'Edit Sizing Option' : 'Create New Sizing Option'}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#374151', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                marginBottom: '0.5rem' 
              }}>
                Sizing Name *
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                placeholder="e.g., Plus Size, Numeric Sizes"
                value={newSizingName}
                onChange={(e) => setNewSizingName(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#374151', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                marginBottom: '0.5rem' 
              }}>
                Sizes (comma-separated) *
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                placeholder="e.g., SM, ML or 28, 30, 32, 34, 36"
                value={newSizingSizes}
                onChange={(e) => setNewSizingSizes(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <p style={{ 
                color: '#6b7280', 
                fontSize: '0.8rem', 
                marginTop: '0.5rem' 
              }}>
                Enter sizes separated by commas. They will be automatically capitalized.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                onClick={() => {
                  setShowSizingModal(false)
                  setEditingSizing(null)
                  setNewSizingName('')
                  setNewSizingSizes('')
                }}
                disabled={sizingLoading}
              >
                Cancel
              </button>
              <button
                style={{
                  backgroundColor: sizingLoading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: sizingLoading || !newSizingName.trim() || !newSizingSizes.trim() ? 'not-allowed' : 'pointer'
                }}
                onClick={editingSizing ? handleUpdateSizing : handleCreateSizing}
                disabled={sizingLoading || !newSizingName.trim() || !newSizingSizes.trim()}
              >
                {sizingLoading ? (editingSizing ? 'Updating...' : 'Creating...') : (editingSizing ? 'Update Sizing' : 'Create Sizing')}
              </button>
            </div>
          </div>
        </div>
      )}

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