'use client'

import { useState, useCallback } from 'react'
import { DropZone, Thumbnail, BlockStack, InlineStack, Text, Badge, Card } from '@shopify/polaris'

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
  description = "Upload product images for AI analysis",
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
        <Text as="h2" variant="headingMd">{title}</Text>
        <Text as="p" variant="bodyMd" tone="subdued">{description}</Text>

        {existingImages.length > 0 && onExistingImagesToggle && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={useExistingImages}
              onChange={(e) => onExistingImagesToggle(e.target.checked)}
            />
            <Text as="span" variant="bodyMd">
              Use existing product images ({existingImages.length} available)
            </Text>
          </label>
        )}

        <DropZone
          onDrop={handleDropZoneDrop}
          accept={validImageTypes.join(',')}
          type="image"
          allowMultiple={allowMultiple}
        >
          {uploadedFilesList}
          {fileUpload}
        </DropZone>

        {rejectedFiles.length > 0 && (
          <Banner tone="warning">
            <p>Some files were rejected. Please upload only images.</p>
          </Banner>
        )}
      </BlockStack>
    </Card>
  )
}