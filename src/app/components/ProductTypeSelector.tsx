'use client'

import { useState, useEffect } from 'react'
import { Select, Box, InlineStack, TextField } from '@shopify/polaris'
import { authenticatedFetch } from '@/lib/shopify/api-client'

interface ProductTypeSelectorProps {
  value: string
  onChange: (value: string) => void
  shopDomain?: string
}

export function ProductTypeSelector({ value, onChange, shopDomain }: ProductTypeSelectorProps) {
  const [productTypes, setProductTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customType, setCustomType] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  useEffect(() => {
    async function fetchProductTypes() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (shopDomain) {
          params.append('shop', shopDomain)
        }

        const response = await authenticatedFetch(`/api/shopify/product-types?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch product types')
        }

        const data = await response.json()

        if (data.success && data.data?.productTypes) {
          setProductTypes(data.data.productTypes)
        } else {
          setProductTypes([])
        }
      } catch (err) {
        console.error('Error fetching product types:', err)
        setError('Unable to load product types')
        setProductTypes([])
      } finally {
        setLoading(false)
      }
    }

    fetchProductTypes()
  }, [shopDomain])

  // Build options for the select
  const options = [
    { label: 'Select a product type...', value: '' },
    ...productTypes.map((type) => ({ label: type, value: type })),
    { label: '+ Add new type...', value: '__custom__' },
  ]

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === '__custom__') {
      setShowCustomInput(true)
      setCustomType('')
    } else {
      setShowCustomInput(false)
      onChange(selectedValue)
    }
  }

  const handleCustomTypeChange = (newValue: string) => {
    setCustomType(newValue)
    onChange(newValue)
  }

  if (loading) {
    return (
      <Box>
        <Select
          label="Product Type"
          options={[{ label: 'Loading product types...', value: '' }]}
          value=""
          disabled
          helpText="Used to organize your products in Shopify"
        />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <TextField
          label="Product Type"
          value={value}
          onChange={onChange}
          helpText="Enter a product type to organize this product"
          autoComplete="off"
        />
      </Box>
    )
  }

  return (
    <Box>
      {showCustomInput ? (
        <InlineStack gap="400" blockAlign="end">
          <Box minWidth="70%">
            <TextField
              label="Product Type"
              value={customType}
              onChange={handleCustomTypeChange}
              helpText="Enter a new product type"
              autoComplete="off"
              placeholder="e.g., Tops, Dresses, Shoes"
            />
          </Box>
          <Box>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false)
                onChange('')
              }}
              style={{
                padding: '8px 12px',
                background: '#f6f6f7',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </Box>
        </InlineStack>
      ) : (
        <Select
          label="Product Type"
          options={options}
          value={value}
          onChange={handleSelectChange}
          helpText="Choose from existing types or add a new one"
        />
      )}
    </Box>
  )
}
