'use client'

/**
 * React Error Boundary Component
 *
 * Catches React component errors and prevents full page crashes.
 * Integrates with Sentry for automatic error reporting.
 */

import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  context?: string // e.g., "AIE Page", "Product Creation"
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Send to Sentry with component context
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: this.props.context || 'unknown',
      },
    })

    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise default
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

/**
 * Default Error Fallback UI
 */
function DefaultErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '500px',
        padding: '2rem',
        backgroundColor: '#FEE2E2',
        borderRadius: '8px',
        border: '1px solid #EF4444'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#991B1B' }}>
          Something went wrong
        </h2>
        <p style={{ marginBottom: '1.5rem', color: '#7F1D1D' }}>
          We've encountered an error. Our team has been notified and is working on a fix.
        </p>
        {error && process.env.NODE_ENV === 'development' && (
          <details style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#FEF2F2',
            borderRadius: '4px',
            textAlign: 'left',
            fontSize: '0.875rem'
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Error Details (Development Only)
            </summary>
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#7F1D1D'
            }}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
        <button
          onClick={onReset}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#DC2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
