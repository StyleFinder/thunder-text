'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { authenticatedFetch } from '@/lib/shopify/api-client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, Package } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

interface Product {
  id: string
  title: string
  handle: string
  description: string
  images: Array<{
    url: string
    altText?: string
  }>
  price: string
  status: 'active' | 'draft' | 'archived'
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface ProductSelectorProps {
  shop: string
  onProductSelect: (productId: string) => void
}

export function ProductSelector({ shop, onProductSelect }: ProductSelectorProps) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string[]>(['active', 'draft'])
  const [sortOrder, setSortOrder] = useState('updated_at_desc')
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  const pageSize = 9

  const fetchProducts = useCallback(async () => {
    const shopValue = shop || 'zunosai-staging-test-store'

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        shop: shopValue,
        page: currentPage.toString(),
        limit: pageSize.toString(),
        status: statusFilter.join(','),
        sort: sortOrder
      })

      if (debouncedSearchQuery) {
        params.append('query', debouncedSearchQuery)
      }

      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('demo') === 'true') {
        params.append('demo', 'true')
        console.log('🧪 Demo mode enabled')
      }

      const url = `/api/shopify/products?${params}`
      console.log('🌐 ProductSelector: API URL:', url)

      const response = await authenticatedFetch(url)

      const result = await response.json()

      if (!response.ok) {
        logger.error('❌ ProductSelector: API error:', result as Error, { component: 'ProductSelector' })
        throw new Error(result.error || 'Failed to fetch products')
      }

      const productsData = result.data?.products || result.products || []
      setProducts(productsData)
      setTotalPages(Math.ceil((result.data?.total || result.total || 0) / pageSize))
      console.log('📋 ProductSelector: Products state will be:', productsData)

    } catch (err) {
      logger.error('Error fetching products:', err as Error, { component: 'ProductSelector' })
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [shop, currentPage, debouncedSearchQuery, statusFilter, sortOrder])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleProductSelect = (productId: string) => {

    const urlParams = new URLSearchParams(window.location.search)
    const params = new URLSearchParams({
      shop,
      authenticated: 'true',
      productId,
      ...(urlParams.get('embedded') && { embedded: urlParams.get('embedded')! }),
      ...(urlParams.get('host') && { host: urlParams.get('host')! })
    })

    const newUrl = `/enhance?${params}`
    console.log('🔗 Navigating to:', newUrl)

    if (typeof window !== 'undefined' && window.top !== window.self) {
      console.log('📱 Embedded context detected, using window.location')
      window.location.href = newUrl
    } else {
      router.push(newUrl)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    if (value === '') {
      setDebouncedSearchQuery('')
    } else {
      debounceTimeout.current = setTimeout(() => {
        setDebouncedSearchQuery(value)
      }, 500)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [])

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <div className="text-center">
                  <h2 className="text-lg font-semibold">Loading Products...</h2>
                  <p className="text-sm text-gray-600 mt-1">Fetching your products from Shopify</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex justify-center mt-4">
                <Button onClick={fetchProducts}>Try again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  console.log('🎨 ProductSelector rendering with:', {
    loading,
    error,
    productsCount: products.length,
    products: products.slice(0, 2)
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px 32px' }}>
        <Card style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: 'none'
        }}>
          {/* Header */}
          <CardHeader style={{ borderBottom: '1px solid #e5e7eb', padding: '24px' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle style={{ fontSize: '30px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                    Select Product to Enhance
                  </CardTitle>
                  <CardDescription style={{ fontSize: '16px', color: '#6b7280' }}>
                    Choose an existing product to enhance its description with AI
                  </CardDescription>
                </div>
              </div>

              {/* Search and Filters */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: '1', maxWidth: '500px' }}>
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{
                      fontSize: '16px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      width: '100%'
                    }}
                  />
                </div>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger style={{
                    width: '200px',
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated_at_desc">Recently updated</SelectItem>
                    <SelectItem value="created_at_desc">Recently created</SelectItem>
                    <SelectItem value="title_asc">Title A-Z</SelectItem>
                    <SelectItem value="title_desc">Title Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          {/* Products Grid */}
          <CardContent style={{ padding: '24px' }}>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                  No products found
                </h3>
                <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '16px' }}>
                  {debouncedSearchQuery
                    ? `No products match "${debouncedSearchQuery}". Try adjusting your search.`
                    : 'Start by creating a product to enhance with AI-powered descriptions.'
                  }
                </p>
                <Button onClick={() => router.push('/create-pd')}>
                  Create your first product
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Products Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '24px'
                }}>
                  {products.map((product) => (
                    <div
                      key={product.id}
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        {product.images?.[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0].altText || product.title}
                            style={{
                              width: '100%',
                              height: '200px',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '200px',
                            background: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Package size={48} color="#9ca3af" />
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                          <Badge
                            variant={product.status === 'active' ? 'default' : 'secondary'}
                            style={{
                              background: product.status === 'active' ? '#d1fae5' : '#f3f4f6',
                              color: product.status === 'active' ? '#047857' : '#6b7280',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 500
                            }}
                          >
                            {product.status}
                          </Badge>
                        </div>
                      </div>

                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={product.title}>
                            {product.title}
                          </h3>
                          <p style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: '#0066cc'
                          }}>
                            ${product.price}
                          </p>
                          {product.description && (
                            <p style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              lineHeight: '1.5',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {product.description.replace(/<[^>]*>/g, '').substring(0, 80)}...
                            </p>
                          )}
                          <Button
                            style={{
                              width: '100%',
                              background: '#0066cc',
                              color: 'white',
                              padding: '12px 24px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 500,
                              border: 'none',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                              transition: 'all 0.15s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#0052a3';
                              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#0066cc';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                            }}
                            onClick={() => handleProductSelect(product.id)}
                          >
                            Enhance Description
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    paddingTop: '16px'
                  }}>
                    <Button
                      variant="outline"
                      style={{
                        background: 'white',
                        color: currentPage === 1 ? '#9ca3af' : '#0066cc',
                        border: '1px solid #e5e7eb',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      fontWeight: 500
                    }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      style={{
                        background: 'white',
                        color: currentPage === totalPages ? '#9ca3af' : '#0066cc',
                        border: '1px solid #e5e7eb',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}

                {/* Loading overlay for subsequent loads */}
                {loading && products.length > 0 && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
