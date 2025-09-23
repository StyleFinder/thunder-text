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

  const getPriorityColor = (priority: string) => {
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
            
            {productData.price && (
              <Text variant="bodyMd" tone="subdued">
                ${productData.price}
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
                    source={image.url || image.src || ''}
                    alt={image.altText || `Product image ${index + 1}`}
                    size="small"
                  />
                ))}
                {productData.images.length > 4 && (
                  <Box padding="200" background="bg-surface-secondary">
                    <Text variant="bodySm" tone="subdued">
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
              <Text variant="bodyMd">
                {productData.originalDescription || productData.description || 'No description available'}
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
              <Text variant="headingSm" as="h4">
                AI Improvement Suggestions ({suggestions.length})
              </Text>
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
                          <Text variant="bodyMd">
                            {getSuggestionIcon(suggestion.type)}
                          </Text>
                          <BlockStack gap="100">
                            <Text variant="bodyMd" fontWeight="medium">
                              {suggestion.title}
                            </Text>
                            <Text variant="bodySm" tone="subdued">
                              {suggestion.description}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                        <Badge tone={getPriorityColor(suggestion.priority) as any}>
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
            <Text variant="headingSm" as="h4">Product Metadata</Text>
          </Button>
          
          <Collapsible
            open={expandedSections.metadata}
            id="metadata-section"
            transition={{duration: '150ms', timingFunction: 'ease'}}
          >
            <Box paddingBlockStart="300">
              <BlockStack gap="200">
                {productData.material && (
                  <InlineStack align="space-between">
                    <Text variant="bodyMd">Material:</Text>
                    <Text variant="bodyMd" fontWeight="medium">{productData.material}</Text>
                  </InlineStack>
                )}
                
                {productData.brand && (
                  <InlineStack align="space-between">
                    <Text variant="bodyMd">Brand:</Text>
                    <Text variant="bodyMd" fontWeight="medium">{productData.brand}</Text>
                  </InlineStack>
                )}
                
                {productData.tags && productData.tags.length > 0 && (
                  <BlockStack gap="100">
                    <Text variant="bodyMd">Tags:</Text>
                    <InlineStack gap="100">
                      {productData.tags.slice(0, 5).map((tag, index) => (
                        <Badge key={index} tone="info">{tag}</Badge>
                      ))}
                      {productData.tags.length > 5 && (
                        <Badge>+{productData.tags.length - 5} more</Badge>
                      )}
                    </InlineStack>
                  </BlockStack>
                )}
                
                {productData.keyFeatures && productData.keyFeatures.length > 0 && (
                  <BlockStack gap="100">
                    <Text variant="bodyMd">Key Features:</Text>
                    <List type="bullet">
                      {productData.keyFeatures.slice(0, 3).map((feature, index) => (
                        <List.Item key={index}>{feature}</List.Item>
                      ))}
                    </List>
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
              <Text variant="headingSm" as="h4">
                Variants ({productData.variants.length})
              </Text>
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
                      <Text variant="bodyMd">
                        {variant.title || `Variant ${index + 1}`}
                      </Text>
                      <Text variant="bodyMd" fontWeight="medium">
                        ${variant.price || '0.00'}
                      </Text>
                    </InlineStack>
                  ))}
                  {productData.variants.length > 5 && (
                    <Text variant="bodySm" tone="subdued">
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
              <Text variant="headingSm" as="h4">Performance Insights</Text>
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
                      <Text variant="bodyMd">Views:</Text>
                      <Text variant="bodyMd" fontWeight="medium">
                        {productData.performance.viewCount.toLocaleString()}
                      </Text>
                    </InlineStack>
                  )}
                  
                  {productData.performance.conversionRate !== undefined && (
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">Conversion Rate:</Text>
                      <Text variant="bodyMd" fontWeight="medium">
                        {(productData.performance.conversionRate * 100).toFixed(1)}%
                      </Text>
                    </InlineStack>
                  )}
                  
                  <InlineStack align="space-between">
                    <Text variant="bodyMd">Last Modified:</Text>
                    <Text variant="bodyMd" fontWeight="medium">
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