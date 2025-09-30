'use client'

import { useState, useCallback } from 'react'
import { DropZone, Thumbnail, BlockStack, InlineStack, Text, Badge, Card, Checkbox, Button, Box, Icon, Banner } from '@shopify/polaris'
import { ImageIcon, UploadIcon } from '@shopify/polaris-icons'

export interface UploadedFile {
  file: File
  preview: string
}

interface ProductImageUploadProps {
  title?: string
  description?: string
  allowMultiple?: boolean
  maxFiles?: number
  existingImages?: string[]
  useExistingImages?: boolean
  onFilesAdded: (files: UploadedFile[]) => void
  onExistingImagesToggle?: (useExisting: boolean) => void
}

export function ProductImageUpload({
  title = "Product Images",
  description = "Current product images and upload options",
  allowMultiple = true,
  maxFiles = 5,
  existingImages = [],
  useExistingImages = false,
  onFilesAdded,
  onExistingImagesToggle
}: ProductImageUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [rejectedFiles, setRejectedFiles] = useState<File[]>([])

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], rejectedFiles: File[]) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }))

      const updatedFiles = [...uploadedFiles, ...newFiles].slice(0, maxFiles)
      setUploadedFiles(updatedFiles)
      setRejectedFiles(rejectedFiles)
      onFilesAdded(updatedFiles)
    },
    [uploadedFiles, maxFiles, onFilesAdded]
  )

  const removeFile = useCallback((index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    onFilesAdded(newFiles)
  }, [uploadedFiles, onFilesAdded])

  const validImageTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/webp']

  const fileUpload = !uploadedFiles.length ? (
    <DropZone.FileUpload actionHint="Accepts images only" />
  ) : null

  const uploadedFilesList = uploadedFiles.length > 0 ? (
    <BlockStack gap="400">
      <InlineStack gap="400" wrap>
        {uploadedFiles.map((file, index) => (
          <div
            key={index}
            onClick={() => removeFile(index)}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <Thumbnail
              source={file.preview}
              alt={file.file.name}
              size="large"
            />
            <div style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: 'red',
              color: 'white',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12
            }}>
              ×
            </div>
          </div>
        ))}
      </InlineStack>
      <Text as="p" variant="bodyMd" tone="subdued">
        {uploadedFiles.length} of {maxFiles} images uploaded. Click an image to remove it.
      </Text>
    </BlockStack>
  ) : null

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">{title}</Text>
            <Text as="p" variant="bodyMd" tone="subdued">{description}</Text>
          </BlockStack>
        </InlineStack>

        {/* Display existing product images as thumbnails */}
        {existingImages.length > 0 && (
          <Box>
            <InlineStack align="space-between" blockAlign="center" gap="400">
              <Checkbox
                label={`Use existing product images (${existingImages.length} available)`}
                checked={useExistingImages}
                onChange={(value) => onExistingImagesToggle?.(value)}
              />
            </InlineStack>

            {useExistingImages && (
              <Box paddingBlockStart="300">
                <InlineStack gap="300" wrap>
                  {existingImages.map((image, index) => (
                    <Box
                      key={index}
                      background="bg-surface-secondary"
                      borderRadius="200"
                      padding="200"
                    >
                      <Thumbnail
                        source={image}
                        alt={`Product image ${index + 1}`}
                        size="large"
                      />
                    </Box>
                  ))}
                </InlineStack>
              </Box>
            )}
          </Box>
        )}

        {/* Upload new images section */}
        <Box>
          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={UploadIcon} />
              <Text as="h3" variant="headingSm">Upload New Images</Text>
              <Badge tone="info">Optional</Badge>
            </InlineStack>

            <DropZone
              onDrop={handleDropZoneDrop}
              accept={validImageTypes.join(',')}
              type="image"
              allowMultiple={allowMultiple}
            >
              {uploadedFilesList || (
                <DropZone.FileUpload
                  actionTitle="Add images"
                  actionHint="or drop images to upload"
                />
              )}
            </DropZone>

            {!useExistingImages && uploadedFiles.length === 0 && existingImages.length === 0 && (
              <Text as="p" variant="bodySm" tone="subdued">
                AI works best with product images. Either use existing images or upload new ones for better results.
              </Text>
            )}
          </BlockStack>
        </Box>

        {rejectedFiles.length > 0 && (
          <Banner tone="warning">
            <p>Some files were rejected. Please upload only images (JPG, PNG, GIF, WebP).</p>
          </Banner>
        )}
      </BlockStack>
    </Card>
  )
}