'use client'

import { useState, useCallback } from 'react'
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  DropZone,
  Thumbnail,
  Button,
  Select,
  TextField,
  Box,
  Banner
} from '@shopify/polaris'

export interface PhotoWithColor {
  file: File
  preview: string
  color: string
  isCustomColor: boolean
  isExisting?: boolean  // Flag for existing product images
  url?: string  // URL for existing images
}

interface ProductPhotoUploaderProps {
  photos: PhotoWithColor[]
  onChange: (photos: PhotoWithColor[]) => void
  disabled?: boolean
  existingImages?: string[]  // URLs of existing product images
  showExistingImages?: boolean  // Whether to display existing images
}

// Predefined color options (alphabetical)
const PREDEFINED_COLORS = [
  'Beige', 'Black', 'Blue', 'Bronze', 'Brown', 'Burgundy', 'Charcoal',
  'Coral', 'Cream', 'Gold', 'Gray', 'Green', 'Ivory', 'Khaki',
  'Lavender', 'Maroon', 'Mint', 'Navy', 'Olive', 'Orange', 'Peach',
  'Pink', 'Purple', 'Red', 'Rose Gold', 'Sage', 'Silver', 'Tan',
  'Taupe', 'Teal', 'Turquoise', 'White', 'Yellow'
]

