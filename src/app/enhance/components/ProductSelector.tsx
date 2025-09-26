'use client'

import { useState, useEffect, useCallback } from 'react'
import { authenticatedFetch } from '@/lib/shopify/api-client'
import {
  Card,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Button,
  TextField,
  Thumbnail,
  Badge,
  EmptyState,
  Spinner,
  Pagination,
  Select,
  Filters,
  ChoiceList
} from '@shopify/polaris'
import { SearchIcon, ProductIcon } from '@shopify/polaris-icons'
import { useRouter } from 'next/navigation'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string[]>(['active'])
  const [sortOrder, setSortOrder] = useState('updated_at_desc')

  const pageSize = 12

  // Fetch products from Shopify
  const fetchProducts = useCallback(async () => {
    // Always ensure we have a shop value for the API call
    const shopValue = shop || 'zunosai-staging-test-store'

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        shop: shopValue,
        page: currentPage.toString(),
        limit: pageSize.toString(),
        query: searchQuery,
        status: statusFilter.join(','),
        sort: sortOrder
      })

      // Check for demo mode in URL
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('demo') === 'true') {
        params.append('demo', 'true')
        console.log('🧪 Demo mode enabled')
      }

      console.log('🔍 Fetching products with params:', {
        shop: shopValue,
        page: currentPage,
        query: searchQuery,
        demo: urlParams.get('demo')
      })

      const url = `/api/shopify/products?${params}`
      console.log('🌐 ProductSelector: API URL:', url)
      console.log('🔑 Session token available:', !!window.sessionStorage.getItem('shopify_session_token'))

      const response = await authenticatedFetch(url)
      console.log('📡 ProductSelector: Response status:', response.status)

      const result = await response.json()
      console.log('📦 ProductSelector: Result:', result)

      if (!response.ok) {
        console.error('❌ ProductSelector: API error:', result)
        throw new Error(result.error || 'Failed to fetch products')
      }

      setProducts(result.data.products || [])
      setTotalPages(Math.ceil((result.data.total || 0) / pageSize))
      console.log('✅ ProductSelector: Loaded', result.data.products?.length || 0, 'products')

    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [shop, currentPage, searchQuery, statusFilter, sortOrder])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleProductSelect = (productId: string) => {
    // Navigate to enhance page with productId
    const params = new URLSearchParams({
      shop,
      authenticated: 'true',
      productId
    })
    router.push(`/enhance?${params}`)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter(['active'])
    setSortOrder('updated_at_desc')
    setCurrentPage(1)
  }

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' }
  ]

  const sortOptions = [
    { label: 'Recently updated', value: 'updated_at_desc' },
    { label: 'Recently created', value: 'created_at_desc' },
    { label: 'Title A-Z', value: 'title_asc' },
    { label: 'Title Z-A', value: 'title_desc' }
  ]

  if (loading && products.length === 0) {
    return (
      <Card>
        <Box padding="800">
          <InlineStack align="center" gap="400">
            <Spinner size="large" />
            <BlockStack gap="200">
              <Text variant="headingMd">Loading Products...</Text>
              <Text variant="bodyMd" tone="subdued">
                Fetching your products from Shopify
              </Text>
            </BlockStack>
          </InlineStack>
        </Box>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Box padding="600">
          <EmptyState
            heading="Unable to load products"
            image=""
            action={{
              content: 'Try again',
              onAction: fetchProducts
            }}
          >
            <Text as="p">{error}</Text>
          </EmptyState>
        </Box>
      </Card>
    )
  }

  const filters = [
    {
      key: 'status',
      label: 'Product status',
      filter: (
        <ChoiceList
          title="Product status"
          titleHidden
          choices={statusOptions}
          selected={statusFilter}
          onChange={setStatusFilter}
          allowMultiple
        />
      ),
      shortcut: true
    }
  ]

  const appliedFilters = statusFilter.length > 0 && statusFilter.length < statusOptions.length
    ? statusFilter.map(status => ({
        key: `status-${status}`,
        label: statusOptions.find(option => option.value === status)?.label || status,
        onRemove: () => setStatusFilter(statusFilter.filter(s => s !== status))
      }))
    : []

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <Box padding="400" borderBlockEndWidth="025" borderColor="border">
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <BlockStack gap="100">
                <Text variant="headingLg" as="h1">Select Product to Enhance</Text>
                <Text variant="bodyMd" tone="subdued">
                  Choose an existing product to enhance its description with AI
                </Text>
              </BlockStack>
              <Button onClick={() => router.push('/create')}>
                Create New Product
              </Button>
            </InlineStack>

            {/* Search and Filters */}
            <InlineStack gap="400" align="space-between">
              <Box minWidth="300px">
                <TextField
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search products..."
                  prefix={<SearchIcon />}
                  clearButton
                  onClearButtonClick={() => handleSearchChange('')}
                  autoComplete="off"
                />
              </Box>
              <InlineStack gap="200">
                <Select
                  label="Sort by"
                  labelHidden
                  value={sortOrder}
                  onChange={setSortOrder}
                  options={sortOptions}
                />
              </InlineStack>
            </InlineStack>

            <Filters
              queryValue={searchQuery}
              filters={filters}
              appliedFilters={appliedFilters}
              onQueryChange={handleSearchChange}
              onQueryClear={() => handleSearchChange('')}
              onClearAll={clearFilters}
            />
          </BlockStack>
        </Box>

        {/* Products Grid */}
        <Box padding="400">
          {products.length === 0 ? (
            <EmptyState
              heading="No products found"
              image=""
              action={{
                content: 'Create your first product',
                onAction: () => router.push('/create')
              }}
            >
              <Text as="p">
                {searchQuery 
                  ? `No products match "${searchQuery}". Try adjusting your search or filters.`
                  : 'Start by creating a product to enhance with AI-powered descriptions.'
                }
              </Text>
            </EmptyState>
          ) : (
            <BlockStack gap="400">
              {/* Products Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '16px' 
              }}>
                {products.map((product) => (
                  <Card key={product.id}>
                    <BlockStack gap="300">
                      {/* Product Image */}
                      <Box position="relative">
                        {product.images?.[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0].altText || product.title}
                            style={{
                              width: '100%',
                              height: '180px',
                              objectFit: 'cover',
                              borderRadius: '8px'
                            }}
                          />
                        ) : (
                          <Box
                            background="bg-surface-secondary"
                            padding="800"
                            borderRadius="200"
                            minHeight="180px"
                          >
                            <InlineStack align="center" blockAlign="center">
                              <ProductIcon />
                            </InlineStack>
                          </Box>
                        )}
                        <Box position="absolute" insetBlockStart="100" insetInlineEnd="100">
                          <Badge tone={product.status === 'active' ? 'success' : 'attention'}>
                            {product.status}
                          </Badge>
                        </Box>
                      </Box>

                      {/* Product Details */}
                      <Box padding="300">
                        <BlockStack gap="200">
                          <Text variant="headingSm" as="h3" truncate>
                            {product.title}
                          </Text>
                          <Text variant="bodyMd" tone="subdued">
                            ${product.price}
                          </Text>
                          {product.description && (
                            <Text variant="bodySm" tone="subdued" truncate>
                              {product.description.replace(/<[^>]*>/g, '').substring(0, 80)}...
                            </Text>
                          )}
                          <Button
                            variant="primary"
                            size="large"
                            fullWidth
                            onClick={() => handleProductSelect(product.id)}
                          >
                            Enhance Description
                          </Button>
                        </BlockStack>
                      </Box>
                    </BlockStack>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <InlineStack align="center">
                  <Pagination
                    hasPrevious={currentPage > 1}
                    onPrevious={() => setCurrentPage(currentPage - 1)}
                    hasNext={currentPage < totalPages}
                    onNext={() => setCurrentPage(currentPage + 1)}
                    label={`Page ${currentPage} of ${totalPages}`}
                  />
                </InlineStack>
              )}

              {/* Loading overlay for subsequent loads */}
              {loading && products.length > 0 && (
                <Box 
                  position="absolute" 
                  insetBlockStart="0" 
                  insetInlineStart="0" 
                  width="100%" 
                  height="100%" 
                  background="bg-surface" 
                  style={{ opacity: 0.7 }}
                >
                  <InlineStack align="center" blockAlign="center" gap="200">
                    <Spinner size="small" />
                    <Text variant="bodySm">Loading...</Text>
                  </InlineStack>
                </Box>
              )}
            </BlockStack>
          )}
        </Box>
      </BlockStack>
    </Card>
  )
}