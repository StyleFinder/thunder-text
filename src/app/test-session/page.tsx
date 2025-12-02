'use client'

import { useState, useEffect } from 'react'
import { useAppBridge } from '@/app/components/AppBridgeProvider'
import { authenticatedFetch } from '@/lib/shopify/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { logger } from '@/lib/logger'

export default function TestSessionPage() {
  const { shop, isEmbedded, isLoading } = useAppBridge()
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{
    tokenFound: boolean | null
    apiCall: boolean | null
    realData: boolean | null
    error: string | null
  }>({
    tokenFound: null,
    apiCall: null,
    realData: null,
    error: null
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = window.sessionStorage.getItem('shopify_session_token')
      setSessionToken(token)
      setTestResults(prev => ({ ...prev, tokenFound: !!token }))
    }
  }, [])

  const testSessionToken = async () => {
    try {
      console.log('🧪 Testing session token...')
      setTestResults({
        tokenFound: !!sessionToken,
        apiCall: null,
        realData: null,
        error: null
      })

      // Test API call with session token
      const response = await authenticatedFetch(`/api/shopify/products?shop=${shop}&limit=1`)
      const data = await response.json()


      if (response.ok) {
        setTestResults(prev => ({ ...prev, apiCall: true }))

        // Check if we got real data (not mock)
        const hasRealData = data.data?.products?.[0] &&
                           !data.message?.includes('mock') &&
                           !data.message?.includes('demo')

        setTestResults(prev => ({
          ...prev,
          realData: hasRealData,
          error: hasRealData ? null : 'Still using mock data - session token may not be working'
        }))
      } else {
        setTestResults(prev => ({
          ...prev,
          apiCall: false,
          error: data.error || 'API call failed'
        }))
      }
    } catch (error) {
      logger.error('❌ Test failed:', error as Error, { component: 'test-session' })
      setTestResults(prev => ({
        ...prev,
        apiCall: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Session Token Test</h1>
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="text-gray-600">Loading App Bridge...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Session Token Test</h1>

        <Card>
          <CardHeader>
            <CardTitle>App Bridge Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span className="text-gray-600">Shop:</span>
              <span className="font-medium text-gray-900">{shop || 'Not detected'}</span>

              <span className="text-gray-600">Embedded:</span>
              <span className="font-medium text-gray-900">{isEmbedded ? 'Yes' : 'No'}</span>

              <span className="text-gray-600">Session Token:</span>
              <span className="font-mono text-xs text-gray-700">
                {sessionToken ? `Found (${sessionToken.substring(0, 20)}...)` : 'Not found'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-900 w-32">Token Found:</span>
                {testResults.tokenFound === null ? (
                  <Badge variant="secondary">
                    <Info className="mr-1 h-3 w-3" />
                    Not tested
                  </Badge>
                ) : testResults.tokenFound ? (
                  <Badge className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Pass
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Fail
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-900 w-32">API Call:</span>
                {testResults.apiCall === null ? (
                  <Badge variant="secondary">
                    <Info className="mr-1 h-3 w-3" />
                    Not tested
                  </Badge>
                ) : testResults.apiCall ? (
                  <Badge className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Pass
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Fail
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-900 w-32">Real Data:</span>
                {testResults.realData === null ? (
                  <Badge variant="secondary">
                    <Info className="mr-1 h-3 w-3" />
                    Not tested
                  </Badge>
                ) : testResults.realData ? (
                  <Badge className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Pass
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500 hover:bg-yellow-600">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Mock Data
                  </Badge>
                )}
              </div>

              {testResults.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Error: {testResults.error}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button onClick={testSessionToken} className="w-full" size="lg">
              Run Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>This page tests if session tokens from App Bridge are working correctly.</li>
              <li>If you see "Token Found: Pass", the App Bridge is getting session tokens.</li>
              <li>Click "Run Test" to verify the session token works with Shopify API.</li>
              <li>If "Real Data: Mock Data" appears, the app may need proper OAuth authorization.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