export function ProductPhotoUploader({
  photos,
  onChange,
  disabled = false,
  existingImages = [],
  showExistingImages = false
}: ProductPhotoUploaderProps) {
  const [customColorInputs, setCustomColorInputs] = useState<{ [key: number]: string }>({})

  const handleDrop = useCallback((files: File[]) => {
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      color: '', // No color assigned yet
      isCustomColor: false
    }))

    onChange([...photos, ...newPhotos])
  }, [photos, onChange])

  const removePhoto = useCallback((index: number) => {
    const photoToRemove = photos[index]
    URL.revokeObjectURL(photoToRemove.preview)

    const newPhotos = photos.filter((_, i) => i !== index)
    onChange(newPhotos)

    // Clean up custom color input state
    const newCustomInputs = { ...customColorInputs }
    delete newCustomInputs[index]
    setCustomColorInputs(newCustomInputs)
  }, [photos, onChange, customColorInputs])

  const updatePhotoColor = useCallback((index: number, value: string) => {
    const newPhotos = [...photos]

    if (value === '__custom__') {
      // User selected "Custom color..."
      newPhotos[index] = {
        ...newPhotos[index],
        color: '',
        isCustomColor: true
      }
    } else {
      // User selected predefined color
      newPhotos[index] = {
        ...newPhotos[index],
        color: value,
        isCustomColor: false
      }
      // Clear custom input for this photo
      const newCustomInputs = { ...customColorInputs }
      delete newCustomInputs[index]
      setCustomColorInputs(newCustomInputs)
    }

    onChange(newPhotos)
  }, [photos, onChange, customColorInputs])

  const updateCustomColor = useCallback((index: number, customColor: string) => {
    setCustomColorInputs(prev => ({
      ...prev,
      [index]: customColor
    }))

    const newPhotos = [...photos]
    newPhotos[index] = {
      ...newPhotos[index],
      color: customColor,
      isCustomColor: true
    }
    onChange(newPhotos)
  }, [photos, onChange])

  // Build color options
  const colorOptions = [
    { label: 'Select color...', value: '' },
    { label: '+ Custom color...', value: '__custom__' },
    ...PREDEFINED_COLORS.map(color => ({ label: color, value: color }))
  ]

  // Group photos by color for summary
  const colorGroups = photos.reduce((groups, photo) => {
    if (photo.color) {
      groups[photo.color] = (groups[photo.color] || 0) + 1
    }
    return groups
  }, {} as Record<string, number>)

  const unassignedCount = photos.filter(p => !p.color).length

  return (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Step 1: Upload Product Photos</Text>
          <Text as="p" tone="subdued">
            {showExistingImages
              ? "Current product images shown below. Upload additional photos (optional). All photos will be uploaded to Shopify."
              : "Upload all product photos. Assign colors to create variants - multiple photos can share the same color. All photos are uploaded, color assignment is only for creating variants."
            }
          </Text>

          {disabled && (
            <Banner tone="warning">
              <Text as="p">Please complete the enhancement settings before uploading images.</Text>
            </Banner>
          )}

          {/* Existing product images */}
          {showExistingImages && existingImages.length > 0 && (
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">Current Product Images ({existingImages.length})</Text>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}>
                {existingImages.map((imageUrl, index) => (
                  <Card key={`existing-${index}`} background="bg-surface-secondary" padding="400">
                    <BlockStack gap="300">
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Thumbnail
                          source={imageUrl}
                          alt={`Existing image ${index + 1}`}
                          size="large"
                        />
                      </div>
                      <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                        Existing Image {index + 1}
                      </Text>
                    </BlockStack>
                  </Card>
                ))}
              </div>
            </BlockStack>
          )}

          {/* Uploaded photos with color selectors - OUTSIDE DropZone */}
          {photos.length > 0 && (
            <BlockStack gap="300">
              {showExistingImages && <Text as="h3" variant="headingSm">Additional Photos ({photos.length})</Text>}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}>
                {photos.map((photo, index) => (
                  <Card key={index} background="bg-surface-secondary" padding="400">
                    <BlockStack gap="300">
                      {/* Thumbnail centered */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Thumbnail
                          source={photo.preview}
                          alt={photo.file.name}
                          size="large"
                        />
                      </div>

                      {/* Filename - truncated if too long */}
                      <Text as="p" variant="bodySm" fontWeight="medium" alignment="center" truncate>
                        {photo.file.name}
                      </Text>

                      {/* Color selector */}
                      {!photo.isCustomColor ? (
                        <Select
                          label="Color"
                          options={colorOptions}
                          value={photo.color}
                          onChange={(value) => updatePhotoColor(index, value)}
                          disabled={disabled}
                        />
                      ) : (
                        <BlockStack gap="200">
                          <TextField
                            label="Custom Color"
                            value={customColorInputs[index] || photo.color}
                            onChange={(value) => updateCustomColor(index, value)}
                            placeholder="e.g., Heather Gray"
                            autoComplete="off"
                            disabled={disabled}
                          />
                          <Button
                            size="slim"
                            onClick={() => updatePhotoColor(index, '')}
                            disabled={disabled}
                          >
                            Use Predefined Colors
                          </Button>
                        </BlockStack>
                      )}

                      {/* Remove button */}
                      <Button
                        size="slim"
                        onClick={() => removePhoto(index)}
                        disabled={disabled}
                      >
                        Remove
                      </Button>
                    </BlockStack>
                  </Card>
                ))}
              </div>
            </BlockStack>
          )}

          {/* Upload DropZone section header */}
          {showExistingImages && photos.length === 0 && (
            <Text as="h3" variant="headingSm">Upload Additional Photos (Optional)</Text>
          )}

          {/* Upload DropZone - ONLY the upload area is clickable */}
          <DropZone
            onDrop={(files) => handleDrop(files.filter(f => f instanceof File) as File[])}
            accept="image/*"
            type="image"
            allowMultiple
            disabled={disabled}
          >
            {photos.length > 0 ? (
              <Box
                padding="400"
                borderColor="border"
                borderWidth="025"
                borderRadius="200"
                background="bg-surface-secondary"
              >
                <Text as="p" tone="subdued" alignment="center">
                  Drop more photos here, or click to browse
                </Text>
              </Box>
            ) : (
              <div style={{
                padding: '60px 40px',
                textAlign: 'center',
                border: '2px dashed #cccccc',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyLg">
                    📷 Upload Product Photos
                  </Text>
                  <Text as="p" tone="subdued">
                    Upload all photos, then assign colors to each
                  </Text>
                  <Button disabled={disabled}>Select Photos</Button>
                </BlockStack>
              </div>
            )}
          </DropZone>
        </BlockStack>
      </Card>

      {/* Color Variants Summary - only show for Create mode, not Enhance */}
      {!showExistingImages && photos.length > 0 && (
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Color Variants Summary</Text>

            {Object.keys(colorGroups).length > 0 ? (
              <BlockStack gap="200">
                {Object.entries(colorGroups).map(([color, count]) => (
                  <InlineStack key={color} align="space-between">
                    <Text as="p" fontWeight="semibold">{color}</Text>
                    <Text as="p" tone="subdued">{count} photo{count > 1 ? 's' : ''}</Text>
                  </InlineStack>
                ))}

                {unassignedCount > 0 && (
                  <Box paddingBlockStart="200">
                    <Text as="p" tone="subdued" variant="bodySm">
                      {unassignedCount} photo{unassignedCount > 1 ? 's' : ''} without variant (will upload as general product image{unassignedCount > 1 ? 's' : ''})
                    </Text>
                  </Box>
                )}
              </BlockStack>
            ) : (
              <Banner tone="info">
                <Text as="p">
                  Assign colors to create variants. Multiple photos can share the same color.
                </Text>
              </Banner>
            )}
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  )
}
