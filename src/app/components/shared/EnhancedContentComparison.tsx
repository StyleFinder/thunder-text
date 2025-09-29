'use client'

import React, { useState } from 'react'
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
} from '@shopify/polaris'
import {
  EditIcon,
  CheckIcon,
  CancelSmallIcon,
  CompareIcon,
} from '@shopify/polaris-icons'

interface EnhancedContentComparisonProps {
  active: boolean
  onClose: () => void
  onApply: (content: any) => void
  originalContent: {
    title?: string
    description?: string
    seoTitle?: string
    seoDescription?: string
  }
  enhancedContent: {
    title?: string
    description?: string
    seoTitle?: string
    seoDescription?: string
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
    onApply(editedContent)
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
                    <Text variant="headingSm" as="h4" tone="success">
                      Enhanced
                    </Text>
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
                            icon={CancelSmallIcon}
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
                  <Text variant="headingSm" as="h4">
                    Preview
                  </Text>
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
                          icon={CancelSmallIcon}
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
          {/* View Mode Toggle */}
          <Card>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingSm" as="h3">View Mode</Text>
              <InlineStack gap="2">
                <Button
                  pressed={viewMode === 'comparison'}
                  onClick={() => setViewMode('comparison')}
                  icon={CompareIcon}
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
          </Card>

          {/* Confidence Score */}
          {enhancedContent.confidence && (
            <Banner
              tone={enhancedContent.confidence > 0.8 ? 'success' : 'info'}
            >
              <Text as="p">
                AI Confidence: {Math.round(enhancedContent.confidence * 100)}%
              </Text>
            </Banner>
          )}

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
  )
}