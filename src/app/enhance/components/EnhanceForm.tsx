'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Card,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Select,
  TextField,
  Button,
  Badge,
  Banner,
  Icon,
  Checkbox,
  ButtonGroup
} from '@shopify/polaris'
import { EditIcon } from '@shopify/polaris-icons'
import { CategoryTemplateSelector } from '@/app/components/CategoryTemplateSelector'
import { type ProductCategory } from '@/lib/prompts'
import { EnhancementProductData } from '@/lib/shopify/product-enhancement'

interface EnhanceFormProps {
  productData: EnhancementProductData
  shop: string
  onFormChange: (formData: EnhancementFormData) => void
  onGenerate: (formData: EnhancementFormData) => void
  isGenerating?: boolean
}

export interface EnhancementFormData {
  productCategory: ProductCategory
  template: string
  targetAudience: string
  fabricMaterial: string
  keyFeatures: string
  availableSizing: string
  additionalNotes: string
  enhancementGoals: {
    improveSeo: boolean
    increaseLength: boolean
    addEmotionalAppeals: boolean
    enhanceFeatures: boolean
    improveReadability: boolean
    addSizeGuide: boolean
    improveMaterialDescription: boolean
    enhanceCallToAction: boolean
  }
  preserveElements: {
    images: boolean
    price: boolean
    variants: boolean
    tags: boolean
    brand: boolean
  }
}

