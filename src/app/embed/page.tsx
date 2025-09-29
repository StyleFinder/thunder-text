'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function EmbedPage() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop')
  const host = searchParams?.get('host')

  useEffect(() => {
    console.log('[Embed] Loading with params:', { shop, host })

    if (!shop) {
      console.error('[Embed] Missing shop parameter')
      return
    }

    // Build redirect URL with parameters
    const params = new URLSearchParams({
      shop,
      host: host || btoa(`${shop}/admin`),
      embedded: '1'
    })

    // Redirect to main app
    const redirectUrl = `/?${params.toString()}`
    console.log('[Embed] Redirecting to:', redirectUrl)

    // Small delay to ensure proper loading
    setTimeout(() => {
      window.location.href = redirectUrl
    }, 100)
  }, [shop, host])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>
          Loading Thunder Text...
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {shop || 'Initializing...'}
        </div>
      </div>
    </div>
  )
}