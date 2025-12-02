'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNavigation } from './hooks/useNavigation'
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const [deploymentStatus, setDeploymentStatus] = useState('checking')
  const { navigateTo } = useNavigation()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get parameters
  const shop = searchParams?.get('shop') || ''
  const host = searchParams?.get('host') || ''

  useEffect(() => {
    console.log('🏠 Home page - checking shop parameter:', { shop, host })

    // If shop parameter exists, redirect to dashboard immediately
    if (shop) {
      navigateTo('/dashboard')
    }
  }, [shop, host, navigateTo])

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-oxford-900">Welcome to Thunder Text</h1>
          <p className="text-muted-foreground mt-2">AI-Powered Product Description Generator</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deployment Complete - Services Ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-dodger-50 border-dodger-200">
              <Info className="h-4 w-4 text-dodger-600" />
              <AlertDescription>
                🚀 <strong>Version:</strong> Render Build (2025-10-09) |
                🌐 <strong>Source:</strong> thunder-text.onrender.com |
                ⚡ <strong>Status:</strong> Live Production
              </AlertDescription>
            </Alert>

            <p className="text-sm text-foreground">
              Thunder Text is now deployed and ready to generate AI-powered product descriptions for your Shopify store.
            </p>

            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <h3 className="font-semibold text-green-900 mb-2">✅ System Status</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                  <li>Database: Connected to Supabase</li>
                  <li>AI Engine: OpenAI GPT-4 Vision Ready</li>
                  <li>Shopify API: Authentication Configured</li>
                  <li>Deployment: Live on Render</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <h3 className="font-semibold text-amber-900 mb-2">📋 Next Steps</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800">
                  <li>Update Shopify Partner App settings with this URL</li>
                  <li>Install app in your test store (zunosai-staging-test-store)</li>
                  <li>Test the end-to-end workflow</li>
                  <li>Begin generating product descriptions!</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={() => window.open('https://partners.shopify.com', '_blank')}
              >
                Configure Shopify App
              </Button>

              <Button
                variant="default"
                onClick={() => navigateTo('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
