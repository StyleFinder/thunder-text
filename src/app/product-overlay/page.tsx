'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
// Temporarily disabled for debugging
// import ProductDescriptionOverlay from '@/app/components/ProductDescriptionOverlay'
import { ProductData } from '@/lib/product-data-import'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

interface GeneratedContent {
  title: string
  description: string
  bulletPoints: string[]
  metaDescription: string
  keywords: string[]
}

function ProductOverlayContent() {
  const searchParams = useSearchParams()
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(true)

  // Version tracking
  const COMMIT_HASH = 'debug-overlay-1737590830'
  
  useEffect(() => {
    console.log('🎯 Thunder Text Product Overlay - Commit:', COMMIT_HASH, 'Loaded:', new Date().toISOString())
  }, [])

  const productId = searchParams?.get('productId')
  const shopDomain = searchParams?.get('shop')
  const accessToken = searchParams?.get('accessToken')

  useEffect(() => {
    if (productId && shopDomain) {
      fetchProductData()
    } else if (!productId || !shopDomain) {
      setError('Missing required parameters: productId or shop')
      setLoading(false)
    } else {
      // For development with auth bypass, create mock product data
      console.log('🔧 Development mode: Using mock product data')
      setProductData({
        id: productId || 'mock-product-123',
        title: 'Sample Product',
        description: 'This is a sample product description for development testing.',
        productType: 'Sample Category',
        vendor: 'Thunder Text Demo',
        tags: ['demo', 'sample', 'test'],
        images: [
          {
            id: 'mock-image-1',
            url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
            altText: 'Sample product image'
          }
        ],
        variants: [
          {
            id: 'mock-variant-1',
            title: 'Default Title',
            price: '29.99',
            compareAtPrice: null,
            inventoryQuantity: 100
          }
        ],
        metafields: []
      })
      setLoading(false)
    }
  }, [productId, shopDomain, accessToken])

  const fetchProductData = async () => {
    try {
      setLoading(true)
      setError(null)

      // For development, try API call but fall back to mock data if it fails
      const headers: Record<string, string> = {
        'X-Shopify-Shop-Domain': shopDomain!,
      }
      
      if (accessToken) {
        headers['X-Shopify-Access-Token'] = accessToken
      }

      const response = await fetch(`/api/product-import?productId=${productId}`, {
        headers
      })

      const data = await response.json()

      if (data.success) {
        setProductData(data.data.product)
      } else {
        // Fall back to mock data for development
        console.log('🔧 API call failed, using mock data for development')
        setProductData({
          id: productId || 'mock-product-123',
          title: 'Sample Product for Development',
          description: 'This is a sample product description for development testing of the new overlay workflow.',
          productType: 'Sample Category',
          vendor: 'Thunder Text Demo',
          tags: ['demo', 'sample', 'test', 'development'],
          images: [
            {
              id: 'mock-image-1',
              url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
              altText: 'Sample product image for testing'
            }
          ],
          variants: [
            {
              id: 'mock-variant-1',
              title: 'Default Title',
              price: '29.99',
              compareAtPrice: '39.99',
              inventoryQuantity: 100
            }
          ],
          metafields: []
        })
      }
    } catch (err) {
      console.error('Error fetching product data, using mock data:', err)
      // Use mock data as fallback
      setProductData({
        id: productId || 'mock-product-123',
        title: 'Sample Product (Mock Data)',
        description: 'This is mock product data used when the API is unavailable.',
        productType: 'Sample Category',
        vendor: 'Thunder Text Demo',
        tags: ['demo', 'sample', 'mock'],
        images: [
          {
            id: 'mock-image-1',
            url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
            altText: 'Mock product image'
          }
        ],
        variants: [
          {
            id: 'mock-variant-1',
            title: 'Default Title',
            price: '29.99',
            compareAtPrice: null,
            inventoryQuantity: 100
          }
        ],
        metafields: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApplyContent = async (content: GeneratedContent): Promise<boolean> => {
    try {
      // Apply the generated content to the product via Shopify API
      const response = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Shop-Domain': shopDomain!,
          'X-Shopify-Access-Token': accessToken!,
        },
        body: JSON.stringify({
          productId: productData?.id,
          generatedContent: content
        })
      })

      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Error applying content:', error)
      return false
    }
  }

  const handleClose = () => {
    setOverlayOpen(false)
    // Close the window or navigate back
    if (window.opener) {
      window.close()
    } else {
      // Fallback: redirect to Shopify admin
      window.location.href = `https://${shopDomain}/admin/products/${productId?.replace('gid://shopify/Product/', '')}`
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #e5e7eb', 
          borderTop: '4px solid #3b82f6', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <p style={{ color: '#6b7280' }}>Loading product data...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem'
      }}>
        <div style={{ 
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Error Loading Product</h2>
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
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!productData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <p>No product data available</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
          🎯 Thunder Text Product Overlay
        </h1>
        
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
            Debug Information
          </h2>
          <p><strong>Commit:</strong> {COMMIT_HASH}</p>
          <p><strong>Product ID:</strong> {productId}</p>
          <p><strong>Shop Domain:</strong> {shopDomain}</p>
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          <p><strong>Product Data Available:</strong> {productData ? 'Yes' : 'No'}</p>
          {error && <p style={{ color: '#dc2626' }}><strong>Error:</strong> {error}</p>}
        </div>

        {productData && (
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#ecfdf5', borderRadius: '6px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#065f46' }}>
              Product Information
            </h2>
            <p><strong>Title:</strong> {productData.title}</p>
            <p><strong>Type:</strong> {productData.productType}</p>
            <p><strong>Vendor:</strong> {productData.vendor}</p>
            <p><strong>Tags:</strong> {productData.tags.join(', ')}</p>
            <p><strong>Images:</strong> {productData.images.length} available</p>
            <p><strong>Variants:</strong> {productData.variants.length} available</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onClick={() => alert('5-step workflow will be implemented here!')}
          >
            Start 5-Step Workflow
          </button>
          
          <button 
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onClick={handleClose}
          >
            Close Overlay
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductOverlayPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #e5e7eb', 
          borderTop: '4px solid #3b82f6', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <ProductOverlayContent />
    </Suspense>
  )
}