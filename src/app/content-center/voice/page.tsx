'use client'

import { useShopifyAuth } from '@/app/components/UnifiedShopifyAuth'
import BrandVoiceWizard from '@/app/brand-voice/wizard/BrandVoiceWizard'
import { Loader2, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { BrandVoiceProfile } from '@/app/api/brand-voice/route'

export default function BrandVoicePage() {
  const { shop: shopDomain, isAuthenticated, isLoading: authLoading } = useShopifyAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [existingProfile, setExistingProfile] = useState<BrandVoiceProfile | undefined>()
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function loadExistingProfile() {
      if (!shopDomain) {
        setLoadError("Shop domain is required")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(
          `/api/brand-voice?shop=${encodeURIComponent(shopDomain)}`
        )
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Failed to load brand voice")
        }

        if (result.exists && result.profile) {
          setExistingProfile(result.profile)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error loading brand voice:", error)
        setLoadError(
          error instanceof Error ? error.message : "Failed to load brand voice"
        )
        setIsLoading(false)
      }
    }

    if (shopDomain && isAuthenticated) {
      loadExistingProfile()
    }
  }, [shopDomain, isAuthenticated])

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !shopDomain) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Authentication Required</p>
              <p className="text-sm text-red-700 mt-1">Please access this page from your Shopify admin.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Load error
  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{loadError}</p>
          </div>
        </div>
      </div>
    )
  }

  // Render the wizard
  return <BrandVoiceWizard shopDomain={shopDomain} initialData={existingProfile} />
}