export function EnhanceForm({ 
  productData, 
  shop, 
  onFormChange, 
  onGenerate, 
  isGenerating = false 
}: EnhanceFormProps) {
  // Form state with pre-populated values
  const [formData, setFormData] = useState<EnhancementFormData>({
    productCategory: (productData.category?.primary as ProductCategory) || 'general',
    template: '',
    targetAudience: productData.vendor || productData.brand || '',
    fabricMaterial: productData.material || '',
    keyFeatures: productData.keyFeatures?.join('\n') || '',
    availableSizing: productData.variants?.map(v => v.title).join(', ') || '',
    additionalNotes: '',
    enhancementGoals: {
      improveSeo: true,
      increaseLength: false,
      addEmotionalAppeals: true,
      enhanceFeatures: true,
      improveReadability: true,
      addSizeGuide: false,
      improveMaterialDescription: true,
      enhanceCallToAction: true
    },
    preserveElements: {
      images: true,
      price: true,
      variants: true,
      tags: true,
      brand: true
    }
  })

  // Track which fields have been manually edited
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  
  // Track form validity
  const [isFormValid, setIsFormValid] = useState(false)

  // Update parent component when form changes
  useEffect(() => {
    onFormChange(formData)
    
    // Validate form
    const isValid = formData.productCategory && 
                   formData.targetAudience.trim() !== '' &&
                   Object.values(formData.enhancementGoals).some(goal => goal)
    
    setIsFormValid(isValid)
  }, [formData, onFormChange])

  const handleFieldChange = useCallback((field: keyof EnhancementFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Mark field as edited if it's different from pre-populated value
    setEditedFields(prev => new Set(prev).add(field))
  }, [])

  const handleGoalChange = useCallback((goal: keyof EnhancementFormData['enhancementGoals'], checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      enhancementGoals: {
        ...prev.enhancementGoals,
        [goal]: checked
      }
    }))
  }, [])

  const handlePreserveElementChange = useCallback((element: keyof EnhancementFormData['preserveElements'], checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      preserveElements: {
        ...prev.preserveElements,
        [element]: checked
      }
    }))
  }, [])

  const resetField = useCallback((field: keyof EnhancementFormData) => {
    const originalValues: Partial<EnhancementFormData> = {
      productCategory: (productData.category?.primary as ProductCategory) || 'general',
      targetAudience: productData.vendor || productData.brand || '',
      fabricMaterial: productData.material || '',
      keyFeatures: productData.keyFeatures?.join('\n') || '',
      availableSizing: productData.variants?.map(v => v.title).join(', ') || '',
      additionalNotes: ''
    }

    if (originalValues[field] !== undefined) {
      setFormData(prev => ({
        ...prev,
        [field]: originalValues[field]
      }))
      
      setEditedFields(prev => {
        const newSet = new Set(prev)
        newSet.delete(field)
        return newSet
      })
    }
  }, [productData])

  const getFieldLabel = (field: string, isEdited: boolean) => {
    if (isEdited) {
      return (
        <InlineStack gap="200" blockAlign="center">
          <Text variant="bodyMd" fontWeight="medium">{field}</Text>
          <Badge tone="attention">Modified</Badge>
          <Button
            variant="plain"
            size="micro"
            icon={EditIcon}
            onClick={() => resetField(field as keyof EnhancementFormData)}
          >
            Reset
          </Button>
        </InlineStack>
      )
    }
    return field
  }

  return (
    <Card>
      <BlockStack gap="500">
        <Box>
          <Text variant="headingMd" as="h2">Enhancement Settings</Text>
          <Text variant="bodyMd" tone="subdued">
            Configure how you want to enhance this product's description
          </Text>
        </Box>

        {/* Category Selection */}
        <Box>
          <CategoryTemplateSelector
            selectedCategory={formData.productCategory}
            selectedTemplate={formData.template}
            shop={shop}
            onCategoryChange={(category) => handleFieldChange('productCategory', category)}
            onTemplateChange={(template) => handleFieldChange('template', template)}
            showCustomTemplates={true}
            compact={false}
          />
        </Box>

        {/* Basic Product Information */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">Product Information</Text>
            
            <TextField
              label={getFieldLabel('Target Audience / Brand', editedFields.has('targetAudience'))}
              value={formData.targetAudience}
              onChange={(value) => handleFieldChange('targetAudience', value)}
              placeholder="Who is this product for?"
              autoComplete="off"
            />
            
            <TextField
              label={getFieldLabel('Fabric / Material', editedFields.has('fabricMaterial'))}
              value={formData.fabricMaterial}
              onChange={(value) => handleFieldChange('fabricMaterial', value)}
              placeholder="Cotton, Polyester, Leather, etc."
              autoComplete="off"
            />
            
            <TextField
              label={getFieldLabel('Key Features', editedFields.has('keyFeatures'))}
              value={formData.keyFeatures}
              onChange={(value) => handleFieldChange('keyFeatures', value)}
              multiline={4}
              placeholder="One feature per line"
              autoComplete="off"
            />
            
            <TextField
              label={getFieldLabel('Available Sizing', editedFields.has('availableSizing'))}
              value={formData.availableSizing}
              onChange={(value) => handleFieldChange('availableSizing', value)}
              placeholder="XS, S, M, L, XL or specific measurements"
              autoComplete="off"
            />
            
            <TextField
              label={getFieldLabel('Additional Notes', editedFields.has('additionalNotes'))}
              value={formData.additionalNotes}
              onChange={(value) => handleFieldChange('additionalNotes', value)}
              multiline={3}
              placeholder="Any specific requirements or focus areas for the enhancement"
              autoComplete="off"
            />
          </BlockStack>
        </Card>

        {/* Enhancement Goals */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">Enhancement Goals</Text>
            <Text variant="bodySm" tone="subdued">
              Select what aspects you want to improve in the product description
            </Text>
            
            <BlockStack gap="200">
              <Checkbox
                label="Improve SEO optimization"
                checked={formData.enhancementGoals.improveSeo}
                onChange={(checked) => handleGoalChange('improveSeo', checked)}
              />
              <Checkbox
                label="Increase description length and detail"
                checked={formData.enhancementGoals.increaseLength}
                onChange={(checked) => handleGoalChange('increaseLength', checked)}
              />
              <Checkbox
                label="Add emotional appeals and storytelling"
                checked={formData.enhancementGoals.addEmotionalAppeals}
                onChange={(checked) => handleGoalChange('addEmotionalAppeals', checked)}
              />
              <Checkbox
                label="Enhance feature descriptions"
                checked={formData.enhancementGoals.enhanceFeatures}
                onChange={(checked) => handleGoalChange('enhanceFeatures', checked)}
              />
              <Checkbox
                label="Improve readability and structure"
                checked={formData.enhancementGoals.improveReadability}
                onChange={(checked) => handleGoalChange('improveReadability', checked)}
              />
              <Checkbox
                label="Add comprehensive size guide"
                checked={formData.enhancementGoals.addSizeGuide}
                onChange={(checked) => handleGoalChange('addSizeGuide', checked)}
              />
              <Checkbox
                label="Improve material description"
                checked={formData.enhancementGoals.improveMaterialDescription}
                onChange={(checked) => handleGoalChange('improveMaterialDescription', checked)}
              />
              <Checkbox
                label="Enhance call-to-action"
                checked={formData.enhancementGoals.enhanceCallToAction}
                onChange={(checked) => handleGoalChange('enhanceCallToAction', checked)}
              />
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Preserve Elements */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">Preserve Product Elements</Text>
            <Text variant="bodySm" tone="subdued">
              Choose which existing product elements to keep unchanged
            </Text>
            
            <BlockStack gap="200">
              <Checkbox
                label="Keep existing images"
                checked={formData.preserveElements.images}
                onChange={(checked) => handlePreserveElementChange('images', checked)}
              />
              <Checkbox
                label="Keep current pricing"
                checked={formData.preserveElements.price}
                onChange={(checked) => handlePreserveElementChange('price', checked)}
              />
              <Checkbox
                label="Keep product variants"
                checked={formData.preserveElements.variants}
                onChange={(checked) => handlePreserveElementChange('variants', checked)}
              />
              <Checkbox
                label="Keep product tags"
                checked={formData.preserveElements.tags}
                onChange={(checked) => handlePreserveElementChange('tags', checked)}
              />
              <Checkbox
                label="Keep brand information"
                checked={formData.preserveElements.brand}
                onChange={(checked) => handlePreserveElementChange('brand', checked)}
              />
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Form Validation */}
        {!isFormValid && (
          <Banner tone="warning">
            <Text variant="bodyMd">
              Please ensure you have selected at least one enhancement goal and provided target audience information.
            </Text>
          </Banner>
        )}

        {/* Generate Button */}
        <Box>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={() => onGenerate(formData)}
            loading={isGenerating}
            disabled={!isFormValid || isGenerating}
          >
            {isGenerating ? 'Generating Enhanced Description...' : 'Generate Enhanced Description'}
          </Button>
        </Box>
      </BlockStack>
    </Card>
  )
}