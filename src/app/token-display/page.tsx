'use client'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Copy, Check } from 'lucide-react'

function TokenDisplayContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const shop = searchParams.get('shop')
  const [copied, setCopied] = useState(false)

  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-oxford-navy mb-2">Access Token Generated</h1>
          <p className="text-muted-foreground">For shop: {shop}</p>
        </div>

        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Successfully obtained Shopify access token!
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-oxford-navy">Your Shopify Access Token</CardTitle>
            <CardDescription>
              Copy this token and update your .env.local file:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg border font-mono text-sm break-all">
              {token}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={copyToken}
                disabled={!token}
                className="bg-smart-blue-500 hover:bg-smart-blue-600"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Token
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = `/create?shop=zunosai-staging-test-store.myshopify.com&authenticated=true`}
              >
                Continue to Create Product
              </Button>
            </div>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg text-oxford-navy">Next Steps:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">1. Copy the access token above</p>
                <p className="text-sm">2. Update your .env.local file:</p>
                <div className="bg-background p-3 rounded-md border font-mono text-xs">
                  SHOPIFY_ACCESS_TOKEN={token}
                </div>
                <p className="text-sm">3. Restart your development server</p>
                <p className="text-sm">4. Test product creation</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TokenDisplay() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 text-center">Loading...</div>}>
      <TokenDisplayContent />
    </Suspense>
  );
}
