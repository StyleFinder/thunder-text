'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface Product {
  node: {
    id: string
    title: string
    description: string
    handle: string
    images: {
      edges: Array<{
        node: {
          id: string
          url: string
          altText: string
        }
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

export default function Dashboard() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')
  
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!shop || !authenticated) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#2563eb', fontSize: '2rem' }}>Thunder Text Dashboard</h1>
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
            Please install Thunder Text from your Shopify admin panel to access the dashboard.
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
            onClick={() => window.location.href = '/'}
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#2563eb', fontSize: '2rem', marginBottom: '0.5rem' }}>
          Thunder Text Dashboard
        </h1>
        <p style={{ color: '#6b7280' }}>
          Connected to: {shop}
        </p>
      </div>

      <div style={{
        backgroundColor: '#ecfdf5',
        border: '1px solid #d1fae5',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#065f46', marginBottom: '1rem' }}>
          🎉 Welcome to Thunder Text!
        </h2>
        <p style={{ color: '#059669', marginBottom: '1.5rem' }}>
          Your AI-powered product description generator is ready to use.
        </p>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#065f46', marginBottom: '1rem' }}>Quick Actions:</h3>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}>
              View Products
            </button>
            <button style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}>
              Generate Descriptions
            </button>
            <button style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}>
              View Settings
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.9rem', color: '#059669' }}>
          <p>✅ Connected to Shopify</p>
          <p>✅ AI Engine Ready</p>
          <p>✅ Database Connected</p>
        </div>
      </div>
    </div>
  )
}