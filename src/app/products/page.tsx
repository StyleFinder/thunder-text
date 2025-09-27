'use client'

import { useState, useEffect, Suspense } from 'react'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
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

interface ProductsResponse {
  success: boolean
  data: {
    products: {
      edges: Product[]
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
  }
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (shop && authenticated) {
      fetchProducts()
    }
  }, [shop, authenticated])

  const fetchProducts = async (nextCursor?: string) => {
    try {
      const params = new URLSearchParams()
      params.append('limit', '12')
      if (shop) {
        params.append('shop', shop)
      }
      if (nextCursor) {
        params.append('cursor', nextCursor)
      }

      // Get session token from sessionStorage for authenticated requests
      const sessionToken = typeof window !== 'undefined'
        ? window.sessionStorage.getItem('shopify_session_token')
        : null

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`
      }

      const response = await fetch(`/api/shopify/products?${params}`, {
        headers
      })
      const data: ProductsResponse = await response.json()

      if (!data.success) {
        throw new Error('Failed to fetch products')
      }

      if (nextCursor) {
        setProducts(prev => [...prev, ...data.data.products.edges])
      } else {
        setProducts(data.data.products.edges)
      }

      setHasNextPage(data.data.products.pageInfo.hasNextPage)
      setCursor(data.data.products.pageInfo.endCursor)
      setError(null)
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (cursor && hasNextPage) {
      setLoadingMore(true)
      fetchProducts(cursor)
    }
  }

  const handleGenerateDescription = (productId: string) => {
    setGeneratingIds(prev => new Set([...prev, productId]))
    
    // Navigate to generate page with product ID
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('productId', productId)
    router.push(`/generate?${params}`)
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
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
          <h1 style={{ color: '#2563eb', fontSize: '2rem' }}>Thunder Text Products</h1>
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
          <h1 style={{ color: '#2563eb', fontSize: '2rem' }}>Your Products</h1>
          <p style={{ color: '#6b7280' }}>Loading products from {shop}...</p>
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
          <h1 style={{ color: '#2563eb', fontSize: '2rem' }}>Your Products</h1>
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
              fetchProducts()
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
            <h1 style={{ color: '#2563eb', fontSize: '2rem', margin: '0' }}>Your Products</h1>
            <p style={{ color: '#6b7280', margin: '0.5rem 0' }}>
              {products.length} products from {shop}
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
        
        <div style={{ 
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe',
          borderRadius: '8px',
          padding: '1rem',
        }}>
          <p style={{ color: '#1d4ed8', margin: '0', fontSize: '0.9rem' }}>
            Select products to generate AI-powered descriptions that will boost your SEO and conversions.
          </p>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ color: '#6b7280', marginBottom: '1rem' }}>No products found</h2>
          <p style={{ color: '#9ca3af' }}>
            It looks like your store doesn't have any products yet, or there was an issue loading them.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {products.map((product) => {
            const { node } = product
            const primaryImage = node.images.edges[0]?.node
            const isGenerating = generatingIds.has(node.id)
            
            return (
              <div
                key={node.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Product Image */}
                <div style={{ 
                  height: '200px', 
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {primaryImage ? (
                    <img
                      src={primaryImage.url}
                      alt={primaryImage.altText || node.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{ 
                      color: '#9ca3af', 
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      padding: '1rem'
                    }}>
                      No image available
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ 
                    color: '#1f2937', 
                    fontSize: '1.1rem', 
                    fontWeight: '600', 
                    margin: '0 0 0.5rem 0',
                    lineHeight: '1.3'
                  }}>
                    {truncateText(node.title, 60)}
                  </h3>
                  
                  {node.description && (
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: '0.9rem', 
                      margin: '0 0 1rem 0',
                      lineHeight: '1.4'
                    }}>
                      {truncateText(stripHtml(node.description), 100)}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto' }}>
                    <button
                      style={{
                        width: '100%',
                        backgroundColor: isGenerating ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => handleGenerateDescription(node.id)}
                      disabled={isGenerating}
                      onMouseEnter={(e) => {
                        if (!isGenerating) {
                          e.currentTarget.style.backgroundColor = '#059669'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isGenerating) {
                          e.currentTarget.style.backgroundColor = '#10b981'
                        }
                      }}
                    >
                      {isGenerating ? 'Opening Generator...' : 'Generate Description'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load More Button */}
      {hasNextPage && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            style={{
              backgroundColor: loadingMore ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: loadingMore ? 'not-allowed' : 'pointer'
            }}
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #ffffff', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }}></div>
                Loading more...
              </span>
            ) : (
              'Load More Products'
            )}
          </button>
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading Products...</p>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}