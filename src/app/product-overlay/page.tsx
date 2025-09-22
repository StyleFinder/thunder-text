'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductDescriptionOverlay from '@/app/components/ProductDescriptionOverlay'
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

  const productId = searchParams?.get('productId')
  const shopDomain = searchParams?.get('shop')
  const accessToken = searchParams?.get('accessToken')

  useEffect(() => {
    if (productId && shopDomain && accessToken) {
      fetchProductData()
    } else {
      setError('Missing required parameters: productId, shop, or accessToken')
      setLoading(false)
    }
  }, [productId, shopDomain, accessToken])

  const fetchProductData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/product-import?productId=${productId}`, {
        headers: {
          'X-Shopify-Shop-Domain': shopDomain!,
          'X-Shopify-Access-Token': accessToken!,
        }
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch product data')
      }

      setProductData(data.data.product)
    } catch (err) {
      console.error('Error fetching product data:', err)
      setError('Failed to load product data')
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <ProductDescriptionOverlay
        isOpen={overlayOpen}
        onClose={handleClose}
        productData={productData}
        onApply={handleApplyContent}
      />
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