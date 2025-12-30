'use client'

/**
 * Create Facebook Ad Modal
 *
 * Modal that appears when user clicks "Create Facebook Ad" button
 * Allows selecting campaign and previewing/editing ad before submission
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import CampaignSelector from './CampaignSelector'
import AdPreview from './AdPreview'
import { logger } from '@/lib/logger'

interface CreateAdModalProps {
  open: boolean
  onClose: () => void
  shop: string
  productDescriptionId?: string
  shopifyProductId?: string
  initialTitle: string
  initialCopy: string
  imageUrls: string[]
}

export default function CreateAdModal({
  open,
  onClose,
  shop,
  productDescriptionId,
  shopifyProductId,
  initialTitle,
  initialCopy,
  imageUrls
}: CreateAdModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'submitting' | 'success'>('select')
  const [selectedAdAccountId, setSelectedAdAccountId] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedCampaignName, setSelectedCampaignName] = useState('')
  const [adTitle, setAdTitle] = useState(initialTitle)
  const [adCopy, setAdCopy] = useState(initialCopy)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)

  // Fetch campaign name when campaign selected
  useEffect(() => {
    if (selectedCampaignId && selectedAdAccountId) {
      fetchCampaignName()
    }
  }, [selectedCampaignId])

  const fetchCampaignName = async () => {
    try {
      const response = await fetch(
        `/api/facebook/campaigns?shop=${shop}&ad_account_id=${selectedAdAccountId}`
      )
      const data = await response.json()

      if (data.success) {
        const campaign = data.data.find((c: { id: string; name: string }) => c.id === selectedCampaignId)
        if (campaign) {
          setSelectedCampaignName(campaign.name)
        }
      }
    } catch (err) {
      logger.error('Error fetching campaign name:', err as Error, { component: 'CreateAdModal' })
    }
  }

  const handleCampaignSelect = (adAccountId: string, campaignId: string) => {
    setSelectedAdAccountId(adAccountId)
    setSelectedCampaignId(campaignId)
  }

  const handleNextStep = () => {
    if (step === 'select' && selectedCampaignId) {
      setStep('preview')
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      // Step 1: Create draft
      const draftResponse = await fetch('/api/facebook/ad-drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop,
          product_description_id: productDescriptionId,
          shopify_product_id: shopifyProductId,
          ad_title: adTitle,
          ad_copy: adCopy,
          image_urls: imageUrls,
          selected_image_url: imageUrls[selectedImageIndex],
          facebook_campaign_id: selectedCampaignId,
          facebook_campaign_name: selectedCampaignName,
          facebook_ad_account_id: selectedAdAccountId
        })
      })

      const draftData = await draftResponse.json()

      if (!draftData.success) {
        throw new Error(draftData.error || 'Failed to create ad draft')
      }

      setDraftId(draftData.data.id)
      setStep('submitting')

      // Step 2: Submit to Facebook
      const submitResponse = await fetch('/api/facebook/ad-drafts/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop,
          draft_id: draftData.data.id
        })
      })

      const submitData = await submitResponse.json()

      if (!submitData.success) {
        throw new Error(submitData.error || 'Failed to submit ad to Facebook')
      }

      setStep('success')
    } catch (err) {
      logger.error('Error submitting ad:', err as Error, { component: 'CreateAdModal' })
      setError(err instanceof Error ? err.message : 'Failed to create ad')
      setStep('preview')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset state
    setStep('select')
    setSelectedAdAccountId('')
    setSelectedCampaignId('')
    setSelectedCampaignName('')
    setAdTitle(initialTitle)
    setAdCopy(initialCopy)
    setSelectedImageIndex(0)
    setError(null)
    setDraftId(null)
    onClose()
  }

  const handleViewInFacebook = () => {
    window.open('https://business.facebook.com/adsmanager', '_blank')
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ace-purple">
            Create Facebook Ad
          </DialogTitle>
          <DialogDescription className="text-ace-gray-500">
            {step === 'select' && 'Select the ad account and campaign where you want to create this ad.'}
            {step === 'preview' && 'Review and edit your ad before submitting to Facebook.'}
            {step === 'submitting' && 'Creating your ad in Facebook...'}
            {step === 'success' && 'Your ad has been created successfully!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error creating ad</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'select' && (
            <CampaignSelector
              shop={shop}
              onSelect={handleCampaignSelect}
              selectedAdAccountId={selectedAdAccountId}
              selectedCampaignId={selectedCampaignId}
            />
          )}

          {step === 'preview' && (
            <AdPreview
              title={adTitle}
              copy={adCopy}
              imageUrls={imageUrls}
              selectedImageIndex={selectedImageIndex}
              onTitleChange={setAdTitle}
              onCopyChange={setAdCopy}
              onImageSelect={setSelectedImageIndex}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-ace-purple" />
              <p className="text-base font-medium text-ace-gray-700">
                Creating your ad in Facebook...
              </p>
              <p className="text-sm text-ace-gray-500">
                This may take a few moments
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Ad created successfully!</AlertTitle>
                <AlertDescription className="text-green-700 space-y-2">
                  <p>
                    Your ad has been created in Facebook Ads Manager in PAUSED status.
                  </p>
                  <p>
                    You can review the ad details, adjust targeting and budget, and activate it when ready.
                  </p>
                </AlertDescription>
              </Alert>
              <p className="text-sm text-ace-gray-500">
                Campaign: {selectedCampaignName}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          {step === 'select' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-ace-gray-300 text-ace-gray-700 hover:bg-ace-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!selectedCampaignId}
                className="bg-ace-purple hover:bg-ace-purple-dark text-white"
              >
                Next: Preview Ad
              </Button>
            </>
          )}

          {step === 'preview' && (
            <Button
              variant="outline"
              onClick={() => setStep('select')}
              className="border-ace-gray-300 text-ace-gray-700 hover:bg-ace-gray-50"
            >
              Back to Campaign Selection
            </Button>
          )}

          {step === 'success' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-ace-gray-300 text-ace-gray-700 hover:bg-ace-gray-50"
              >
                Close
              </Button>
              <Button
                onClick={handleViewInFacebook}
                className="bg-ace-purple hover:bg-ace-purple-dark text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Facebook Ads
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
