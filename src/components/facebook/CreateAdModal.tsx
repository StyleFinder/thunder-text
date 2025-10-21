'use client'

/**
 * Create Facebook Ad Modal
 *
 * Modal that appears when user clicks "Create Facebook Ad" button
 * Allows selecting campaign and previewing/editing ad before submission
 */

import { useState, useEffect } from 'react'
import {
  Modal,
  BlockStack,
  Text,
  Banner,
  Spinner,
  InlineStack
} from '@shopify/polaris'
import CampaignSelector from './CampaignSelector'
import AdPreview from './AdPreview'

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
      console.error('Error fetching campaign name:', err)
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
      console.error('Error submitting ad:', err)
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Facebook Ad"
      large
      primaryAction={
        step === 'select'
          ? {
              content: 'Next: Preview Ad',
              onAction: handleNextStep,
              disabled: !selectedCampaignId
            }
          : step === 'preview'
          ? undefined // AdPreview has its own submit button
          : step === 'success'
          ? {
              content: 'View in Facebook Ads',
              onAction: () => {
                window.open('https://business.facebook.com/adsmanager', '_blank')
                handleClose()
              }
            }
          : undefined
      }
      secondaryActions={
        step === 'preview'
          ? [
              {
                content: 'Back to Campaign Selection',
                onAction: () => setStep('select')
              }
            ]
          : step === 'success'
          ? [
              {
                content: 'Close',
                onAction: handleClose
              }
            ]
          : undefined
      }
    >
      <Modal.Section>
        <BlockStack gap="400">
          {error && (
            <Banner tone="critical" title="Error creating ad">
              <Text as="p">{error}</Text>
            </Banner>
          )}

          {step === 'select' && (
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Select the ad account and campaign where you want to create this ad.
              </Text>
              <CampaignSelector
                shop={shop}
                onSelect={handleCampaignSelect}
                selectedAdAccountId={selectedAdAccountId}
                selectedCampaignId={selectedCampaignId}
              />
            </BlockStack>
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
            <BlockStack gap="400" inlineAlign="center">
              <Spinner size="large" />
              <Text as="p" variant="bodyMd" alignment="center">
                Creating your ad in Facebook...
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                This may take a few moments
              </Text>
            </BlockStack>
          )}

          {step === 'success' && (
            <BlockStack gap="400">
              <Banner tone="success" title="Ad created successfully!">
                <BlockStack gap="200">
                  <Text as="p">
                    Your ad has been created in Facebook Ads Manager in PAUSED status.
                  </Text>
                  <Text as="p">
                    You can review the ad details, adjust targeting and budget, and activate it when ready.
                  </Text>
                </BlockStack>
              </Banner>
              <Text as="p" variant="bodySm" tone="subdued">
                Campaign: {selectedCampaignName}
              </Text>
            </BlockStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}
