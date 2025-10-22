'use client'

import { useState } from 'react'
import {
  Card,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Button,
  Badge,
  Thumbnail,
  Collapsible,
  Icon,
  List
} from '@shopify/polaris'
import { ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons'
import { EnhancementProductData } from '@/lib/shopify/product-enhancement'

interface ProductContextPanelProps {
  productData: EnhancementProductData
  suggestions?: Array<{
    type: 'seo' | 'content' | 'structure' | 'features'
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
  }>
}

export function ProductContextPanel({ productData, suggestions = [] }: ProductContextPanelProps) {
  const [expandedSections, setExpandedSections] = useState<{
    metadata: boolean
    performance: boolean
    suggestions: boolean
    variants: boolean
  }>({
    metadata: false,
    performance: false,
    suggestions: true,
    variants: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getPriorityColor = (priority: string): 'critical' | 'attention' | 'success' | 'info' => {
    switch (priority) {
      case 'high': return 'critical'
      case 'medium': return 'attention'
      case 'low': return 'success'
      default: return 'info'
    }
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'seo': return '🔍'
      case 'content': return '📝'
      case 'structure': return '🏗️'
      case 'features': return '⭐'
      default: return '💡'
    }
  }

  return (
    <Card>
      <BlockStack gap="500">
        {/* Product Header */}
        <Box>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">Current Product</Text>
              <Badge tone="info">
                {productData.category?.primary || 'Uncategorized'}
              </Badge>
            </InlineStack>
            
            <Text variant="headingSm" as="h3">
              {productData.title || 'Untitled Product'}
            </Text>

            {productData.variants && productData.variants.length > 0 && (
              <Text variant="bodyMd" tone="subdued" as="p">
                ${productData.variants[0].price}
              </Text>
            )}
          </BlockStack>
        </Box>

        {/* Product Images */}
        {productData.images && productData.images.length > 0 && (
          <Box>
            <Text variant="headingSm" as="h4">Images ({productData.images.length})</Text>
            <Box paddingBlockStart="200">
              <InlineStack gap="200">
                {productData.images.slice(0, 4).map((image, index) => (
                  <Thumbnail
                    key={index}
                    source={image.url || ''}
                    alt={image.altText || `Product image ${index + 1}`}
                    size="small"
                  />
                ))}
                {productData.images.length > 4 && (
                  <Box padding="200" background="bg-surface-secondary">
                    <Text variant="bodySm" tone="subdued" as="span">
                      +{productData.images.length - 4} more
                    </Text>
                  </Box>
                )}
              </InlineStack>
            </Box>
          </Box>
        )}

        {/* Current Description Preview */}
        <Box>
          <Text variant="headingSm" as="h4">Current Description</Text>
          <Box paddingBlockStart="200">
            <Card background="bg-surface-secondary">
              <Text variant="bodyMd" as="p">
                {productData.originalDescription || 'No description available'}
              </Text>
            </Card>
          </Box>
        </Box>

        {/* AI Improvement Suggestions */}
        {suggestions.length > 0 && (
          <Box>
            <Button
              onClick={() => toggleSection('suggestions')}
              variant="plain"
              icon={expandedSections.suggestions ? ChevronUpIcon : ChevronDownIcon}
              fullWidth
              textAlign="left"
            >
              {`AI Improvement Suggestions (${suggestions.length})`}
            </Button>
            
            <Collapsible
              open={expandedSections.suggestions}
              id="suggestions-section"
              transition={{duration: '150ms', timingFunction: 'ease'}}
            >
              <Box paddingBlockStart="300">
                <BlockStack gap="200">
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} background="bg-surface-secondary">
                      <InlineStack align="space-between" blockAlign="start">
                        <InlineStack gap="200" blockAlign="start">
                          <Text variant="bodyMd" as="span">
                            {getSuggestionIcon(suggestion.type)}
                          </Text>
                          <BlockStack gap="100">
                            <Text variant="bodyMd" fontWeight="medium" as="p">
                              {suggestion.title}
                            </Text>
                            <Text variant="bodySm" tone="subdued" as="p">
                              {suggestion.description}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                        <Badge tone={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority}
                        </Badge>
                      </InlineStack>
                    </Card>
                  ))}
                </BlockStack>
              </Box>
            </Collapsible>
          </Box>
        )}

        {/* Product Metadata */}
        <Box>
          <Button
            onClick={() => toggleSection('metadata')}
            variant="plain"
            icon={expandedSections.metadata ? ChevronUpIcon : ChevronDownIcon}
            fullWidth
            textAlign="left"
          >
            Product Metadata
          </Button>
          
          <Collapsible
            open={expandedSections.metadata}
            id="metadata-section"
            transition={{duration: '150ms', timingFunction: 'ease'}}
          >
            <Box paddingBlockStart="300">
              <BlockStack gap="200">
                {productData.materials?.fabric && (
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">Material:</Text>
                    <Text variant="bodyMd" fontWeight="medium" as="span">{productData.materials.fabric}</Text>
                  </InlineStack>
                )}
                
                {productData.vendor && (
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">Vendor:</Text>
                    <Text variant="bodyMd" fontWeight="medium" as="span">{productData.vendor}</Text>
                  </InlineStack>
                )}
                
                {productData.tags && productData.tags.length > 0 && (
                  <BlockStack gap="100">
                    <Text variant="bodyMd" as="p">Tags:</Text>
                    <InlineStack gap="100">
                      {productData.tags.slice(0, 5).map((tag, index) => (
                        <Badge key={index} tone="info">{tag}</Badge>
                      ))}
                      {productData.tags.length > 5 && (
                        <Badge>{`+${productData.tags.length - 5} more`}</Badge>
                      )}
                    </InlineStack>
                  </BlockStack>
                )}
                
              </BlockStack>
            </Box>
          </Collapsible>
        </Box>

        {/* Variants Information */}
        {productData.variants && productData.variants.length > 1 && (
          <Box>
            <Button
              onClick={() => toggleSection('variants')}
              variant="plain"
              icon={expandedSections.variants ? ChevronUpIcon : ChevronDownIcon}
              fullWidth
              textAlign="left"
            >
              {`Variants (${productData.variants.length})`}
            </Button>
            
            <Collapsible
              open={expandedSections.variants}
              id="variants-section"
              transition={{duration: '150ms', timingFunction: 'ease'}}
            >
              <Box paddingBlockStart="300">
                <BlockStack gap="200">
                  {productData.variants.slice(0, 5).map((variant, index) => (
                    <InlineStack key={index} align="space-between">
                      <Text variant="bodyMd" as="span">
                        {variant.title || `Variant ${index + 1}`}
                      </Text>
                      <Text variant="bodyMd" fontWeight="medium" as="span">
                        ${variant.price || '0.00'}
                      </Text>
                    </InlineStack>
                  ))}
                  {productData.variants.length > 5 && (
                    <Text variant="bodySm" tone="subdued" as="p">
                      +{productData.variants.length - 5} more variants
                    </Text>
                  )}
                </BlockStack>
              </Box>
            </Collapsible>
          </Box>
        )}

        {/* Performance Data */}
        {productData.performance && (
          <Box>
            <Button
              onClick={() => toggleSection('performance')}
              variant="plain"
              icon={expandedSections.performance ? ChevronUpIcon : ChevronDownIcon}
              fullWidth
              textAlign="left"
            >
              Performance Insights
            </Button>
            
            <Collapsible
              open={expandedSections.performance}
              id="performance-section"
              transition={{duration: '150ms', timingFunction: 'ease'}}
            >
              <Box paddingBlockStart="300">
                <BlockStack gap="200">
                  {productData.performance.viewCount !== undefined && (
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Views:</Text>
                      <Text variant="bodyMd" fontWeight="medium" as="span">
                        {productData.performance.viewCount.toLocaleString()}
                      </Text>
                    </InlineStack>
                  )}

                  {productData.performance.conversionRate !== undefined && (
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Conversion Rate:</Text>
                      <Text variant="bodyMd" fontWeight="medium" as="span">
                        {(productData.performance.conversionRate * 100).toFixed(1)}%
                      </Text>
                    </InlineStack>
                  )}

                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">Last Modified:</Text>
                    <Text variant="bodyMd" fontWeight="medium" as="span">
                      {new Date(productData.performance.lastModified).toLocaleDateString()}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Collapsible>
          </Box>
        )}
      </BlockStack>
    </Card>
  )
}