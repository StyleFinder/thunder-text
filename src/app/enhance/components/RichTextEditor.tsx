'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Card,
  Text,
  Box,
  InlineStack,
  BlockStack,
  TextField,
  Button,
  ButtonGroup,
  Badge,
  Banner,
  Tabs,
  Popover,
  ActionList,
  Divider
} from '@shopify/polaris'
import { 
  TextBoldIcon, 
  TextItalicIcon, 
  MenuHorizontalIcon,
  LinkIcon,
  ViewIcon,
  EditIcon
} from '@shopify/polaris-icons'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  helpText?: string
  showCharacterCount?: boolean
  showSeoHints?: boolean
  shopifyFormatting?: boolean
  autoComplete?: string
}

interface SeoMetrics {
  characterCount: number
  wordCount: number
  readabilityScore: number
  keywordDensity: Record<string, number>
  suggestions: string[]
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter product description...",
  label = "Product Description",
  helpText,
  showCharacterCount = true,
  showSeoHints = true,
  shopifyFormatting = true,
  autoComplete = "off"
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [insertMenuActive, setInsertMenuActive] = useState(false)
  const [formatMenuActive, setFormatMenuActive] = useState(false)

  // Calculate SEO metrics
  const seoMetrics = useMemo((): SeoMetrics => {
    const text = value || ''
    const words = text.split(/\s+/).filter(word => word.length > 0)
    
    // Calculate keyword density
    const wordFreq: Record<string, number> = {}
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '')
      if (cleanWord.length > 2) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1
      }
    })
    
    // Simple readability score (Flesch-Kincaid inspired)
    const avgSentenceLength = text.split(/[.!?]+/).length > 0 
      ? words.length / text.split(/[.!?]+/).length 
      : 0
    const readabilityScore = Math.max(0, Math.min(100, 100 - avgSentenceLength * 2))
    
    // Generate suggestions
    const suggestions: string[] = []
    if (text.length < 150) suggestions.push("Consider adding more detail (aim for 150+ characters)")
    if (words.length < 20) suggestions.push("Add more descriptive words (aim for 20+ words)")
    if (!/\b(size|sizing|fit)\b/i.test(text)) suggestions.push("Consider adding sizing information")
    if (!/\b(material|fabric|cotton|polyester|leather)\b/i.test(text)) suggestions.push("Include material information")
    if (readabilityScore < 40) suggestions.push("Use shorter sentences for better readability")
    
    return {
      characterCount: text.length,
      wordCount: words.length,
      readabilityScore,
      keywordDensity: wordFreq,
      suggestions
    }
  }, [value])

  // Shopify-specific formatting templates
  const shopifyTemplates = [
    {
      label: "Size Guide",
      content: "\n\n📏 **Size Guide:**\n• Small: [measurements]\n• Medium: [measurements]\n• Large: [measurements]\n• X-Large: [measurements]"
    },
    {
      label: "Care Instructions",
      content: "\n\n🧽 **Care Instructions:**\n• Machine wash cold\n• Tumble dry low\n• Do not bleach\n• Iron on low heat"
    },
    {
      label: "Materials & Features",
      content: "\n\n✨ **Materials & Features:**\n• [Material composition]\n• [Key feature 1]\n• [Key feature 2]\n• [Key feature 3]"
    },
    {
      label: "Shipping Info",
      content: "\n\n🚚 **Shipping Information:**\n• Free shipping on orders over $[amount]\n• Processing time: [X] business days\n• Delivery time: [X-X] business days"
    }
  ]

  // Text formatting functions
  const formatText = useCallback((format: string) => {
    const textarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)

    let newText = value
    let newCursorPos = start

    switch (format) {
      case 'bold':
        if (selectedText) {
          newText = value.substring(0, start) + `**${selectedText}**` + value.substring(end)
          newCursorPos = end + 4
        } else {
          newText = value.substring(0, start) + '****' + value.substring(start)
          newCursorPos = start + 2
        }
        break
      case 'italic':
        if (selectedText) {
          newText = value.substring(0, start) + `*${selectedText}*` + value.substring(end)
          newCursorPos = end + 2
        } else {
          newText = value.substring(0, start) + '**' + value.substring(start)
          newCursorPos = start + 1
        }
        break
      case 'bullets':
        const lines = selectedText || 'List item'
        const bulletList = lines.split('\n').map(line => `• ${line.trim()}`).join('\n')
        newText = value.substring(0, start) + bulletList + value.substring(end)
        newCursorPos = start + bulletList.length
        break
    }

    onChange(newText)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [value, onChange])

  const insertTemplate = useCallback((template: string) => {
    const textarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement
    const start = textarea?.selectionStart || value.length
    
    const newText = value.substring(0, start) + template + value.substring(start)
    onChange(newText)
    
    setInsertMenuActive(false)
  }, [value, onChange])

  const tabs = [
    {
      id: 'edit',
      content: 'Edit',
      panelID: 'edit-panel'
    },
    {
      id: 'preview',
      content: 'Preview',
      panelID: 'preview-panel'
    }
  ]

  const renderMarkdownPreview = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.*)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
      .replace(/\n/g, '<br />')
  }

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between">
          <Text variant="headingSm" as="h3">{label}</Text>
          {showCharacterCount && (
            <InlineStack gap="200">
              <Text variant="bodySm" tone="subdued" as="span">
                {seoMetrics.characterCount} characters
              </Text>
              <Text variant="bodySm" tone="subdued" as="span">
                {seoMetrics.wordCount} words
              </Text>
            </InlineStack>
          )}
        </InlineStack>

        {/* Formatting Toolbar */}
        <InlineStack gap="200" align="space-between">
          <InlineStack gap="100">
            <ButtonGroup>
              <Button
                icon={TextBoldIcon}
                onClick={() => formatText('bold')}
                accessibilityLabel="Bold"
                size="micro"
              />
              <Button
                icon={TextItalicIcon}
                onClick={() => formatText('italic')}
                accessibilityLabel="Italic"
                size="micro"
              />
              <Button
                icon={MenuHorizontalIcon}
                onClick={() => formatText('bullets')}
                accessibilityLabel="Bullet List"
                size="micro"
              />
            </ButtonGroup>

            {shopifyFormatting && (
              <Popover
                active={insertMenuActive}
                activator={
                  <Button
                    onClick={() => setInsertMenuActive(!insertMenuActive)}
                    disclosure
                    size="micro"
                  >
                    Insert
                  </Button>
                }
                onClose={() => setInsertMenuActive(false)}
              >
                <ActionList
                  items={shopifyTemplates.map(template => ({
                    content: template.label,
                    onAction: () => insertTemplate(template.content)
                  }))}
                />
              </Popover>
            )}
          </InlineStack>
        </InlineStack>

        {/* Editor Tabs */}
        <Tabs tabs={tabs} selected={activeTab} onSelect={setActiveTab}>
          {activeTab === 0 ? (
            /* Edit Mode */
            <Box paddingBlockStart="300">
              <TextField
                value={value}
                onChange={onChange}
                multiline={8}
                placeholder={placeholder}
                helpText={helpText}
                autoComplete={autoComplete}
                name="description"
              />
            </Box>
          ) : (
            /* Preview Mode */
            <Box paddingBlockStart="300">
              <Card background="bg-surface-secondary">
                <Box padding="400">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: renderMarkdownPreview(value || placeholder) 
                    }}
                    style={{
                      minHeight: '200px',
                      fontFamily: 'system-ui, sans-serif',
                      lineHeight: '1.5'
                    }}
                  />
                </Box>
              </Card>
            </Box>
          )}
        </Tabs>

        {/* SEO Insights */}
        {showSeoHints && seoMetrics.suggestions.length > 0 && (
          <Banner tone="info">
            <BlockStack gap="200">
              <Text variant="bodyMd" fontWeight="medium" as="p">SEO Suggestions:</Text>
              <BlockStack gap="100">
                {seoMetrics.suggestions.slice(0, 3).map((suggestion, index) => (
                  <Text key={index} variant="bodySm" as="p">• {suggestion}</Text>
                ))}
              </BlockStack>
            </BlockStack>
          </Banner>
        )}

        {/* Readability Score */}
        {showSeoHints && (
          <InlineStack gap="300">
            <Text variant="bodySm" tone="subdued" as="span">
              Readability Score:
            </Text>
            <Badge 
              tone={
                seoMetrics.readabilityScore >= 70 ? 'success' :
                seoMetrics.readabilityScore >= 40 ? 'attention' : 'critical'
              }
            >
              {Math.round(seoMetrics.readabilityScore)}/100
            </Badge>
          </InlineStack>
        )}

        {/* Character Count Details */}
        {showCharacterCount && (
          <InlineStack gap="400">
            <Text variant="bodySm" tone="subdued" as="span">
              Optimal length: 150-300 characters for SEO
            </Text>
            <Badge 
              tone={
                seoMetrics.characterCount >= 150 && seoMetrics.characterCount <= 300 ? 'success' :
                seoMetrics.characterCount > 300 ? 'attention' : 'info'
              }
            >
              {seoMetrics.characterCount < 150 ? 'Too short' :
               seoMetrics.characterCount > 300 ? 'Long' : 'Optimal'}
            </Badge>
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  )
}