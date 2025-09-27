'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function DebugAppBridge() {
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  const debugAppBridge = async () => {
    try {
      const shop = searchParams?.get('shop') || 'zunosai-staging-test-store'
      addLog(`🏪 Shop: ${shop}`)

      // Check if we're in an embedded context
      const isEmbedded = searchParams?.get('embedded') === '1' || window.top !== window.self
      addLog(`🔍 Is Embedded: ${isEmbedded}`)
      addLog(`🔍 Window context: top=${window.top}, self=${window.self}`)
      addLog(`🔍 URL params: ${window.location.search}`)

      if (!isEmbedded) {
        addLog('⚠️ Not in embedded context - App Bridge not needed')
        return
      }

      addLog('🔄 Loading Shopify App Bridge...')

      // Load App Bridge script
      const script = document.createElement('script')
      script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js'
      script.async = true

      script.onload = async () => {
        try {
          addLog('✅ App Bridge script loaded')

          // Check if shopifyApp is available
          if (typeof window.shopifyApp === 'undefined') {
            throw new Error('window.shopifyApp is undefined')
          }
          addLog('✅ window.shopifyApp is available')

          // Get API key
          const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY
          addLog(`🔑 API Key: ${apiKey ? 'SET' : 'NOT SET'}`)

          if (!apiKey) {
            throw new Error('NEXT_PUBLIC_SHOPIFY_API_KEY is not set')
          }

          addLog('🔄 Creating App Bridge app instance...')
          const app = window.shopifyApp({
            apiKey: apiKey
          })
          addLog('✅ App Bridge app instance created')

          addLog('🔄 Getting session token...')
          const token = await app.idToken()
          addLog(`✅ Session token received: ${token ? 'YES' : 'NO'}`)
          addLog(`📝 Token length: ${token ? token.length : 0}`)
          addLog(`📝 Token preview: ${token ? token.substring(0, 50) + '...' : 'null'}`)

          setSessionToken(token)

          if (!token) {
            throw new Error('Session token is null or undefined')
          }

          addLog('🔄 Testing token exchange...')
          const response = await fetch('/api/shopify/token-exchange', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionToken: token,
              shop: shop
            })
          })

          addLog(`📡 Token exchange response status: ${response.status}`)
          const result = await response.json()
          addLog(`📦 Token exchange result: ${JSON.stringify(result, null, 2)}`)

          if (result.success) {
            addLog('🎉 Token exchange successful!')
          } else {
            addLog(`❌ Token exchange failed: ${result.error}`)
            setError(result.error)
          }

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          addLog(`❌ App Bridge error: ${errorMsg}`)
          setError(errorMsg)
        }
      }

      script.onerror = () => {
        const errorMsg = 'Failed to load App Bridge script'
        addLog(`❌ ${errorMsg}`)
        setError(errorMsg)
      }

      document.head.appendChild(script)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      addLog(`❌ Setup error: ${errorMsg}`)
      setError(errorMsg)
    }
  }

  useEffect(() => {
    debugAppBridge()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>App Bridge Debug Tool</h1>

      {error && (
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {sessionToken && (
        <div style={{
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px'
        }}>
          <strong>Session Token:</strong> {sessionToken.substring(0, 100)}...
        </div>
      )}

      <h2>Debug Logs:</h2>
      <div style={{
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        padding: '10px',
        maxHeight: '400px',
        overflow: 'auto',
        fontSize: '12px'
      }}>
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            {log}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => {
          setLogs([])
          setError(null)
          setSessionToken(null)
          debugAppBridge()
        }}>
          🔄 Retry Debug
        </button>
      </div>
    </div>
  )
}