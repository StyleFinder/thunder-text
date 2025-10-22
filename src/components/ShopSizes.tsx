'use client'

import { useState, useEffect } from 'react'
import {
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  Checkbox,
  Badge,
  Box,
  Spinner
} from '@shopify/polaris'

interface ShopSize {
  id: string
  store_id: string | null
  name: string
  sizes: string[]
  is_default: boolean
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  source?: 'fallback' | 'database'
}

interface ShopSizesProps {
  shop: string
  onToast: (message: string, error?: boolean) => void
}

export default function ShopSizes({ shop, onToast }: ShopSizesProps) {
  const [sizes, setSizes] = useState<ShopSize[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formSizes, setFormSizes] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)

  const normalizeSize = (raw: unknown): ShopSize => {
    const rawObj = raw as {
      id?: string | number
      store_id?: string | null
      name?: string
      sizes?: unknown
      is_default?: boolean
      is_active?: boolean
      created_at?: string | null
      updated_at?: string | null
      source?: 'fallback' | 'database'
    }

    const id = rawObj?.id ? String(rawObj.id) : ''
    const storeId = rawObj?.store_id ?? null
    const isFallback =
      rawObj?.source === 'fallback' ||
      !storeId ||
      (typeof id === 'string' && id.startsWith('fallback-'))

    return {
      id,
      store_id: storeId,
      name: rawObj?.name ?? '',
      sizes: Array.isArray(rawObj?.sizes) ? rawObj.sizes : [],
      is_default: Boolean(rawObj?.is_default),
      is_active: rawObj?.is_active ?? true,
      created_at: rawObj?.created_at ?? null,
      updated_at: rawObj?.updated_at ?? null,
      source: isFallback ? 'fallback' : 'database'
    }
  }

  const resetFormState = () => {
    setFormName('')
    setFormSizes('')
    setFormIsDefault(false)
  }

  // Default template names that come from the database
  const DEFAULT_TEMPLATE_NAMES = [
    'Standard Sizes',
    'Plus Sizes',
    'Numeric Sizes',
    'Shoe Sizes',
    'Extended Sizes'
  ]

  const isTemplateOverride = (size: ShopSize) => {
    // It's an override if it has a store_id (custom) AND matches a default template name
    return !!size.store_id && DEFAULT_TEMPLATE_NAMES.includes(size.name)
  }

  useEffect(() => {
    fetchSizes()
  }, [shop])

  const fetchSizes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shop-sizes?shop=${shop}`)
      const data = await response.json()

      if (data.success) {
        const normalizedSizes = Array.isArray(data.data)
          ? data.data.map((size: unknown) => normalizeSize(size))
          : []
        setSizes(normalizedSizes)
      } else {
        onToast('Failed to load sizing sets', true)
      }
    } catch (error) {
      console.error('Error fetching sizes:', error)
      onToast('Failed to load sizing sets', true)
    } finally {
      setLoading(false)
    }
  }

  const submitSize = async ({
    method,
    id,
    successMessage,
    errorMessage
  }: {
    method: 'POST' | 'PUT'
    id?: string
    successMessage: string
    errorMessage: string
  }) => {
    if (!formName.trim() || !formSizes.trim()) {
      onToast('Please fill in all fields', true)
      return false
    }

    try {
      const sizesArray = formSizes
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      if (sizesArray.length === 0) {
        onToast('Please provide at least one size', true)
        return false
      }

      const payload: Record<string, string | string[] | boolean> = {
        shop,
        name: formName,
        sizes: sizesArray,
        is_default: formIsDefault
      }

      if (method === 'PUT') {
        if (!id) {
          onToast(errorMessage, true)
          return false
        }
        payload.id = id
      }

      const response = await fetch('/api/shop-sizes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        onToast(successMessage)
        resetFormState()
        setEditingId(null)
        setIsCreating(false)
        await fetchSizes()
        return true
      }

      onToast(data.error || errorMessage, true)
      return false
    } catch (error) {
      console.error(errorMessage, error)
      onToast(errorMessage, true)
      return false
    }
  }

  const handleCreate = async () => {
    await submitSize({
      method: 'POST',
      successMessage: 'Sizing set created successfully',
      errorMessage: 'Failed to create sizing set'
    })
  }

  const handleUpdate = async (id: string) => {
    const targetSize = sizes.find((size) => size.id === id)
    const isFallback = targetSize?.source === 'fallback' || !targetSize?.store_id

    await submitSize({
      method: isFallback ? 'POST' : 'PUT',
      id: isFallback ? undefined : id,
      successMessage: 'Sizing set updated successfully',
      errorMessage: 'Failed to update sizing set'
    })
  }

  const handleDelete = async (id: string, isTemplateOverride: boolean = false) => {
    const targetSize = sizes.find((size) => size.id === id)
    const isFallback = targetSize?.source === 'fallback' || !targetSize?.store_id

    if (isFallback) {
      onToast('Default sizing templates cannot be deleted. Create a custom sizing set instead.', true)
      return
    }

    const confirmMessage = isTemplateOverride
      ? 'Are you sure you want to restore the default template? Your custom changes will be lost.'
      : 'Are you sure you want to delete this sizing set?'

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`/api/shop-sizes?shop=${shop}&id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        const successMessage = isTemplateOverride
          ? 'Default template restored successfully'
          : 'Sizing set deleted successfully'
        onToast(successMessage)
        await fetchSizes()
      } else {
        onToast(data.error || 'Failed to delete sizing set', true)
      }
    } catch (error) {
      console.error('Error deleting size:', error)
      onToast('Failed to delete sizing set', true)
    }
  }

  const startEditing = (size: ShopSize) => {
    setEditingId(size.id)
    setFormName(size.name)
    setFormSizes(size.sizes.join(', '))
    setFormIsDefault(size.is_default)
    setIsCreating(false)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setIsCreating(false)
    resetFormState()
  }

  const startCreating = () => {
    setIsCreating(true)
    setEditingId(null)
    resetFormState()
  }

  if (loading) {
    return (
      <Box padding="800">
        <InlineStack align="center" blockAlign="center" gap="400">
          <Spinner size="small" />
          <Text as="p" tone="subdued">Loading sizing sets...</Text>
        </InlineStack>
      </Box>
    )
  }

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">Sizing Sets</Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Create custom sizing options for your products (e.g., XS-XXL, numeric, shoe sizes)
          </Text>
        </BlockStack>

        {!isCreating && !editingId && (
          <Button variant="primary" onClick={startCreating}>
            Add New Set
          </Button>
        )}
      </InlineStack>

      {/* Create Form */}
      {isCreating && (
        <Box background="bg-surface-secondary" padding="400" borderRadius="200">
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">Create New Sizing Set</Text>

            <TextField
              label="Set Name"
              value={formName}
              onChange={setFormName}
              placeholder="e.g., Women's Standard Sizes"
              autoComplete="off"
            />

            <TextField
              label="Sizes (comma-separated)"
              value={formSizes}
              onChange={setFormSizes}
              placeholder="e.g., XS, S, M, L, XL, XXL"
              autoComplete="off"
              helpText="Supports letter sizes (XS-XXL), numeric (0-20), shoe sizes (5-11), or custom text"
            />

            <Checkbox
              label="Set as default sizing set"
              checked={formIsDefault}
              onChange={setFormIsDefault}
            />

            <InlineStack gap="300">
              <Button variant="primary" tone="success" onClick={handleCreate}>
                Create Set
              </Button>
              <Button onClick={cancelEditing}>
                Cancel
              </Button>
            </InlineStack>
          </BlockStack>
        </Box>
      )}

      {/* Sizing Sets List */}
      <BlockStack gap="400">
        {sizes.length === 0 ? (
          <Box background="bg-surface-secondary" padding="800" borderRadius="200">
            <InlineStack align="center">
              <Text as="p" tone="subdued" alignment="center">
                No sizing sets yet. Click "Add New Set" to create your first one.
              </Text>
            </InlineStack>
          </Box>
        ) : (
          sizes.map((size) => {
            const isEditing = editingId === size.id
            const isFallback = size.source === 'fallback' || !size.store_id

            return (
              <Box
                key={size.id}
                background="bg-surface"
                padding="400"
                borderRadius="200"
                borderColor={size.is_default ? "border-info" : "border"}
                borderWidth="025"
              >
                {isEditing ? (
                  // Edit Form
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">Edit Sizing Set</Text>

                    <TextField
                      label="Set Name"
                      value={formName}
                      onChange={setFormName}
                      autoComplete="off"
                    />

                    <TextField
                      label="Sizes (comma-separated)"
                      value={formSizes}
                      onChange={setFormSizes}
                      autoComplete="off"
                    />

                    <Checkbox
                      label="Set as default sizing set"
                      checked={formIsDefault}
                      onChange={setFormIsDefault}
                    />

                    {isFallback && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Saving creates a custom copy for your shop so you can edit the built-in template.
                      </Text>
                    )}

                    <InlineStack gap="300">
                      <Button variant="primary" tone="success" onClick={() => handleUpdate(size.id)}>
                        Save Changes
                      </Button>
                      <Button onClick={cancelEditing}>
                        Cancel
                      </Button>
                    </InlineStack>
                  </BlockStack>
                ) : (
                  // Display Mode
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="start">
                      <BlockStack gap="300">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="h3" variant="headingMd">{size.name}</Text>
                          {size.is_default && (
                            <Badge tone="info">DEFAULT</Badge>
                          )}
                          {isFallback && (
                            <Badge>TEMPLATE</Badge>
                          )}
                        </InlineStack>
                        <InlineStack gap="200" wrap>
                          {size.sizes.map((s, idx) => (
                            <Badge key={idx}>{s}</Badge>
                          ))}
                        </InlineStack>
                      </BlockStack>

                      <InlineStack gap="200">
                        <Button onClick={() => startEditing(size)}>
                          Edit
                        </Button>
                        {!isFallback && (
                          <Button
                            tone={isTemplateOverride(size) ? "caution" : "critical"}
                            onClick={() => handleDelete(size.id, isTemplateOverride(size))}
                          >
                            {isTemplateOverride(size) ? 'Restore Default' : 'Delete'}
                          </Button>
                        )}
                      </InlineStack>
                    </InlineStack>
                  </BlockStack>
                )}
              </Box>
            )
          })
        )}
      </BlockStack>
    </BlockStack>
  )
}
