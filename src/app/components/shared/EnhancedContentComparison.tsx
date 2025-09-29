'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  Button,
  Badge,
  Divider,
  InlineStack,
  TextField,
  Box,
  Banner,
  Icon,
  Checkbox,
} from '@shopify/polaris'
import {
  EditIcon,
  CheckIcon,
  XIcon,
  ViewIcon,
} from '@shopify/polaris-icons'
import styles from './EnhancedContentComparison.module.css'

interface EnhancedContentComparisonProps {
  active: boolean
  onClose: () => void
  onApply: (content: any) => void
  originalContent: {
    title?: string
    description?: string
    seoTitle?: string
    seoDescription?: string
    promoText?: string
  }
  enhancedContent: {
    title?: string
    description?: string
    seoTitle?: string
    seoDescription?: string
    promoText?: string
    bulletPoints?: string[]
    confidence?: number
  }
  loading?: boolean
}

export default function EnhancedContentComparison({
  active,
  onClose,
  onApply,
  originalContent,
  enhancedContent,
  loading = false
}: EnhancedContentComparisonProps) {
  const [editedContent, setEditedContent] = useState(enhancedContent)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'comparison' | 'preview'>('comparison')

  // Track which fields to apply
  const [fieldsToApply, setFieldsToApply] = useState({
    title: !!enhancedContent.title,
    description: !!enhancedContent.description,
    seoTitle: !!enhancedContent.seoTitle,
    seoDescription: !!enhancedContent.seoDescription,
    promoText: !!enhancedContent.promoText,
    bulletPoints: !!enhancedContent.bulletPoints && enhancedContent.bulletPoints.length > 0
  })

  // Force modal to be wider when it opens
  useEffect(() => {
    if (active) {
      // Wait for modal to render
      setTimeout(() => {
        // Find all modal-related elements and force their width
        const modalDialog = document.querySelector('.Polaris-Modal-Dialog')
        const modalContainer = document.querySelector('.Polaris-Modal-Dialog__Container')
        const modalModal = document.querySelector('.Polaris-Modal-Dialog__Modal')

        if (modalDialog) {
          (modalDialog as HTMLElement).style.maxWidth = '95vw'
          ;(modalDialog as HTMLElement).style.width = '95vw'
        }
        if (modalContainer) {
          (modalContainer as HTMLElement).style.maxWidth = '100%'
          ;(modalContainer as HTMLElement).style.width = '100%'
        }
        if (modalModal) {
          (modalModal as HTMLElement).style.maxWidth = '100%'
          ;(modalModal as HTMLElement).style.width = '100%'
        }
      }, 100)
    }
  }, [active])

  const handleEdit = (field: string) => {
    setEditingField(field)
  }

  const handleSave = (field: string, value: string) => {
    setEditedContent(prev => ({
      ...prev,
      [field]: value
    }))
    setEditingField(null)
  }

  const handleCancel = () => {
    setEditingField(null)
    setEditedContent(enhancedContent)
  }

  const handleApplyChanges = () => {
    // Only apply fields that are checked
    const contentToApply: any = {}

    if (fieldsToApply.title && editedContent.title) {
      contentToApply.title = editedContent.title
    }
    if (fieldsToApply.description && editedContent.description) {
      contentToApply.description = editedContent.description
    }
    if (fieldsToApply.seoTitle && editedContent.seoTitle) {
      contentToApply.seoTitle = editedContent.seoTitle
    }
    if (fieldsToApply.seoDescription && editedContent.seoDescription) {
      contentToApply.seoDescription = editedContent.seoDescription
    }
    if (fieldsToApply.promoText && editedContent.promoText) {
      contentToApply.promoText = editedContent.promoText
    }
    if (fieldsToApply.bulletPoints && editedContent.bulletPoints) {
      contentToApply.bulletPoints = editedContent.bulletPoints
    }

    onApply(contentToApply)
    onClose()
  }

  const renderField = (
    label: string,
    fieldName: string,
    original: string | undefined,
    enhanced: string | undefined,
    multiline: boolean = false
  ) => {
    const isEditing = editingField === fieldName
    const currentValue = editedContent[fieldName as keyof typeof editedContent] as string || enhanced || ''
    const hasChanged = original !== enhanced && enhanced

    return (
      <Box>
        <InlineStack align="space-between" blockAlign="center" gap="4">
          <Text variant="headingMd" as="h3">{label}</Text>
          {viewMode === 'comparison' && hasChanged && (
            <Badge tone="info">Updated</Badge>
          )}
        </InlineStack>

        <Box paddingBlockStart="2" paddingBlockEnd="4">
          {viewMode === 'comparison' ? (
            <InlineGrid columns={2} gap="4">
              {/* Original Content */}
              <Card>
                <BlockStack gap="2">
                  <InlineStack align="space-between">
                    <Text variant="headingSm" as="h4" tone="subdued">
                      Current
                    </Text>
                  </InlineStack>
                  <Box paddingBlockStart="2">
                    <Text as="p" tone={!original ? 'subdued' : undefined}>
                      {original || 'No current content'}
                    </Text>
                  </Box>
                </BlockStack>
              </Card>

              {/* Enhanced Content */}
              <Card>
                <BlockStack gap="2">
                  <InlineStack align="space-between">
                    <InlineStack gap="2" blockAlign="center">
                      <Checkbox
                        label=""
                        checked={fieldsToApply[fieldName as keyof typeof fieldsToApply]}
                        onChange={(checked) => setFieldsToApply(prev => ({
                          ...prev,
                          [fieldName]: checked
                        }))}
                      />
                      <Text variant="headingSm" as="h4" tone="success">
                        Apply This Field
                      </Text>
                    </InlineStack>
                    {!isEditing && (
                      <Button
                        size="slim"
                        icon={EditIcon}
                        onClick={() => handleEdit(fieldName)}
                      >
                        Edit
                      </Button>
                    )}
                  </InlineStack>
                  <Box paddingBlockStart="2">
                    {isEditing ? (
                      <BlockStack gap="2">
                        <TextField
                          label=""
                          value={currentValue}
                          onChange={(value) => setEditedContent(prev => ({
                            ...prev,
                            [fieldName]: value
                          }))}
                          multiline={multiline ? 4 : false}
                          autoComplete="off"
                        />
                        <InlineStack gap="2">
                          <Button
                            size="slim"
                            primary
                            icon={CheckIcon}
                            onClick={() => handleSave(fieldName, currentValue)}
                          >
                            Save
                          </Button>
                          <Button
                            size="slim"
                            icon={XIcon}
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    ) : (
                      <Text as="p">
                        {currentValue || 'No enhanced content'}
                      </Text>
                    )}
                  </Box>
                </BlockStack>
              </Card>
            </InlineGrid>
          ) : (
            /* Preview Mode - Show only enhanced content */
            <Card>
              <BlockStack gap="2">
                <InlineStack align="space-between">
                  <InlineStack gap="2" blockAlign="center">
                    <Checkbox
                      label=""
                      checked={fieldsToApply[fieldName as keyof typeof fieldsToApply]}
                      onChange={(checked) => setFieldsToApply(prev => ({
                        ...prev,
                        [fieldName]: checked
                      }))}
                    />
                    <Text variant="headingSm" as="h4">
                      Apply This Field
                    </Text>
                  </InlineStack>
                  {!isEditing && (
                    <Button
                      size="slim"
                      icon={EditIcon}
                      onClick={() => handleEdit(fieldName)}
                    >
                      Edit
                    </Button>
                  )}
                </InlineStack>
                <Box paddingBlockStart="2">
                  {isEditing ? (
                    <BlockStack gap="2">
                      <TextField
                        label=""
                        value={currentValue}
                        onChange={(value) => setEditedContent(prev => ({
                          ...prev,
                          [fieldName]: value
                        }))}
                        multiline={multiline ? 4 : false}
                        autoComplete="off"
                      />
                      <InlineStack gap="2">
                        <Button
                          size="slim"
                          primary
                          icon={CheckIcon}
                          onClick={() => handleSave(fieldName, currentValue)}
                        >
                          Save
                        </Button>
                        <Button
                          size="slim"
                          icon={XIcon}
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: currentValue.replace(/\n/g, '<br />') || 'No content'
                      }}
                      style={{
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap'
                      }}
                    />
                  )}
                </Box>
              </BlockStack>
            </Card>
          )}
        </Box>
      </Box>
    )
  }

  const renderBulletPoints = () => {
    if (!editedContent.bulletPoints || editedContent.bulletPoints.length === 0) return null

    return (
      <Box>
        <Text variant="headingMd" as="h3">Key Features</Text>
        <Box paddingBlockStart="2" paddingBlockEnd="4">
          <Card>
            <BlockStack gap="2">
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {editedContent.bulletPoints.map((point, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    <Text as="span">{point}</Text>
                  </li>
                ))}
              </ul>
            </BlockStack>
          </Card>
        </Box>
      </Box>
    )
  }

  return (
    <div className={styles.wideModalWrapper}>
      <Modal
        open={active}
        onClose={onClose}
        title="Review Enhanced Content"
        primaryAction={{
          content: 'Apply Changes',
          onAction: handleApplyChanges,
          loading: loading,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: onClose,
          },
        ]}
        large
      >
        <Modal.Section>
        <BlockStack gap="4">
          {/* View Mode Toggle and Field Selection */}
          <Card>
            <BlockStack gap="2">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingSm" as="h3">View Mode</Text>
                <InlineStack gap="2">
                  <Button
                    pressed={viewMode === 'comparison'}
                    onClick={() => setViewMode('comparison')}
                    icon={ViewIcon}
                  >
                    Side-by-Side
                  </Button>
                  <Button
                    pressed={viewMode === 'preview'}
                    onClick={() => setViewMode('preview')}
                  >
                    Preview Only
                  </Button>
                </InlineStack>
              </InlineStack>

              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingSm" as="h3">Field Selection</Text>
                <InlineStack gap="2">
                  <Button
                    size="slim"
                    onClick={() => setFieldsToApply({
                      title: true,
                      description: true,
                      seoTitle: true,
                      seoDescription: true,
                      promoText: true,
                      bulletPoints: true
                    })}
                  >
                    Select All
                  </Button>
                  <Button
                    size="slim"
                    onClick={() => setFieldsToApply({
                      title: false,
                      description: false,
                      seoTitle: false,
                      seoDescription: false,
                      promoText: false,
                      bulletPoints: false
                    })}
                  >
                    Deselect All
                  </Button>
                </InlineStack>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Content Fields */}
          <BlockStack gap="6">
            {enhancedContent.title && renderField(
              'Product Title',
              'title',
              originalContent.title,
              enhancedContent.title,
              false
            )}

            {enhancedContent.description && (
              <>
                <Divider />
                {renderField(
                  'Product Description',
                  'description',
                  originalContent.description,
                  enhancedContent.description,
                  true
                )}
              </>
            )}

            {enhancedContent.seoTitle && (
              <>
                <Divider />
                {renderField(
                  'SEO Title',
                  'seoTitle',
                  originalContent.seoTitle,
                  enhancedContent.seoTitle,
                  false
                )}
              </>
            )}

            {enhancedContent.seoDescription && (
              <>
                <Divider />
                {renderField(
                  'SEO Meta Description',
                  'seoDescription',
                  originalContent.seoDescription,
                  enhancedContent.seoDescription,
                  true
                )}
              </>
            )}

            {enhancedContent.promoText && (
              <>
                <Divider />
                {renderField(
                  'Promotional Copy',
                  'promoText',
                  originalContent.promoText,
                  enhancedContent.promoText,
                  true
                )}
              </>
            )}

            {editedContent.bulletPoints && editedContent.bulletPoints.length > 0 && (
              <>
                <Divider />
                {renderBulletPoints()}
              </>
            )}
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
    </div>
  )
}