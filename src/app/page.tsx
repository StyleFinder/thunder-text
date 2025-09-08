'use client'

import { useState } from 'react'

interface GenerationResult {
  title: string
  description: string
  bulletPoints: string[]
  metaDescription: string
  keywords: string[]
  confidence: number
  processingTime: number
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
}

export default function HomePage() {
  const [deploymentStatus, setDeploymentStatus] = useState('checking')

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#2563eb', fontSize: '2.5rem', marginBottom: '1rem' }}>
          Thunder Text
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.2rem', marginBottom: '2rem' }}>
          AI-Powered Product Description Generator
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '2px solid #3b82f6',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '10px'
          }}></div>
          <span style={{ color: '#374151', fontSize: '1.1rem' }}>
            Deployment Complete - Initializing Services...
          </span>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Thunder Text is now deployed and ready to generate AI-powered product descriptions for your Shopify store.
          </p>
          
          <div style={{ 
            backgroundColor: '#ecfdf5',
            border: '1px solid #d1fae5',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{ color: '#065f46', marginBottom: '0.5rem', fontSize: '1rem' }}>
              ✅ System Status
            </h3>
            <ul style={{ color: '#059669', textAlign: 'left', paddingLeft: '1.5rem' }}>
              <li>Database: Connected to Supabase</li>
              <li>AI Engine: OpenAI GPT-4 Vision Ready</li>
              <li>Shopify API: Authentication Configured</li>
              <li>Deployment: Live on Render</li>
            </ul>
          </div>
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '6px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#92400e', marginBottom: '0.5rem', fontSize: '1rem' }}>
            📋 Next Steps
          </h3>
          <ol style={{ color: '#b45309', textAlign: 'left', paddingLeft: '1.5rem' }}>
            <li>Update Shopify Partner App settings with this URL</li>
            <li>Install app in your test store (zunosai-staging-test-store)</li>
            <li>Test the end-to-end workflow</li>
            <li>Begin generating product descriptions!</li>
          </ol>
        </div>

        <button 
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
          onClick={() => window.open('https://partners.shopify.com', '_blank')}
        >
          Configure Shopify App
        </button>
        
        <button 
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
          onClick={() => window.location.href = '/dashboard'}
        >
          Go to Dashboard
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
