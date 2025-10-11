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

        console.log('🔍 ProductTypeSelector: Fetching product types for shop:', shopDomain)

        const params = new URLSearchParams()
        if (shopDomain) {
          params.append('shop', shopDomain)
        }

        const url = `/api/shopify/product-types?${params.toString()}`
        console.log('🔍 ProductTypeSelector: Calling URL:', url)

        const response = await authenticatedFetch(url)

        console.log('📥 ProductTypeSelector: Response status:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ ProductTypeSelector: API error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch product types')
        }

        const data = await response.json()
        console.log('✅ ProductTypeSelector: Data received:', data)

        if (data.success && data.data?.productTypes) {
          setProductTypes(data.data.productTypes)
          console.log(`✅ ProductTypeSelector: Loaded ${data.data.productTypes.length} product types`)
        } else {
          setProductTypes([])
          console.log('⚠️ ProductTypeSelector: No product types found, showing dropdown anyway')
        }
      } catch (err) {
        console.error('❌ ProductTypeSelector: Error:', err)
        setError(`Unable to load product types: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
          helpText={`Error loading types: ${error}. Enter manually instead.`}
          autoComplete="off"
          error={error}
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
