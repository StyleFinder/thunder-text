'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Copy } from 'lucide-react'

export default function GetToken() {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  const generateToken = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: 'zunosai-staging-test-store.myshopify.com',
          scopes: 'write_products,read_products,write_product_images,read_metaobjects,write_metaobjects'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setToken(data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token')
    } finally {
      setLoading(false)
    }
  }

  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-oxford-navy mb-2">Generate Access Token</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-oxford-navy">Generate Shopify Access Token</CardTitle>
            <CardDescription>
              This will generate a fresh access token for your development store.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={generateToken}
              disabled={loading}
              className="bg-smart-blue-500 hover:bg-smart-blue-600 text-white"
            >
              {loading ? 'Generating...' : 'Generate Token'}
            </Button>

            {error && (
              <Alert variant="destructive" className="border-berry bg-berry/10">
                <AlertCircle className="h-4 w-4 text-berry" />
                <AlertDescription className="text-berry">{error}</AlertDescription>
              </Alert>
            )}

            {token && (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Access token generated successfully!
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm break-all">
                  {token}
                </div>

                <Button
                  onClick={copyToken}
                  variant="outline"
                  className="border-smart-blue-500 text-smart-blue-500 hover:bg-smart-blue-50"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Token
                </Button>

                <Card className="border-smart-blue-200 bg-smart-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-oxford-navy">Next Steps:</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-oxford-navy">1. Copy the token above</p>
                    <p className="text-oxford-navy">2. Update .env.local:</p>
                    <div className="bg-white p-3 rounded border border-gray-200 font-mono text-xs">
                      SHOPIFY_ACCESS_TOKEN={token}
                    </div>
                    <p className="text-oxford-navy">3. Restart your dev server</p>
                    <p className="text-oxford-navy">4. Test product creation</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
