'use client'

import { Card, BlockStack, TextField, Text } from '@shopify/polaris'

interface AdditionalInfoFormProps {
  mode?: 'create' | 'enhance'
  fabricMaterial: string
  setFabricMaterial: (value: string) => void
  occasionUse: string
  setOccasionUse: (value: string) => void
  targetAudience: string
  setTargetAudience: (value: string) => void
  keyFeatures: string
  setKeyFeatures: (value: string) => void
  additionalNotes: string
  setAdditionalNotes: (value: string) => void
  prefilled?: boolean
}

export function AdditionalInfoForm({
  mode = 'create',
  fabricMaterial,
  setFabricMaterial,
  occasionUse,
  setOccasionUse,
  targetAudience,
  setTargetAudience,
  keyFeatures,
  setKeyFeatures,
  additionalNotes,
  setAdditionalNotes,
  prefilled = false
}: AdditionalInfoFormProps) {
  const labelSuffix = prefilled ? ' (pre-filled)' : ''

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Additional Information</Text>

          <TextField
            label={`Fabric/Material Content${labelSuffix}`}
            value={fabricMaterial}
            onChange={setFabricMaterial}
            placeholder="e.g. 100% organic cotton, stainless steel, recycled plastic"
            helpText="Describe the materials used in this product"
            autoComplete="off"
          />

          <TextField
            label={`Occasion Use${labelSuffix}`}
            value={occasionUse}
            onChange={setOccasionUse}
            placeholder="e.g. outdoor activities, formal events, everyday use"
            helpText="When or where would customers use this product?"
            autoComplete="off"
          />

          <TextField
            label={`Target Audience${labelSuffix}`}
            value={targetAudience}
            onChange={setTargetAudience}
            placeholder="e.g. young professionals, parents, fitness enthusiasts"
            helpText="Who is this product designed for?"
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Features & Additional Details</Text>

          <TextField
            label={`Key Features${labelSuffix}`}
            value={keyFeatures}
            onChange={setKeyFeatures}
            placeholder="e.g. waterproof, eco-friendly, machine washable, lifetime warranty"
            helpText="List the main features and benefits"
            multiline={3}
            autoComplete="off"
          />

          <TextField
            label="Additional Notes"
            value={additionalNotes}
            onChange={setAdditionalNotes}
            placeholder="Any other important information about this product"
            helpText={mode === 'enhance' ? 'Additional context for the AI to consider' : 'Optional: Add any special instructions or details'}
            multiline={3}
            autoComplete="off"
          />
        </BlockStack>
      </Card>
    </>
  )
}