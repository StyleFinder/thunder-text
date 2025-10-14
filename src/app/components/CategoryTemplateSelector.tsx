'use client'

import { useState, useEffect } from 'react'
import { Select, Box, Text, Button, InlineStack } from '@shopify/polaris'
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/prompts'

interface CategoryTemplate {
  id: string
  name: string
  category: string
  content: string
  is_default: boolean
}

interface CategoryTemplateSelectorProps {
  value: string
  onChange: (value: string, category?: ProductCategory) => void
  storeId: string
  onPreview?: (template: CategoryTemplate | null) => void
}

export function CategoryTemplateSelector({ 
  value, 
  onChange, 
  storeId, 
  onPreview 
}: CategoryTemplateSelectorProps) {
  const [templates, setTemplates] = useState<CategoryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load category templates only once on mount or when storeId changes
  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true)
        const response = await fetch(`/api/prompts?store_id=${storeId}`)

        if (!response.ok) {
          throw new Error('Failed to load templates')
        }

        const data = await response.json()
        setTemplates(data.category_templates || [])

        // Set default if none selected - prioritize templates marked as default
        if (!value && data.category_templates?.length > 0) {
          // First, look for any template marked as default
          const defaultTemplate = data.category_templates.find((t: CategoryTemplate) =>
            t.is_default === true
          )
          // If no default found, fall back to general category
          || data.category_templates.find((t: CategoryTemplate) =>
            t.category === 'general'
          )
          // Finally, just use the first available template
          || data.category_templates[0]

          onChange(defaultTemplate.category, defaultTemplate.category as ProductCategory)
        }
      } catch (err) {
        console.error('Error loading templates:', err)
        setError('Failed to load templates')
      } finally {
        setLoading(false)
      }
    }

    if (storeId) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // Get current template for preview
  const currentTemplate = templates.find(t => t.category === value)

  // Handle selection change
  const handleChange = (newValue: string) => {
    const template = templates.find(t => t.category === newValue)
    onChange(newValue, newValue as ProductCategory)
    
    if (onPreview) {
      onPreview(template || null)
    }
  }

  // Generate options from available categories
  const options = PRODUCT_CATEGORIES.map(category => ({
    label: category.label,
    value: category.value
  }))

  // Add "Custom" option if there are templates not in the standard categories
  const customTemplates = templates.filter(t => 
    !PRODUCT_CATEGORIES.some(cat => cat.value === t.category)
  )

  const allOptions = [
    ...options,
    ...customTemplates.map(t => ({
      label: `${t.name} (Custom)`,
      value: t.category
    }))
  ]

  if (loading) {
    return (
      <Box>
        <Text variant="bodyMd" as="p" tone="subdued">
          Loading templates...
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Text variant="bodyMd" as="p" tone="critical">
          {error}
        </Text>
      </Box>
    )
  }

  return (
    <Box>
      <Select
        label="Product Category Template"
        options={allOptions}
        value={value}
        onChange={handleChange}
        helpText="Choose a template that best matches your product type for optimized descriptions"
      />
    </Box>
  )
}