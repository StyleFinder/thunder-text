'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StoreTokenPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleStoreToken = async () => {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/auth/manual-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop: 'zunosai-staging-test-store',
          token: 'shpat_73e018f23c640897cfb27a236edfa',
          scope: 'read_content,read_files,read_inventory,read_metaobject_definitions,read_metaobjects,read_product_feeds,read_product_listings,read_products,write_content,write_files,write_inventory,write_metaobject_definitions,write_metaobjects,write_product_feeds,write_product_listings,write_products'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(`✅ Token stored successfully! Shop ID: ${data.shopId}`)

        // Redirect to enhance page after 2 seconds
        setTimeout(() => {
          router.push('/enhance?shop=zunosai-staging-test-store')
        }, 2000)
      } else {
        setError(`❌ Failed to store token: ${data.error || 'Unknown error'}\n${data.details || ''}`)
      }
    } catch (error) {
      setError(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyToken = async () => {
    try {
      const response = await fetch('/api/debug/token-status?shop=zunosai-staging-test-store')
      const data = await response.json()

      if (data.tokenStatus.found) {
        setMessage(`✅ Token verified! Preview: ${data.tokenStatus.tokenPreview}`)
      } else {
        setError(`❌ Token not found: ${data.tokenStatus.error}`)
      }
    } catch (error) {
      setError(`❌ Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Store Admin Token</h1>

      <div style={{
        background: '#f0f0f0',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <p><strong>Shop:</strong> zunosai-staging-test-store</p>
        <p><strong>Token:</strong> shpat_73e018f23c640897cfb27a236edfa</p>
        <p><strong>Status:</strong> Ready to store in database</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={handleStoreToken}
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            background: loading ? '#ccc' : '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1.1rem',
            cursor: loading ? 'default' : 'pointer'
          }}
        >
          {loading ? 'Storing Token...' : 'Store Token in Database'}
        </button>

        <button
          onClick={handleVerifyToken}
          style={{
            padding: '1rem 2rem',
            background: '#337ab7',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1.1rem',
            cursor: 'pointer'
          }}
        >
          Verify Token Status
        </button>
      </div>

      {message && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          whiteSpace: 'pre-wrap'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>Next Steps:</h3>
        <ol>
          <li>Click "Store Token in Database" to save the admin token</li>
          <li>Wait for confirmation message</li>
          <li>You'll be redirected to the enhance page automatically</li>
          <li>Real product data should now load from your Shopify store</li>
        </ol>
      </div>
    </div>
  )
}