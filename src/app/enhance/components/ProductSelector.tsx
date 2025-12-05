'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  Search,
  Package,
  Zap,
  ArrowLeft,
  PenTool,
  ImageOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { logger } from '@/lib/logger'

interface Product {
  id: string
  title: string
  handle: string
  featuredImage?: {
    url: string
    altText?: string
  }
  status: string
  totalInventory?: number
}

interface ProductSelectorProps {
  shop: string
  onProductSelect: (productId: string) => void
}

export function ProductSelector({ shop, onProductSelect }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/shopify/products?shop=${encodeURIComponent(shop)}`)

        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        const data = await response.json()
        setProducts(data.products || [])
      } catch (err) {
        logger.error('Failed to fetch products for selector', err as Error, { component: 'ProductSelector' })
        setError('Failed to load products. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [shop])

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)' }}
              >
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Enhance Product</h1>
                <p className="text-gray-500 text-sm">Select a product to enhance</p>
              </div>
            </div>
          </div>

          {/* Loading grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                      <div className="h-5 bg-gray-100 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Error state
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
                Failed to Load Products
              </h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
                onClick={() => window.location.reload()}
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
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)' }}
              >
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Enhance Product</h1>
                <p className="text-gray-500 text-sm">Select a product to enhance its description</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-gray-200 hover:bg-gray-50"
              onClick={() => window.location.href = `/dashboard?shop=${shop}`}
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
            <PenTool className="w-5 h-5 flex-shrink-0" style={{ color: '#0066cc' }} />
            <p className="text-sm" style={{ color: '#0066cc' }}>
              Choose a product from your store to generate or improve its description using AI.
            </p>
          </div>
        </div>

        {/* Product Selection Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products by name or handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-200"
              />
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(0, 102, 204, 0.1)' }}
              >
                <Package className="w-8 h-8" style={{ color: '#0066cc' }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No products found' : 'No products in store'}
              </h3>
              <p className="text-gray-500">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Add some products to your Shopify store first'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    const numericId = product.id.split('/').pop() || product.id
                    onProductSelect(numericId)
                  }}
                  className="text-left p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 group"
                >
                  <div className="flex gap-3">
                    {product.featuredImage?.url ? (
                      <img
                        src={product.featuredImage.url}
                        alt={product.featuredImage.altText || product.title}
                        className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center">
                        <ImageOff className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate mb-1">
                        {product.title}
                      </h3>
                      <p className="text-sm text-gray-500 truncate mb-2">
                        {product.handle}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          product.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
