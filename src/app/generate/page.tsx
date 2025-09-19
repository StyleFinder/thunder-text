'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface ProductImage {
  id: string
  url: string
  altText: string | null
}

interface Product {
  node: {
    id: string
    title: string
    description: string
    handle: string
    images: {
      edges: Array<{
        node: ProductImage
      }>
    }
  }
}

interface GeneratedContent {
  title: string
  description: string
  bulletPoints: string[]
  metaDescription: string
  keywords: string[]
}

interface GenerationResponse {
  success: boolean
  data: {
    generatedContent: GeneratedContent
    tokenUsage: {
      total: number
      prompt: number
      completion: number
    }
  }
  usage: {
    current: number
    limit: number
    remaining: number
  }
}

const CATEGORIES = [
  'Fashion & Apparel',
  'Electronics & Gadgets', 
  'Home & Garden',
  'Health & Beauty',
  'Sports & Outdoors',
  'Books & Media',
  'Toys & Games',
  'Food & Beverages',
  'Automotive',
  'Arts & Crafts',
  'Jewelry & Accessories',
  'Office & Business',
  'Pet Supplies',
  'Other'
]

const BRAND_VOICES = [
  'Professional & Authoritative',
  'Friendly & Conversational', 
  'Luxurious & Premium',
  'Playful & Fun',
  'Minimalist & Clean',
  'Bold & Energetic',
  'Trustworthy & Reliable',
  'Creative & Artistic'
]

const TARGET_LENGTHS = [
  { value: 'short', label: 'Short (50-100 words)', description: 'Concise and to the point' },
  { value: 'medium', label: 'Medium (100-200 words)', description: 'Balanced detail and readability' },
  { value: 'long', label: 'Long (200-300 words)', description: 'Comprehensive and detailed' }
]

function GenerateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')
  const productId = searchParams?.get('productId')
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  
  // Form state
  const [category, setCategory] = useState('')
  const [brandVoice, setBrandVoice] = useState('')
  const [targetLength, setTargetLength] = useState('medium')
  const [keywords, setKeywords] = useState('')
  const [editableContent, setEditableContent] = useState<GeneratedContent | null>(null)

  useEffect(() => {
    if (shop && authenticated) {
      fetchProducts()
    }
  }, [shop, authenticated])

  useEffect(() => {
    if (productId && availableProducts.length > 0) {
      const product = availableProducts.find(p => p.node.id === productId)
      if (product) {
        setSelectedProduct(product)
      }
    }
  }, [productId, availableProducts])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/shopify/products?limit=50')
      const data = await response.json()

      if (data.success) {
        setAvailableProducts(data.data.products.edges)
      }
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const handleGenerate = async () => {
    if (!selectedProduct) {
      setError('Please select a product first')
      return
    }

    setLoading(true)
    setError(null)
    setGeneratedContent(null)
    setApplied(false)

    try {
      const imageUrls = selectedProduct.node.images.edges.map(edge => edge.node.url)
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imageUrls,
          productTitle: selectedProduct.node.title,
          category: category || 'Other',
          brandVoice: brandVoice || 'Professional & Authoritative',
          targetLength,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k)
        })
      })

      const data: GenerationResponse = await response.json()

      if (!data.success) {
        throw new Error('Generation failed')
      }

      setGeneratedContent(data.data.generatedContent)
      setEditableContent(data.data.generatedContent)
    } catch (err) {
      console.error('Error generating content:', err)
      setError('Failed to generate content. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyToProduct = async () => {
    if (!selectedProduct || !editableContent) return

    setApplying(true)
    setError(null)

    try {
      const response = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct.node.id,
          generatedContent: editableContent
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error('Failed to update product')
      }

      setApplied(true)
    } catch (err) {
      console.error('Error applying to product:', err)
      setError('Failed to update product. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  const stripHtml = (html: string) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '')
  }

  // Temporarily disable auth check for development
  if (false) { // if (!shop || !authenticated) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#2563eb', fontSize: '2rem' }}>AI Description Generator</h1>
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ color: '#2563eb', fontSize: '2rem', margin: '0' }}>AI Description Generator</h1>
            <p style={{ color: '#6b7280', margin: '0.5rem 0' }}>
              Generate SEO-optimized product descriptions powered by AI
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
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
              onClick={() => router.push(`/products?${searchParams?.toString() || ''}`)}
            >
              Back to Products
            </button>
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
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column - Product Selection & Generation Form */}
        <div>
          {/* Product Selection */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{ color: '#1f2937', fontSize: '1.3rem', marginBottom: '1rem' }}>
              1. Select Product
            </h2>
            
            {!selectedProduct ? (
              <div>
                <select
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    backgroundColor: 'white'
                  }}
                  value=""
                  onChange={(e) => {
                    const product = availableProducts.find(p => p.node.id === e.target.value)
                    if (product) setSelectedProduct(product)
                  }}
                >
                  <option value="">Choose a product...</option>
                  {availableProducts.map(product => (
                    <option key={product.node.id} value={product.node.id}>
                      {product.node.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '1rem',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                  {selectedProduct.node.images.edges[0] && (
                    <img
                      src={selectedProduct.node.images.edges[0].node.url}
                      alt={selectedProduct.node.title}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ 
                      color: '#1f2937', 
                      fontSize: '1.1rem', 
                      margin: '0 0 0.5rem 0',
                      wordBreak: 'break-word'
                    }}>
                      {selectedProduct.node.title}
                    </h3>
                    {selectedProduct.node.description && (
                      <p style={{ 
                        color: '#6b7280', 
                        fontSize: '0.9rem', 
                        margin: '0',
                        lineHeight: '1.4'
                      }}>
                        {stripHtml(selectedProduct.node.description).substring(0, 150)}...
                      </p>
                    )}
                  </div>
                </div>
                <button
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginTop: '1rem'
                  }}
                  onClick={() => setSelectedProduct(null)}
                >
                  Change Product
                </button>
              </div>
            )}
          </div>

          {/* Generation Form */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <h2 style={{ color: '#1f2937', fontSize: '1.3rem', marginBottom: '1rem' }}>
              2. Configure Generation
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#374151', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                marginBottom: '0.5rem' 
              }}>
                Category
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Auto-detect from product</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
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
                Brand Voice
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
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
              >
                <option value="">Choose brand voice...</option>
                {BRAND_VOICES.map(voice => (
                  <option key={voice} value={voice}>{voice}</option>
                ))}
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
                Target Length
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {TARGET_LENGTHS.map(length => (
                  <label key={length.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="targetLength"
                      value={length.value}
                      checked={targetLength === length.value}
                      onChange={(e) => setTargetLength(e.target.value)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>{length.label}</span>
                      <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0' }}>
                        {length.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#374151', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                marginBottom: '0.5rem' 
              }}>
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., comfortable, durable, premium quality"
              />
              <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.5rem 0 0 0' }}>
                Optional: Add specific keywords to include in the description
              </p>
            </div>

            <button
              style={{
                width: '100%',
                backgroundColor: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                padding: '14px 16px',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onClick={handleGenerate}
              disabled={loading || !selectedProduct}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid #ffffff', 
                    borderTop: '2px solid transparent', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }}></div>
                  Generating...
                </span>
              ) : (
                'Generate AI Description'
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Generated Results */}
        <div>
          {error && (
            <div style={{ 
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#dc2626', margin: '0', fontSize: '0.9rem' }}>
                {error}
              </p>
            </div>
          )}

          {generatedContent && (
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ color: '#1f2937', fontSize: '1.3rem', margin: '0' }}>
                  Generated Content
                </h2>
                {applied && (
                  <span style={{ 
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>
                    Applied ✓
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  color: '#374151', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  marginBottom: '0.5rem' 
                }}>
                  Product Title
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                  value={editableContent?.title || ''}
                  onChange={(e) => editableContent && setEditableContent({
                    ...editableContent,
                    title: e.target.value
                  })}
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
                  Description
                </label>
                <textarea
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  value={editableContent?.description || ''}
                  onChange={(e) => editableContent && setEditableContent({
                    ...editableContent,
                    description: e.target.value
                  })}
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
                  Meta Description (SEO)
                </label>
                <textarea
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  value={editableContent?.metaDescription || ''}
                  onChange={(e) => editableContent && setEditableContent({
                    ...editableContent,
                    metaDescription: e.target.value
                  })}
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
                  Keywords
                </label>
                <div style={{ 
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                  fontSize: '0.9rem'
                }}>
                  {editableContent?.keywords.join(', ') || 'No keywords generated'}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ 
                  display: 'block', 
                  color: '#374151', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  marginBottom: '0.5rem' 
                }}>
                  Bullet Points
                </label>
                <div style={{ 
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                  fontSize: '0.9rem'
                }}>
                  {editableContent?.bulletPoints.map((point, index) => (
                    <div key={index} style={{ marginBottom: '0.25rem' }}>
                      • {point}
                    </div>
                  )) || 'No bullet points generated'}
                </div>
              </div>

              <button
                style={{
                  width: '100%',
                  backgroundColor: applying ? '#9ca3af' : applied ? '#059669' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '14px 16px',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: applying ? 'not-allowed' : 'pointer'
                }}
                onClick={handleApplyToProduct}
                disabled={applying || !selectedProduct}
              >
                {applying ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #ffffff', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }}></div>
                    Applying to Product...
                  </span>
                ) : applied ? (
                  'Applied Successfully ✓'
                ) : (
                  'Apply to Product'
                )}
              </button>
            </div>
          )}

          {!generatedContent && !loading && (
            <div style={{ 
              backgroundColor: '#f9fafb',
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              padding: '3rem 2rem',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#6b7280', marginBottom: '1rem' }}>Ready to Generate</h3>
              <p style={{ color: '#9ca3af', margin: '0' }}>
                Select a product and click "Generate AI Description" to see your results here
              </p>
            </div>
          )}
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

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading Generator...</p>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  )
}