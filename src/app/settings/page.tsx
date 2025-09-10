'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface StoreInfo {
  id: string
  shop_domain: string
  plan: string
  current_usage: number
  usage_limits: number
  created_at: string
  updated_at: string
}

interface UsageMetric {
  period: string
  generations_count: number
  ai_tokens_used: number
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')
  
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [usageMetrics, setUsageMetrics] = useState<UsageMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [defaultCategory, setDefaultCategory] = useState('')
  const [defaultBrandVoice, setDefaultBrandVoice] = useState('')
  const [defaultTargetLength, setDefaultTargetLength] = useState('medium')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (shop && authenticated) {
      fetchSettings()
    }
  }, [shop, authenticated])

  const fetchSettings = async () => {
    try {
      // In a real implementation, you'd have a settings API endpoint
      // For now, we'll simulate some data
      setStoreInfo({
        id: '1',
        shop_domain: shop || '',
        plan: 'Pro',
        current_usage: 47,
        usage_limits: 500,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-20T15:30:00Z'
      })

      setUsageMetrics([
        { period: '2024-01-20', generations_count: 12, ai_tokens_used: 8750 },
        { period: '2024-01-19', generations_count: 8, ai_tokens_used: 5200 },
        { period: '2024-01-18', generations_count: 15, ai_tokens_used: 11300 },
        { period: '2024-01-17', generations_count: 6, ai_tokens_used: 3900 },
        { period: '2024-01-16', generations_count: 6, ai_tokens_used: 4100 }
      ])

      // Load saved preferences (in real app, this would come from API)
      const savedCategory = localStorage.getItem(`thunder_text_${shop}_category`) || ''
      const savedBrandVoice = localStorage.getItem(`thunder_text_${shop}_brandVoice`) || ''
      const savedTargetLength = localStorage.getItem(`thunder_text_${shop}_targetLength`) || 'medium'

      setDefaultCategory(savedCategory)
      setDefaultBrandVoice(savedBrandVoice)
      setDefaultTargetLength(savedTargetLength)

      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      // Save to localStorage (in real app, this would be an API call)
      localStorage.setItem(`thunder_text_${shop}_category`, defaultCategory)
      localStorage.setItem(`thunder_text_${shop}_brandVoice`, defaultBrandVoice)
      localStorage.setItem(`thunder_text_${shop}_targetLength`, defaultTargetLength)
      
      // In a real implementation, you'd make an API call here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      // Show success message briefly
      setSaving(false)
      // You could add a toast notification here
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError('Failed to save preferences. Please try again.')
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateUsagePercentage = () => {
    if (!storeInfo) return 0
    return Math.round((storeInfo.current_usage / storeInfo.usage_limits) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return '#dc2626' // Red
    if (percentage >= 75) return '#f59e0b' // Amber
    return '#10b981' // Green
  }

  if (!shop || !authenticated) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#2563eb', fontSize: '2rem' }}>Thunder Text Settings</h1>
        </div>
        
        <div style={{ 
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#92400e', marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#b45309', marginBottom: '1rem' }}>
            Please access this page through your Shopify admin panel.
          </p>
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
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
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

  const usagePercentage = calculateUsagePercentage()
  const usageColor = getUsageColor(usagePercentage)

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
            <h2 style={{ color: '#1f2937', fontSize: '1.3rem', marginBottom: '1rem' }}>
              Account Information
            </h2>
            
            {storeInfo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    color: '#6b7280', 
                    fontSize: '0.9rem', 
                    marginBottom: '0.25rem' 
                  }}>
                    Store
                  </label>
                  <div style={{ 
                    color: '#1f2937', 
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    {storeInfo.shop_domain}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    color: '#6b7280', 
                    fontSize: '0.9rem', 
                    marginBottom: '0.25rem' 
                  }}>
                    Current Plan
                  </label>
                  <div style={{ 
                    color: '#1f2937', 
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    {storeInfo.plan}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    color: '#6b7280', 
                    fontSize: '0.9rem', 
                    marginBottom: '0.25rem' 
                  }}>
                    Member Since
                  </label>
                  <div style={{ 
                    color: '#1f2937', 
                    fontSize: '1rem'
                  }}>
                    {formatDate(storeInfo.created_at)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Usage Overview */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <h2 style={{ color: '#1f2937', fontSize: '1.3rem', marginBottom: '1rem' }}>
              Usage Overview
            </h2>
            
            {storeInfo && (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      Generations Used
                    </span>
                    <span style={{ color: '#1f2937', fontSize: '1rem', fontWeight: '500' }}>
                      {storeInfo.current_usage} / {storeInfo.usage_limits}
                    </span>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    height: '12px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      backgroundColor: usageColor,
                      height: '100%',
                      width: `${usagePercentage}%`,
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '0.5rem',
                    color: usageColor,
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>
                    {usagePercentage}% used
                  </div>
                </div>

                <div style={{ 
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '1rem'
                }}>
                  <h3 style={{ color: '#1f2937', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Recent Usage (Last 5 Days)
                  </h3>
                  
                  {usageMetrics.map((metric, index) => (
                    <div key={metric.period} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingBottom: index < usageMetrics.length - 1 ? '0.5rem' : '0',
                      marginBottom: index < usageMetrics.length - 1 ? '0.5rem' : '0',
                      borderBottom: index < usageMetrics.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        {formatDate(metric.period)}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#1f2937', fontSize: '0.85rem', fontWeight: '500' }}>
                          {metric.generations_count} generations
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {metric.ai_tokens_used.toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Preferences */}
        <div>
          {/* Generation Preferences */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <h2 style={{ color: '#1f2937', fontSize: '1.3rem', marginBottom: '1rem' }}>
              Default Generation Preferences
            </h2>
            
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Set default values that will be pre-filled in the generation form
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#374151', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                marginBottom: '0.5rem' 
              }}>
                Default Category
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white'
                }}
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
              >
                <option value="">No default - auto-detect</option>
                <option value="Fashion & Apparel">Fashion & Apparel</option>
                <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Health & Beauty">Health & Beauty</option>
                <option value="Sports & Outdoors">Sports & Outdoors</option>
                <option value="Books & Media">Books & Media</option>
                <option value="Toys & Games">Toys & Games</option>
                <option value="Food & Beverages">Food & Beverages</option>
                <option value="Automotive">Automotive</option>
                <option value="Arts & Crafts">Arts & Crafts</option>
                <option value="Jewelry & Accessories">Jewelry & Accessories</option>
                <option value="Office & Business">Office & Business</option>
                <option value="Pet Supplies">Pet Supplies</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#374151', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                marginBottom: '0.5rem' 
              }}>
                Default Brand Voice
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white'
                }}
                value={defaultBrandVoice}
                onChange={(e) => setDefaultBrandVoice(e.target.value)}
              >
                <option value="">No default</option>
                <option value="Professional & Authoritative">Professional & Authoritative</option>
                <option value="Friendly & Conversational">Friendly & Conversational</option>
                <option value="Luxurious & Premium">Luxurious & Premium</option>
                <option value="Playful & Fun">Playful & Fun</option>
                <option value="Minimalist & Clean">Minimalist & Clean</option>
                <option value="Bold & Energetic">Bold & Energetic</option>
                <option value="Trustworthy & Reliable">Trustworthy & Reliable</option>
                <option value="Creative & Artistic">Creative & Artistic</option>
              </select>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#374151', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                marginBottom: '0.5rem' 
              }}>
                Default Target Length
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { value: 'short', label: 'Short (50-100 words)' },
                  { value: 'medium', label: 'Medium (100-200 words)' },
                  { value: 'long', label: 'Long (200-300 words)' }
                ].map(length => (
                  <label key={length.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="defaultTargetLength"
                      value={length.value}
                      checked={defaultTargetLength === length.value}
                      onChange={(e) => setDefaultTargetLength(e.target.value)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ color: '#374151', fontSize: '0.9rem' }}>
                      {length.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              style={{
                width: '100%',
                backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
              onClick={handleSavePreferences}
              disabled={saving}
            >
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid #ffffff', 
                    borderTop: '2px solid transparent', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }}></div>
                  Saving...
                </span>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </div>
      </div>
      
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