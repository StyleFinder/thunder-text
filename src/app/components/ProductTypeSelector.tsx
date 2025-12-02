'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/lib/shopify/api-client'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'

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

        const url = `/api/shopify/product-types?${params.toString()}`

        const response = await authenticatedFetch(url)


        if (!response.ok) {
          let errorMessage = 'Failed to fetch product types'
          try {
            const errorData = await response.json()
            console.warn('⚠️ ProductTypeSelector: API returned error (non-critical):', errorData)
            errorMessage = errorData.error || errorMessage
          } catch (e) {
            console.warn('⚠️ ProductTypeSelector: Could not parse error response (non-critical)')
          }
          console.warn('⚠️ ProductTypeSelector:', errorMessage, '- Falling back to manual entry')
          setProductTypes([])
          setError(null)
          setLoading(false)
          return
        }

        const data = await response.json()

        if (data.success && data.data?.productTypes) {
          setProductTypes(data.data.productTypes)
        } else {
          setProductTypes([])
        }
      } catch (err) {
        logger.error('❌ ProductTypeSelector: Error:', err as Error, { component: 'ProductTypeSelector' })
        // Don't show error for product types - just fall back to manual entry
        // This is not a critical failure, users can still type manually
        setProductTypes([])
        setError(null) // Clear error to allow manual entry
      } finally {
        setLoading(false)
      }
    }

    fetchProductTypes()
  }, [shopDomain])

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === '__custom__') {
      setShowCustomInput(true)
      setCustomType('')
    } else {
      setShowCustomInput(false)
      onChange(selectedValue)
    }
  }

  const handleCustomTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setCustomType(newValue)
    onChange(newValue)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-gray-900">Product Type</Label>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading product types...
        </div>
        <p className="text-sm text-gray-500">
          Used to organize your products in Shopify
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label htmlFor="product-type-manual" className="text-gray-900">Product Type</Label>
        <Input
          id="product-type-manual"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter product type"
          autoComplete="off"
        />
        <p className="text-sm text-red-600">
          Error loading types: {error}. Enter manually instead.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {showCustomInput ? (
        <>
          <Label htmlFor="custom-product-type" className="text-gray-900">Product Type</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="custom-product-type"
                value={customType}
                onChange={handleCustomTypeChange}
                placeholder="e.g., Tops, Dresses, Shoes"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCustomInput(false)
                onChange('')
              }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-sm text-gray-500">Enter a new product type</p>
        </>
      ) : (
        <>
          <Label htmlFor="product-type" className="text-gray-900">Product Type</Label>
          <Select value={value} onValueChange={handleSelectChange}>
            <SelectTrigger id="product-type">
              <SelectValue placeholder="Select a product type..." />
            </SelectTrigger>
            <SelectContent>
              {productTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">+ Add new type...</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            Choose from existing types or add a new one
          </p>
        </>
      )}
    </div>
  )
}
