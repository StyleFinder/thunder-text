'use client'

import React, { useState, useEffect } from 'react'
import { Card, Frame, Modal, Button, FormLayout, TextField, Select, RadioButton, Stack, Thumbnail, Badge, Banner, Spinner, Layout, Page, Icon } from '@shopify/polaris'
import { CloseIcon, ImageIcon, EditIcon, CheckIcon } from '@shopify/polaris-icons'

interface ProductImage {
  id: string
  url: string
  altText?: string
}

interface ProductVariant {
  id: string
  title: string
  price: string
}

interface ProductData {
  id: string
  title: string
  description: string
  handle: string
  images: ProductImage[]
  variants: ProductVariant[]
  tags: string[]
  productType: string
  vendor: string
  collections?: string[]
  metafields?: Record<string, any>
}

interface GeneratedContent {
  title: string
  description: string
  bulletPoints: string[]
  metaDescription: string
  keywords: string[]
}

interface ProductDescriptionOverlayProps {
  isOpen: boolean
  onClose: () => void
  productData: ProductData
  onApply: (content: GeneratedContent) => Promise<boolean>
}

const BRAND_VOICES = [
  { label: 'Professional & Authoritative', value: 'professional' },
  { label: 'Friendly & Conversational', value: 'friendly' },
  { label: 'Luxurious & Premium', value: 'luxury' },
  { label: 'Playful & Fun', value: 'playful' },
  { label: 'Minimalist & Clean', value: 'minimalist' },
  { label: 'Bold & Energetic', value: 'bold' },
  { label: 'Trustworthy & Reliable', value: 'trustworthy' },
  { label: 'Creative & Artistic', value: 'creative' }
]

const TARGET_LENGTHS = [
  { label: 'Short (100-200 characters)', value: 'short', description: 'Concise and to the point' },
  { label: 'Medium (200-400 characters)', value: 'medium', description: 'Balanced detail and readability' },
  { label: 'Long (400+ characters)', value: 'long', description: 'Comprehensive and detailed' }
]

const FOCUS_AREAS = [
  'Material & Quality',
  'Fit & Sizing',
  'Style & Design',
  'Care Instructions',
  'Measurements',
  'Versatility',
  'Brand Story',
  'Sustainability'
]

