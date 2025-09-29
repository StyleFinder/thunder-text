'use client'

import { Card, BlockStack, Select, TextField, Text } from '@shopify/polaris'
import { type ProductCategory, PRODUCT_CATEGORIES } from '@/lib/prompts'

interface ProductDetailsFormProps {
  mode?: 'create' | 'enhance'
  parentCategory: string
  setParentCategory: (value: string) => void
  parentCategoryOptions: { label: string; value: string }[]
  availableSizing: string
  setAvailableSizing: (value: string) => void
  sizingOptions: { label: string; value: string }[]
  selectedTemplate: ProductCategory
  setSelectedTemplate: (value: ProductCategory) => void
  templatePreview?: any
  setTemplatePreview?: (value: any) => void
  disabled?: boolean
  initialData?: {
    parentCategory?: string
    availableSizing?: string
    selectedTemplate?: ProductCategory
  }
}

export function ProductDetailsForm({
  mode = 'create',
  parentCategory,
  setParentCategory,
  parentCategoryOptions,
  availableSizing,
  setAvailableSizing,
  sizingOptions,
  selectedTemplate,
  setSelectedTemplate,
  templatePreview,
  setTemplatePreview,
  disabled = false,
  initialData
}: ProductDetailsFormProps) {
  // Apply initial data if in enhance mode
  if (mode === 'enhance' && initialData) {
    if (initialData.parentCategory && !parentCategory) {
      setParentCategory(initialData.parentCategory)
    }
    if (initialData.availableSizing && !availableSizing) {
      setAvailableSizing(initialData.availableSizing)
    }
    if (initialData.selectedTemplate && selectedTemplate === 'general') {
      setSelectedTemplate(initialData.selectedTemplate)
    }
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Product Details</Text>

        <Select
          label="Parent Category"
          options={parentCategoryOptions}
          value={parentCategory}
          onChange={setParentCategory}
          disabled={disabled}
        />

        <Select
          label="Available Sizing"
          options={sizingOptions}
          value={availableSizing}
          onChange={setAvailableSizing}
          helpText="Select the available size range for this product"
          disabled={disabled}
        />

        <Select
          label="Product Category Template"
          options={[
            { label: "Women's Clothing", value: 'clothing' },
            { label: "Jewelry & Accessories", value: 'jewelry' },
            { label: "Home & Living", value: 'home' },
            { label: "Beauty & Personal Care", value: 'beauty' },
            { label: "Electronics", value: 'electronics' },
            { label: "General Products", value: 'general' }
          ]}
          value={selectedTemplate}
          onChange={(value) => setSelectedTemplate(value as ProductCategory)}
          helpText="Choose a template that best matches your product type for optimized descriptions"
        />
      </BlockStack>
    </Card>
  )
}