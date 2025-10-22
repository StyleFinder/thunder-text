'use client'

import { useState, useMemo } from 'react'
import {
  Card,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Button,
  Badge,
  ButtonGroup,
  Divider,
  Icon
} from '@shopify/polaris'
import { ViewIcon, EditIcon } from '@shopify/polaris-icons'

export interface ComparisonData {
  original: {
    title: string
    description: string
    features?: string[]
    seoScore?: number
  }
  enhanced: {
    title: string
    description: string
    features?: string[]
    seoScore?: number
    improvements?: string[]
  }
}

interface ComparisonViewProps {
  comparisonData: ComparisonData
  onEditEnhanced?: (field: 'title' | 'description', value: string) => void
  onApproveChanges?: () => void
  onRejectChanges?: () => void
  viewMode?: 'side-by-side' | 'stacked'
  showMetrics?: boolean
}

interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged'
  text: string
}

export function ComparisonView({
  comparisonData,
  onEditEnhanced,
  onApproveChanges,
  onRejectChanges,
  viewMode = 'side-by-side',
  showMetrics = true
}: ComparisonViewProps) {
  const [currentViewMode, setCurrentViewMode] = useState<'side-by-side' | 'stacked'>(viewMode)
  const [previewMode, setPreviewMode] = useState<'preview' | 'edit'>('preview')

  // Simple diff algorithm for highlighting changes
  const generateDiff = useMemo(() => {
    const original = comparisonData.original.description || ''
    const enhanced = comparisonData.enhanced.description || ''
    
    // Split into words for word-level diff
    const originalWords = original.split(/\s+/)
    const enhancedWords = enhanced.split(/\s+/)
    
    const diff: DiffSegment[] = []
    let i = 0, j = 0
    
    while (i < originalWords.length || j < enhancedWords.length) {
      if (i >= originalWords.length) {
        // Only enhanced words left
        diff.push({ type: 'added', text: enhancedWords.slice(j).join(' ') })
        break
      } else if (j >= enhancedWords.length) {
        // Only original words left
        diff.push({ type: 'removed', text: originalWords.slice(i).join(' ') })
        break
      } else if (originalWords[i] === enhancedWords[j]) {
        // Words match
        diff.push({ type: 'unchanged', text: originalWords[i] + ' ' })
        i++
        j++
      } else {
        // Find next matching word
        let nextMatch = -1
        for (let k = j + 1; k < Math.min(enhancedWords.length, j + 10); k++) {
          if (originalWords[i] === enhancedWords[k]) {
            nextMatch = k
            break
          }
        }
        
        if (nextMatch > -1) {
          // Found a match, mark intermediate words as added
          diff.push({ type: 'added', text: enhancedWords.slice(j, nextMatch).join(' ') + ' ' })
          j = nextMatch
        } else {
          // No match found, mark as removed/added
          diff.push({ type: 'removed', text: originalWords[i] + ' ' })
          diff.push({ type: 'added', text: enhancedWords[j] + ' ' })
          i++
          j++
        }
      }
    }
    
    return diff
  }, [comparisonData.original.description, comparisonData.enhanced.description])

  const renderDiffText = (diff: DiffSegment[]) => {
    return diff.map((segment, index) => (
      <span
        key={index}
        style={{
          backgroundColor: 
            segment.type === 'added' ? '#e6ffe6' :
            segment.type === 'removed' ? '#ffe6e6' : 
            'transparent',
          textDecoration: segment.type === 'removed' ? 'line-through' : 'none',
          padding: segment.type !== 'unchanged' ? '1px 2px' : '0',
          borderRadius: '2px'
        }}
      >
        {segment.text}
      </span>
    ))
  }

  const calculateImprovements = () => {
    const originalLength = comparisonData.original.description?.length || 0
    const enhancedLength = comparisonData.enhanced.description?.length || 0
    const lengthChange = enhancedLength - originalLength

    const originalSeo = comparisonData.original.seoScore || 0
    const enhancedSeo = comparisonData.enhanced.seoScore || 0
    const seoImprovement = enhancedSeo - originalSeo

    return {
      lengthChange,
      lengthPercentage: originalLength > 0 ? Math.round((lengthChange / originalLength) * 100) : 0,
      seoImprovement,
      wordCount: comparisonData.enhanced.description ? comparisonData.enhanced.description.split(/\s+/).length : 0
    }
  }

  const improvements = calculateImprovements()

  const renderSideBySide = () => (
    <InlineStack gap="400" align="start">
      {/* Original Version */}
      <div style={{ flex: 1 }}>
        <Box>
        <Card background="bg-surface-secondary">
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingSm" as="h3">Original</Text>
              <Badge>Current</Badge>
            </InlineStack>
            
            <Text variant="headingMd" as="h4">
              {comparisonData.original.title}
            </Text>
            
            <Box>
              <Text variant="bodyMd">
                {comparisonData.original.description}
              </Text>
            </Box>
            
            {showMetrics && (
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">
                  Length: {comparisonData.original.description?.length || 0} characters
                </Text>
                {comparisonData.original.seoScore && (
                  <Text variant="bodySm" tone="subdued">
                    SEO Score: {comparisonData.original.seoScore}/100
                  </Text>
                )}
              </BlockStack>
            )}
          </BlockStack>
        </Card>
        </Box>
      </div>

      {/* Enhanced Version */}
      <div style={{ flex: 1 }}>
        <Box>
        <Card background="bg-surface-success-subdued">
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingSm" as="h3">Enhanced</Text>
              <Badge tone="success">AI Improved</Badge>
            </InlineStack>
            
            <Text variant="headingMd" as="h4">
              {comparisonData.enhanced.title}
            </Text>
            
            <Box>
              <Text variant="bodyMd">
                {comparisonData.enhanced.description}
              </Text>
            </Box>
            
            {showMetrics && (
              <BlockStack gap="200">
                <InlineStack gap="200">
                  <Text variant="bodySm" tone="subdued">
                    Length: {comparisonData.enhanced.description?.length || 0} characters
                  </Text>
                  {improvements.lengthChange !== 0 && (
                    <Badge tone={improvements.lengthChange > 0 ? 'success' : 'attention'}>
                      {improvements.lengthChange > 0 ? '+' : ''}{improvements.lengthPercentage}%
                    </Badge>
                  )}
                </InlineStack>
                
                {comparisonData.enhanced.seoScore && (
                  <InlineStack gap="200">
                    <Text variant="bodySm" tone="subdued">
                      SEO Score: {comparisonData.enhanced.seoScore}/100
                    </Text>
                    {improvements.seoImprovement > 0 && (
                      <Badge tone="success">
                        +{improvements.seoImprovement} points
                      </Badge>
                    )}
                  </InlineStack>
                )}
              </BlockStack>
            )}
          </BlockStack>
        </Card>
        </Box>
      </div>
    </InlineStack>
  )

  const renderStacked = () => (
    <BlockStack gap="400">
      {/* Diff View */}
      <Card>
        <BlockStack gap="300">
          <Text variant="headingSm" as="h3">Changes Overview</Text>
          <Box padding="300" background="bg-surface-secondary">
            <Text variant="bodyMd">
              {renderDiffText(generateDiff)}
            </Text>
          </Box>
        </BlockStack>
      </Card>

      {/* Enhanced Version Full */}
      <Card background="bg-surface-success-subdued">
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text variant="headingSm" as="h3">Enhanced Version</Text>
            <Badge tone="success">Ready to Apply</Badge>
          </InlineStack>
          
          <Text variant="headingMd" as="h4">
            {comparisonData.enhanced.title}
          </Text>
          
          <Text variant="bodyMd">
            {comparisonData.enhanced.description}
          </Text>
        </BlockStack>
      </Card>
    </BlockStack>
  )

  return (
    <Card>
      <BlockStack gap="500">
        {/* Header Controls */}
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h2">Description Comparison</Text>
          
          <InlineStack gap="200">
            <ButtonGroup segmented>
              <Button
                pressed={currentViewMode === 'side-by-side'}
                onClick={() => setCurrentViewMode('side-by-side')}
              >
                Side by Side
              </Button>
              <Button
                pressed={currentViewMode === 'stacked'}
                onClick={() => setCurrentViewMode('stacked')}
              >
                Stacked
              </Button>
            </ButtonGroup>
            
            <ButtonGroup segmented>
              <Button
                pressed={previewMode === 'preview'}
                onClick={() => setPreviewMode('preview')}
                icon={ViewIcon}
              >
                Preview
              </Button>
              <Button
                pressed={previewMode === 'edit'}
                onClick={() => setPreviewMode('edit')}
                icon={EditIcon}
              >
                Edit
              </Button>
            </ButtonGroup>
          </InlineStack>
        </InlineStack>

        {/* Improvements Summary */}
        {comparisonData.enhanced.improvements && comparisonData.enhanced.improvements.length > 0 && (
          <Card background="bg-surface-info-subdued">
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">Key Improvements</Text>
              <BlockStack gap="100">
                {comparisonData.enhanced.improvements.map((improvement, index) => (
                  <InlineStack key={index} gap="200">
                    <Text variant="bodyMd">✅</Text>
                    <Text variant="bodyMd">{improvement}</Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        )}

        {/* Comparison Content */}
        {currentViewMode === 'side-by-side' ? renderSideBySide() : renderStacked()}

        {/* Action Buttons */}
        {(onApproveChanges || onRejectChanges) && (
          <>
            <Divider />
            <InlineStack gap="300" align="end">
              {onRejectChanges && (
                <Button onClick={onRejectChanges}>
                  Reject Changes
                </Button>
              )}
              {onApproveChanges && (
                <Button variant="primary" onClick={onApproveChanges}>
                  Apply Enhanced Description
                </Button>
              )}
            </InlineStack>
          </>
        )}
      </BlockStack>
    </Card>
  )
}