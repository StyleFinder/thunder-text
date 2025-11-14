'use client'

/**
 * Facebook Ad Preview Component
 *
 * Shows a preview of how the ad will look on Facebook
 * before submitting to the API
 */

import { useState } from 'react'
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  Thumbnail,
  Select,
  Badge,
  Modal,
  Banner
} from '@shopify/polaris'
import { ImageIcon } from '@shopify/polaris-icons'

interface AdPreviewProps {
  title: string
  copy: string
  imageUrls: string[]
  selectedImageIndex?: number
  onTitleChange?: (title: string) => void
  onCopyChange?: (copy: string) => void
  onImageSelect?: (index: number) => void
  onSubmit?: () => void
  submitting?: boolean
  readOnly?: boolean
}

export default function AdPreview({
  title,
  copy,
  imageUrls,
  selectedImageIndex = 0,
  onTitleChange,
  onCopyChange,
  onImageSelect,
  onSubmit,
  submitting = false,
  readOnly = false
}: AdPreviewProps) {
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [localTitle, setLocalTitle] = useState(title)
  const [localCopy, setLocalCopy] = useState(copy)

  const handleTitleChange = (value: string) => {
    setLocalTitle(value)
    onTitleChange?.(value)
  }

  const handleCopyChange = (value: string) => {
    setLocalCopy(value)
    onCopyChange?.(value)
  }

  const selectedImage = imageUrls[selectedImageIndex] || imageUrls[0]
  const titleLength = localTitle.length
  const copyLength = localCopy.length
  const titleValid = titleLength > 0 && titleLength <= 125
  const copyValid = copyLength > 0 && copyLength <= 125

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Ad Preview</Text>

          {/* Character count warnings */}
          {!readOnly && (
            <BlockStack gap="200">
              {!titleValid && (
                <Banner tone="warning">
                  Title must be between 1-125 characters (currently: {titleLength})
                </Banner>
              )}
              {!copyValid && (
                <Banner tone="warning">
                  Copy must be between 1-125 characters (currently: {copyLength})
                </Banner>
              )}
            </BlockStack>
          )}

          {/* Editable fields */}
          {!readOnly && (
            <BlockStack gap="300">
              <TextField
                label="Ad Title"
                value={localTitle}
                onChange={handleTitleChange}
                maxLength={125}
                showCharacterCount
                autoComplete="off"
                helpText="Maximum 125 characters"
              />

              <TextField
                label="Ad Copy"
                value={localCopy}
                onChange={handleCopyChange}
                maxLength={125}
                multiline={3}
                showCharacterCount
                autoComplete="off"
                helpText="Maximum 125 characters"
              />

              {imageUrls.length > 1 && (
                <Select
                  label="Select Image"
                  options={imageUrls.map((url, index) => ({
                    label: `Image ${index + 1}`,
                    value: String(index)
                  }))}
                  value={String(selectedImageIndex)}
                  onChange={(value) => onImageSelect?.(parseInt(value))}
                />
              )}
            </BlockStack>
          )}

          {/* Facebook-style preview */}
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" align="start" blockAlign="start">
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#1877f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  FB
                </div>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Your Business Page
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Sponsored
                  </Text>
                </BlockStack>
              </InlineStack>

              <Text as="p" variant="bodyMd">
                {localCopy || <Text as="span" tone="subdued">Your ad copy will appear here...</Text>}
              </Text>

              {selectedImage ? (
                <div style={{
                  width: '100%',
                  maxWidth: '500px',
                  border: '1px solid #e1e3e5',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <img
                    src={selectedImage}
                    alt="Ad preview"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  width: '100%',
                  maxWidth: '500px',
                  height: '300px',
                  border: '2px dashed #c9cccf',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f6f6f7'
                }}>
                  <BlockStack gap="200" inlineAlign="center">
                    <ImageIcon />
                    <Text as="p" tone="subdued">No image selected</Text>
                  </BlockStack>
                </div>
              )}

              <BlockStack gap="100">
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  {localTitle || <Text as="span" tone="subdued">Your ad title will appear here...</Text>}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  yourbusiness.com
                </Text>
              </BlockStack>

              <InlineStack gap="200">
                <Button size="slim" disabled>Like</Button>
                <Button size="slim" disabled>Comment</Button>
                <Button size="slim" disabled>Share</Button>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Submit button */}
          {!readOnly && onSubmit && (
            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={() => setShowSubmitModal(true)}
                loading={submitting}
                disabled={!titleValid || !copyValid || !selectedImage || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit to Facebook'}
              </Button>
            </InlineStack>
          )}
        </BlockStack>
      </Card>

      {/* Confirmation modal */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Ad to Facebook?"
        primaryAction={{
          content: 'Submit Ad',
          onAction: () => {
            setShowSubmitModal(false)
            onSubmit?.()
          },
          loading: submitting
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowSubmitModal(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              Your ad will be created in your selected Facebook campaign in <Badge tone="attention">PAUSED</Badge> status.
            </Text>
            <Text as="p">
              You can review and activate the ad in Facebook Ads Manager.
            </Text>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" fontWeight="semibold">Ad Details:</Text>
              <Text as="p" variant="bodySm">Title: {localTitle}</Text>
              <Text as="p" variant="bodySm">Copy: {localCopy}</Text>
              <Text as="p" variant="bodySm">Images: {imageUrls.length}</Text>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  )
}
