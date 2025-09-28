'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function EmbedPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Initializing...')
  const searchParams = useSearchParams()

  const shop = searchParams?.get('shop')
  const host = searchParams?.get('host')
  const sessionToken = searchParams?.get('id_token')

  useEffect(() => {
    console.log('[Embed] Starting with params:', { shop, host, hasToken: !!sessionToken })

    if (!shop) {
      setError('Missing required parameter: shop')
      setLoading(false)
      return
    }

    // If we don't have a host, try to get it from the URL or generate it
    const actualHost = host || (typeof window !== 'undefined' ? btoa(`${shop}/admin`) : '')

    // This page acts as a bridge to ensure proper embedding
    setStatus('Preparing authentication...')

    // Build redirect parameters
    const params = new URLSearchParams({
      shop,
      host: actualHost,
      embedded: '1',
      authenticated: 'true'
    })

    // If we have a session token, include it
    if (sessionToken) {
      params.set('id_token', sessionToken)
    }

    // Log the redirect URL for debugging
    const redirectUrl = `/?${params.toString()}`
    console.log('[Embed] Redirecting to:', redirectUrl)

    // Small delay to ensure App Bridge loads
    setTimeout(() => {
      setStatus('Redirecting to app...')
      window.location.href = redirectUrl
    }, 250)
  }, [shop, host, sessionToken])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {loading && !error && (
        <>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>
            🔄 Loading Thunder Text...
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            {status}
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            Shop: {shop || 'Not specified'}
          </div>
        </>
      )}

      {error && (
        <div style={{
          padding: '20px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Include App Bridge script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            console.log('[Embed] Checking for App Bridge...');
            if (!window.shopify) {
              console.log('[Embed] Loading App Bridge script...');
              const script = document.createElement('script');
              script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
              script.onload = () => console.log('[Embed] App Bridge loaded successfully');
              script.onerror = (e) => console.error('[Embed] Failed to load App Bridge:', e);
              document.head.appendChild(script);
            } else {
              console.log('[Embed] App Bridge already present');
            }
          `
        }}
      />
    </div>
  )
}