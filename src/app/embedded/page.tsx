'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useShopifyAuth } from '../components/UnifiedShopifyAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function EmbeddedApp() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, isEmbedded, shop, isLoading, error } = useShopifyAuth()


  useEffect(() => {
    console.log('📍 Embedded context check:', {
      isInIframe: window.top !== window.self,
      hasHost: !!searchParams?.get('host'),
      shop,
      locationHref: window.location.href,
      isAuthenticated
    })

    if (isAuthenticated && shop) {
      const params = new URLSearchParams({
        shop,
        authenticated: 'true',
        host: searchParams?.get('host') || '',
        embedded: '1'
      })
      router.push(`/products?${params.toString()}`)
    }
  }, [isAuthenticated, shop, searchParams, router])

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                Missing shop parameter. Please access this app through your Shopify Admin.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Connecting to Shopify...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Redirecting to Thunder Text...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <h2 className="text-xl font-semibold">Authenticating...</h2>
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Please wait while we connect to Shopify...</p>
        </CardContent>
      </Card>
    </div>
  )
}
