'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Edit, Trash2, RotateCcw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

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
      logger.error('Error fetching sizes:', error as Error, { component: 'ShopSizes' })
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
      logger.error(errorMessage, error as Error, { component: 'ShopSizes' })
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
      logger.error('Error deleting size:', error as Error, { component: 'ShopSizes' })
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-smart-blue-500 mr-3" />
        <p className="text-muted-foreground">Loading sizing sets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-oxford-navy">Sizing Sets</h2>
          <p className="text-sm text-muted-foreground">
            Create custom sizing options for your products (e.g., XS-XXL, numeric, shoe sizes)
          </p>
        </div>

        {!isCreating && !editingId && (
          <Button onClick={startCreating} className="bg-smart-blue-500 hover:bg-smart-blue-600">
            <Plus className="mr-2 h-4 w-4" />
            Add New Set
          </Button>
        )}
      </div>

      {/* Create Form */}
      {isCreating && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Create New Sizing Set</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="name" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Set Name</label>
                <input
                  id="name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Women's Standard Sizes"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0066cc'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="sizes" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Sizes (comma-separated)</label>
                <input
                  id="sizes"
                  type="text"
                  value={formSizes}
                  onChange={(e) => setFormSizes(e.target.value)}
                  placeholder="e.g., XS, S, M, L, XL, XXL"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0066cc'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  Supports letter sizes (XS-XXL), numeric (0-20), shoe sizes (5-11), or custom text
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#0066cc'
                  }}
                />
                <label htmlFor="isDefault" style={{ fontSize: '14px', color: '#003366', cursor: 'pointer', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  Set as default sizing set
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={handleCreate}
                  style={{
                    background: '#0066cc',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0052a3'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0066cc'
                  }}
                >
                  Create Set
                </button>
                <button
                  onClick={cancelEditing}
                  style={{
                    background: 'transparent',
                    color: '#003366',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sizing Sets List */}
      <div className="space-y-4">
        {sizes.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No sizing sets yet. Click "Add New Set" to create your first one.
              </p>
            </CardContent>
          </Card>
        ) : (
          sizes.map((size) => {
            const isEditing = editingId === size.id
            const isFallback = size.source === 'fallback' || !size.store_id

            return (
              <Card
                key={size.id}
                className={size.is_default ? 'border-smart-blue-300' : ''}
              >
                {isEditing ? (
                  // Edit Form
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#003366', marginBottom: '24px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Edit Sizing Set</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor={`edit-name-${size.id}`} style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Set Name</label>
                        <input
                          id={`edit-name-${size.id}`}
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          autoComplete="off"
                          style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'border-color 0.15s ease'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0066cc'
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor={`edit-sizes-${size.id}`} style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Sizes (comma-separated)</label>
                        <input
                          id={`edit-sizes-${size.id}`}
                          type="text"
                          value={formSizes}
                          onChange={(e) => setFormSizes(e.target.value)}
                          autoComplete="off"
                          style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'border-color 0.15s ease'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0066cc'
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id={`edit-default-${size.id}`}
                          checked={formIsDefault}
                          onChange={(e) => setFormIsDefault(e.target.checked)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#0066cc'
                          }}
                        />
                        <label htmlFor={`edit-default-${size.id}`} style={{ fontSize: '14px', color: '#003366', cursor: 'pointer', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Set as default sizing set
                        </label>
                      </div>

                      {isFallback && (
                        <div style={{ background: '#f0f7ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                          <p style={{ fontSize: '14px', color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                            Saving creates a custom copy for your shop so you can edit the built-in template.
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                          onClick={() => handleUpdate(size.id)}
                          style={{
                            background: '#0066cc',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            fontSize: '14px',
                            fontWeight: 600,
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#0052a3'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#0066cc'
                          }}
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEditing}
                          style={{
                            background: 'transparent',
                            color: '#003366',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            fontSize: '14px',
                            fontWeight: 600,
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f9fafb'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-oxford-navy">{size.name}</h3>
                          {size.is_default && (
                            <Badge variant="default" className="bg-smart-blue-500">DEFAULT</Badge>
                          )}
                          {isFallback && (
                            <Badge variant="secondary">TEMPLATE</Badge>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {size.sizes.map((s, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-block',
                                padding: '6px 12px',
                                background: '#f0f7ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#003366',
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => startEditing(size)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!isFallback && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(size.id, isTemplateOverride(size))}
                          >
                            {isTemplateOverride(size) ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
