'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface TokenAnalysis {
  valid: boolean
  error?: string
  decoded?: {
    iss?: string
    dest?: string
    aud?: string
    sub?: string
    exp?: number
    nbf?: number
    iat?: number
    jti?: string
    sid?: string
  }
  exchange_test?: {
    success: boolean
    access_token?: string
    error?: string
  }
  [key: string]: unknown
}

export default function DebugTokenPage() {
  const [sessionToken, setSessionToken] = useState<string>('')
  const [analysis, setAnalysis] = useState<TokenAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const shop = searchParams?.get('shop')
  const host = searchParams?.get('host')

  useEffect(() => {
    // Try to get session token from App Bridge if in embedded context
    if (typeof window !== 'undefined' && window.top !== window.self) {
      const script = document.createElement('script')
      script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js'
      script.onload = async () => {
        try {
          // @ts-ignore
          const app = window.shopify.createApp({
            apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
            host: host || ''
          })

          // @ts-ignore
          const token = await window.shopify.idToken()
          if (token) {
            setSessionToken(token)
          }
        } catch (err) {
          console.error('Failed to get session token:', err)
        }
      }
      document.head.appendChild(script)
    }
  }, [host])

  const analyzeToken = async () => {
    if (!sessionToken) {
      setError('Please enter a session token')
      return
    }

    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/debug/test-session-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionToken })
      })

      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Session Token Debugger</h1>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Shop:</strong> {shop || 'Not provided'}</p>
        <p><strong>Host:</strong> {host || 'Not provided'}</p>
        <p><strong>Embedded:</strong> {typeof window !== 'undefined' && window.top !== window.self ? 'Yes' : 'No'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="token">Session Token:</label><br />
        <textarea
          id="token"
          value={sessionToken}
          onChange={(e) => setSessionToken(e.target.value)}
          style={{
            width: '100%',
            height: '150px',
            marginTop: '10px',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}
          placeholder="Paste your session token here or it will be auto-detected if in embedded context..."
        />
      </div>

      <button
        onClick={analyzeToken}
        disabled={loading || !sessionToken}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: loading || !sessionToken ? 'not-allowed' : 'pointer',
          backgroundColor: loading || !sessionToken ? '#ccc' : '#008060',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        {loading ? 'Analyzing...' : 'Analyze Token'}
      </button>

      {error && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {analysis && (
        <div style={{ marginTop: '20px' }}>
          <h2>Analysis Results:</h2>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '600px'
          }}>
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <h3>How to use this debugger:</h3>
        <ol>
          <li>Access this page through your Shopify admin (embedded mode)</li>
          <li>The session token should be auto-detected</li>
          <li>Click "Analyze Token" to see detailed diagnostics</li>
          <li>The analysis will show:
            <ul>
              <li>Token structure and validity</li>
              <li>Expiration status</li>
              <li>Audience/Client ID matching</li>
              <li>Actual Token Exchange test results</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  )
}