export default function ProductDescriptionOverlay({ 
  isOpen, 
  onClose, 
  productData, 
  onApply 
}: ProductDescriptionOverlayProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [brandVoice, setBrandVoice] = useState('professional')
  const [targetLength, setTargetLength] = useState('medium')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [customInstructions, setCustomInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [editableContent, setEditableContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  // Initialize with first image selected by default
  useEffect(() => {
    if (productData.images.length > 0 && selectedImages.length === 0) {
      setSelectedImages([productData.images[0].url])
    }
  }, [productData.images, selectedImages.length])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1)
      setSelectedImages(productData.images.length > 0 ? [productData.images[0].url] : [])
      setBrandVoice('professional')
      setTargetLength('medium')
      setFocusAreas([])
      setCustomInstructions('')
      setGeneratedContent(null)
      setEditableContent(null)
      setError(null)
      setLoading(false)
      setApplying(false)
    }
  }, [isOpen, productData.images])

  const handleImageToggle = (imageUrl: string) => {
    setSelectedImages(prev => 
      prev.includes(imageUrl) 
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl]
    )
  }

  const handleFocusAreaToggle = (area: string) => {
    setFocusAreas(prev => 
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    )
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: selectedImages,
          productTitle: productData.title,
          productType: productData.productType,
          tags: productData.tags,
          brandVoice: brandVoice,
          targetLength: targetLength,
          focusAreas: focusAreas,
          customInstructions: customInstructions,
          existingDescription: productData.description,
          variants: productData.variants,
          collections: productData.collections || [],
          vendor: productData.vendor
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      setGeneratedContent(data.data.generatedContent)
      setEditableContent(data.data.generatedContent)
      setCurrentStep(5)
    } catch (err) {
      console.error('Generation error:', err)
      setError('Failed to generate content. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyContent = async () => {
    if (!editableContent) return

    setApplying(true)
    try {
      const success = await onApply(editableContent)
      if (success) {
        onClose()
      } else {
        setError('Failed to apply content to product')
      }
    } catch (err) {
      setError('Failed to apply content to product')
    } finally {
      setApplying(false)
    }
  }

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((step) => (
        <React.Fragment key={step}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step <= currentStep ? '#2563eb' : '#e5e7eb',
              color: step <= currentStep ? 'white' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {step < currentStep ? <Icon source={CheckIcon} /> : step}
          </div>
          {step < 5 && (
            <div
              style={{
                width: '60px',
                height: '2px',
                backgroundColor: step < currentStep ? '#2563eb' : '#e5e7eb',
                margin: '0 0.5rem'
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  const renderDataReview = () => (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Review Product Data
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Confirm the product information that will be used for AI generation
        </p>

        <Layout>
          <Layout.Section oneHalf>
            <Stack vertical spacing="loose">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Product Title</h3>
                <p style={{ color: '#374151' }}>{productData.title}</p>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Product Type</h3>
                <p style={{ color: '#374151' }}>{productData.productType || 'Not specified'}</p>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Vendor</h3>
                <p style={{ color: '#374151' }}>{productData.vendor || 'Not specified'}</p>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Tags</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {productData.tags.map((tag, index) => (
                    <Badge key={index}>{tag}</Badge>
                  ))}
                </div>
              </div>
            </Stack>
          </Layout.Section>

          <Layout.Section oneHalf>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Product Images ({productData.images.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem' }}>
                {productData.images.slice(0, 6).map((image, index) => (
                  <Thumbnail
                    key={index}
                    source={image.url}
                    alt={image.altText || `Product image ${index + 1}`}
                    size="large"
                  />
                ))}
                {productData.images.length > 6 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    +{productData.images.length - 6} more
                  </div>
                )}
              </div>
            </div>

            {productData.variants.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Variants ({productData.variants.length})
                </h3>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {productData.variants.slice(0, 3).map((variant, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '0.25rem 0',
                      fontSize: '0.875rem'
                    }}>
                      <span>{variant.title}</span>
                      <span style={{ color: '#6b7280' }}>${variant.price}</span>
                    </div>
                  ))}
                  {productData.variants.length > 3 && (
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', paddingTop: '0.5rem' }}>
                      +{productData.variants.length - 3} more variants
                    </div>
                  )}
                </div>
              </div>
            )}
          </Layout.Section>
        </Layout>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button primary onClick={() => setCurrentStep(2)}>
            Continue to Image Selection
          </Button>
        </div>
      </div>
    </Card>
  )

  const renderImageSelection = () => (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Select Images for Analysis
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Choose which product images the AI should analyze to generate your description
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          {productData.images.map((image, index) => {
            const isSelected = selectedImages.includes(image.url)
            return (
              <div
                key={index}
                style={{
                  position: 'relative',
                  border: `2px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleImageToggle(image.url)}
              >
                <img
                  src={image.url}
                  alt={image.altText || `Product image ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover'
                  }}
                />
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon source={CheckIcon} />
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  textAlign: 'center'
                }}>
                  Image {index + 1}
                </div>
              </div>
            )
          })}
        </div>

        {selectedImages.length === 0 && (
          <Banner status="warning" onDismiss={() => {}}>
            Please select at least one image for analysis
          </Banner>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setCurrentStep(1)}>
            Back
          </Button>
          <Button 
            primary 
            disabled={selectedImages.length === 0}
            onClick={() => setCurrentStep(3)}
          >
            Continue to Settings
          </Button>
        </div>
      </div>
    </Card>
  )

  const renderGenerationSettings = () => (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Generation Settings
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Customize how the AI generates your product description
        </p>

        <FormLayout>
          <Select
            label="Brand Voice"
            options={BRAND_VOICES}
            value={brandVoice}
            onChange={setBrandVoice}
            helpText="Choose the tone and style for your product description"
          />

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '1rem' }}>
              Target Length
            </label>
            <Stack vertical spacing="tight">
              {TARGET_LENGTHS.map((option) => (
                <RadioButton
                  key={option.value}
                  label={option.label}
                  helpText={option.description}
                  checked={targetLength === option.value}
                  id={option.value}
                  name="length"
                  onChange={() => setTargetLength(option.value)}
                />
              ))}
            </Stack>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '1rem' }}>
              Focus Areas (Optional)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {FOCUS_AREAS.map((area) => (
                <label key={area} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={focusAreas.includes(area)}
                    onChange={() => handleFocusAreaToggle(area)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{area}</span>
                </label>
              ))}
            </div>
          </div>

          <TextField
            label="Custom Instructions (Optional)"
            value={customInstructions}
            onChange={setCustomInstructions}
            multiline={4}
            placeholder="Add any specific requirements, key features to highlight, or special instructions for the AI..."
            helpText="Provide additional context to help generate more targeted content"
          />
        </FormLayout>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setCurrentStep(2)}>
            Back
          </Button>
          <Button primary onClick={() => setCurrentStep(4)}>
            Continue to Preview
          </Button>
        </div>
      </div>
    </Card>
  )

  const renderGenerationPreview = () => (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Review & Generate
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Review your settings and generate the AI description
        </p>

        <div style={{ 
          backgroundColor: '#f9fafb', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.75rem' }}>Generation Summary</h3>
          <div style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
            <p><strong>Product:</strong> {productData.title}</p>
            <p><strong>Images Selected:</strong> {selectedImages.length} of {productData.images.length}</p>
            <p><strong>Brand Voice:</strong> {BRAND_VOICES.find(v => v.value === brandVoice)?.label}</p>
            <p><strong>Target Length:</strong> {TARGET_LENGTHS.find(l => l.value === targetLength)?.label}</p>
            {focusAreas.length > 0 && (
              <p><strong>Focus Areas:</strong> {focusAreas.join(', ')}</p>
            )}
            {customInstructions && (
              <p><strong>Custom Instructions:</strong> {customInstructions.substring(0, 100)}...</p>
            )}
          </div>
        </div>

        {error && (
          <Banner status="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setCurrentStep(3)}>
            Back to Settings
          </Button>
          <Button 
            primary 
            loading={loading}
            onClick={handleGenerate}
          >
            {loading ? 'Generating...' : 'Generate AI Description'}
          </Button>
        </div>
      </div>
    </Card>
  )

  const renderResults = () => (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Generated Content
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Review and edit your AI-generated product description
        </p>

        {editableContent && (
          <FormLayout>
            <TextField
              label="Product Title"
              value={editableContent.title}
              onChange={(value) => setEditableContent({...editableContent, title: value})}
            />

            <TextField
              label="Product Description"
              value={editableContent.description}
              onChange={(value) => setEditableContent({...editableContent, description: value})}
              multiline={8}
            />

            <TextField
              label="SEO Meta Description"
              value={editableContent.metaDescription}
              onChange={(value) => setEditableContent({...editableContent, metaDescription: value})}
              multiline={3}
              helpText={`${editableContent.metaDescription.length}/160 characters`}
            />

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                Key Features
              </label>
              <div style={{ 
                padding: '0.75rem', 
                backgroundColor: '#f9fafb', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}>
                {editableContent.bulletPoints.map((point, index) => (
                  <div key={index} style={{ marginBottom: '0.25rem' }}>
                    • {point}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                SEO Keywords
              </label>
              <div style={{ 
                padding: '0.75rem', 
                backgroundColor: '#f9fafb', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}>
                {editableContent.keywords.join(', ')}
              </div>
            </div>
          </FormLayout>
        )}

        {error && (
          <Banner status="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setCurrentStep(4)}>
            Regenerate
          </Button>
          <Button 
            primary 
            loading={applying}
            onClick={handleApplyContent}
          >
            {applying ? 'Applying...' : 'Apply to Product'}
          </Button>
        </div>
      </div>
    </Card>
  )

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Generate Product Description"
      large
      primaryAction={{
        content: 'Close',
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <div style={{ minHeight: '600px' }}>
          {renderStepIndicator()}
          
          {currentStep === 1 && renderDataReview()}
          {currentStep === 2 && renderImageSelection()}
          {currentStep === 3 && renderGenerationSettings()}
          {currentStep === 4 && renderGenerationPreview()}
          {currentStep === 5 && renderResults()}
        </div>
      </Modal.Section>
    </Modal>
  )
}