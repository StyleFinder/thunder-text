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
  Tabs,
} from '@shopify/polaris'
import {
  EditIcon,
  CheckIcon,
  XIcon,
  ViewIcon,
  DuplicateIcon,
  MagicIcon,
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
  const [selectedTab, setSelectedTab] = useState(0)

  // Track which fields to apply
  const [fieldsToApply, setFieldsToApply] = useState({
    title: !!enhancedContent.title,
    description: !!enhancedContent.description,
    seoTitle: !!enhancedContent.seoTitle,
    seoDescription: !!enhancedContent.seoDescription,
    promoText: !!enhancedContent.promoText,
    bulletPoints: !!enhancedContent.bulletPoints && enhancedContent.bulletPoints.length > 0
  })

  // Helper function to render HTML content properly
  const renderFormattedHTML = (htmlContent: string) => {
    // Process the HTML to ensure proper formatting
    const processedHTML = htmlContent
      .replace(/<b>/g, '<strong>')
      .replace(/<\/b>/g, '</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<p>)/, '<p>')
      .replace(/(?!<\/p>)$/, '</p>')

    return (
      <div
        dangerouslySetInnerHTML={{ __html: processedHTML }}
        style={{
          lineHeight: 1.8,
          fontSize: '14px',
          color: '#202223',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      />
    )
  }

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

  const renderModernField = (
    label: string,
    fieldName: string,
    original: string | undefined,
    enhanced: string | undefined,
    multiline: boolean = false,
    isHtml: boolean = false
  ) => {
    const isEditing = editingField === fieldName
    const currentValue = editedContent[fieldName as keyof typeof editedContent] as string || enhanced || ''
    const hasChanged = original !== enhanced && enhanced

    return (
      <Card roundedAbove="sm">
        <Box padding="4">
          <BlockStack gap="4">
            {/* Header with checkbox and edit button */}
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="3" blockAlign="center">
                <Checkbox
                  label=""
                  checked={fieldsToApply[fieldName as keyof typeof fieldsToApply]}
                  onChange={(checked) => setFieldsToApply(prev => ({
                    ...prev,
                    [fieldName]: checked
                  }))}
                />
                <BlockStack gap="1">
                  <InlineStack gap="2" blockAlign="center">
                    <Text variant="headingMd" as="h3">{label}</Text>
                    {hasChanged && (
                      <Badge tone="success" icon={MagicIcon}>
                        AI Enhanced
                      </Badge>
                    )}
                  </InlineStack>
                  {fieldsToApply[fieldName as keyof typeof fieldsToApply] && (
                    <Text variant="bodySm" tone="success">
                      ✓ Will be applied to product
                    </Text>
                  )}
                </BlockStack>
              </InlineStack>
              {!isEditing && enhanced && (
                <Button
                  size="slim"
                  icon={EditIcon}
                  onClick={() => handleEdit(fieldName)}
                >
                  Edit
                </Button>
              )}
            </InlineStack>

            {/* Content comparison */}
            <InlineGrid columns={2} gap="4">
              {/* Original Content */}
              <Box
                background="bg-surface-secondary"
                padding="4"
                borderRadius="200"
              >
                <BlockStack gap="2">
                  <InlineStack gap="2" blockAlign="center">
                    <Box>
                      <Icon source={DuplicateIcon} tone="subdued" />
                    </Box>
                    <Text variant="headingSm" as="h4" tone="subdued">
                      Current Version
                    </Text>
                  </InlineStack>
                  <Divider />
                  <Box paddingBlockStart="2">
                    {original ? (
                      isHtml ? (
                        renderFormattedHTML(original)
                      ) : (
                        <Text as="p" breakWord>
                          {original}
                        </Text>
                      )
                    ) : (
                      <Text as="p" tone="subdued">
                        No current content
                      </Text>
                    )}
                  </Box>
                </BlockStack>
              </Box>

              {/* Enhanced Content */}
              <Box
                background="bg-surface"
                padding="4"
                borderRadius="200"
                borderWidth="025"
                borderColor={fieldsToApply[fieldName as keyof typeof fieldsToApply] ? 'border-success' : 'border'}
              >
                <BlockStack gap="2">
                  <InlineStack gap="2" blockAlign="center">
                    <Box>
                      <Icon source={MagicIcon} tone="magic" />
                    </Box>
                    <Text variant="headingSm" as="h4" tone="magic">
                      AI Enhanced Version
                    </Text>
                  </InlineStack>
                  <Divider />
                  <Box paddingBlockStart="2">
                    {isEditing ? (
                      <BlockStack gap="3">
                        <TextField
                          label=""
                          value={currentValue}
                          onChange={(value) => setEditedContent(prev => ({
                            ...prev,
                            [fieldName]: value
                          }))}
                          multiline={multiline ? 5 : false}
                          autoComplete="off"
                        />
                        <InlineStack gap="2">
                          <Button
                            size="slim"
                            variant="primary"
                            icon={CheckIcon}
                            onClick={() => handleSave(fieldName, currentValue)}
                          >
                            Save Changes
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
                      enhanced ? (
                        isHtml || fieldName === 'description' ? (
                          renderFormattedHTML(currentValue)
                        ) : (
                          <Text as="p" breakWord>
                            {currentValue}
                          </Text>
                        )
                      ) : (
                        <Text as="p" tone="subdued">
                          No enhanced content generated
                        </Text>
                      )
                    )}
                  </Box>
                </BlockStack>
              </Box>
            </InlineGrid>
          </BlockStack>
        </Box>
      </Card>
    )
  }

  const renderBulletPoints = () => {
    if (!editedContent.bulletPoints || editedContent.bulletPoints.length === 0) return null

    return (
      <Card roundedAbove="sm">
        <Box padding="4">
          <BlockStack gap="4">
            <InlineStack gap="2" blockAlign="center">
              <Icon source={MagicIcon} tone="magic" />
              <Text variant="headingMd" as="h3">Key Features</Text>
              <Badge tone="info">{editedContent.bulletPoints.length} points</Badge>
            </InlineStack>
            <Box
              background="bg-surface"
              padding="4"
              borderRadius="200"
            >
              <ul style={{
                paddingLeft: '24px',
                margin: 0,
                lineHeight: '1.8'
              }}>
                {editedContent.bulletPoints.map((point, index) => (
                  <li key={index} style={{
                    marginBottom: '12px',
                    color: '#202223',
                    fontSize: '14px'
                  }}>
                    {point}
                  </li>
                ))}
              </ul>
            </Box>
          </BlockStack>
        </Box>
      </Card>
    )
  }

  // Define tabs for content organization
  const tabs = [
    {
      id: 'main',
      content: 'Main Content',
      badge: `${enhancedContent.title ? 1 : 0} + ${enhancedContent.description ? 1 : 0}`,
      panelID: 'main-content',
    },
    {
      id: 'seo',
      content: 'SEO & Marketing',
      badge: `${enhancedContent.seoTitle ? 1 : 0} + ${enhancedContent.seoDescription ? 1 : 0} + ${enhancedContent.promoText ? 1 : 0}`,
      panelID: 'seo-content',
    },
    {
      id: 'features',
      content: 'Key Features',
      badge: `${editedContent.bulletPoints?.length || 0}`,
      panelID: 'features-content',
    },
  ]

  return (
    <div className={styles.wideModalWrapper}>
      <Modal
        open={active}
        onClose={onClose}
        title="AI Enhanced Content Review"
        primaryAction={{
          content: 'Apply Selected Changes',
          onAction: handleApplyChanges,
          loading: loading,
          disabled: !Object.values(fieldsToApply).some(Boolean),
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
            {/* Quick Actions Bar */}
            <Card>
              <Box padding="3">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="3" blockAlign="center">
                    <Icon source={MagicIcon} tone="magic" />
                    <Text variant="headingSm" as="h3">
                      AI-Generated Content Ready
                    </Text>
                  </InlineStack>
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
              </Box>
            </Card>

            {/* Tabbed Content */}
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                {/* Main Content Tab */}
                {selectedTab === 0 && (
                  <Box padding="4">
                    <BlockStack gap="6">
                      {enhancedContent.title && renderModernField(
                        'Product Title',
                        'title',
                        originalContent.title,
                        enhancedContent.title,
                        false,
                        false
                      )}

                      {enhancedContent.description && renderModernField(
                        'Product Description',
                        'description',
                        originalContent.description,
                        enhancedContent.description,
                        true,
                        true
                      )}

                      {!enhancedContent.title && !enhancedContent.description && (
                        <Banner tone="info">
                          <Text as="p">No main content was generated. Try enabling title or description generation in enhancement options.</Text>
                        </Banner>
                      )}
                    </BlockStack>
                  </Box>
                )}

                {/* SEO & Marketing Tab */}
                {selectedTab === 1 && (
                  <Box padding="4">
                    <BlockStack gap="6">
                      {enhancedContent.seoTitle && renderModernField(
                        'SEO Title',
                        'seoTitle',
                        originalContent.seoTitle,
                        enhancedContent.seoTitle,
                        false,
                        false
                      )}

                      {enhancedContent.seoDescription && renderModernField(
                        'SEO Meta Description',
                        'seoDescription',
                        originalContent.seoDescription,
                        enhancedContent.seoDescription,
                        true,
                        false
                      )}

                      {enhancedContent.promoText && renderModernField(
                        'Promotional Copy',
                        'promoText',
                        originalContent.promoText,
                        enhancedContent.promoText,
                        true,
                        true
                      )}

                      {!enhancedContent.seoTitle && !enhancedContent.seoDescription && !enhancedContent.promoText && (
                        <Banner tone="info">
                          <Text as="p">No SEO or marketing content was generated. Enable these options in enhancement settings to generate them.</Text>
                        </Banner>
                      )}
                    </BlockStack>
                  </Box>
                )}

                {/* Key Features Tab */}
                {selectedTab === 2 && (
                  <Box padding="4">
                    {editedContent.bulletPoints && editedContent.bulletPoints.length > 0 ? (
                      renderBulletPoints()
                    ) : (
                      <Banner tone="info">
                        <Text as="p">No key features were generated. The AI will extract features when analyzing product images.</Text>
                      </Banner>
                    )}
                  </Box>
                )}
              </Tabs>
            </Card>

            {/* Selected Fields Summary */}
            {(() => {
              const selectedCount = Object.values(fieldsToApply).filter(Boolean).length
              if (selectedCount > 0) {
                return (
                  <Box
                    background="bg-surface-success"
                    padding="3"
                    borderRadius="200"
                  >
                    <InlineStack gap="2" blockAlign="center">
                      <Icon source={CheckIcon} tone="success" />
                      <Text variant="bodySm" tone="success">
                        {selectedCount} field{selectedCount !== 1 ? 's' : ''} selected for update
                      </Text>
                    </InlineStack>
                  </Box>
                )
              }
              return null
            })()}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </div>
  )
}