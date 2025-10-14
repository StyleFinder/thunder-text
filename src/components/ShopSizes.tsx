'use client'

import { useState, useEffect } from 'react'

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

  const normalizeSize = (raw: any): ShopSize => {
    const id = raw?.id ? String(raw.id) : ''
    const storeId = raw?.store_id ?? null
    const isFallback =
      raw?.source === 'fallback' ||
      !storeId ||
      (typeof id === 'string' && id.startsWith('fallback-'))

    return {
      id,
      store_id: storeId,
      name: raw?.name ?? '',
      sizes: Array.isArray(raw?.sizes) ? raw.sizes : [],
      is_default: Boolean(raw?.is_default),
      is_active: raw?.is_active ?? true,
      created_at: raw?.created_at ?? null,
      updated_at: raw?.updated_at ?? null,
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
          ? data.data.map((size: any) => normalizeSize(size))
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

      const payload: Record<string, any> = {
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
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading sizing sets...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#1f2937', fontSize: '1.3rem', margin: 0, marginBottom: '0.5rem' }}>
            Sizing Sets
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
            Create custom sizing options for your products (e.g., XS-XXL, numeric, shoe sizes)
          </p>
        </div>

        {!isCreating && !editingId && (
          <button
            onClick={startCreating}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>+</span>
            Add New Set
          </button>
        )}
      </div>

      {/* Create Form */}
      {isCreating && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ color: '#1f2937', fontSize: '1.1rem', marginTop: 0, marginBottom: '1rem' }}>
            Create New Sizing Set
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#374151', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>
              Set Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Women's Standard Sizes"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#374151', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>
              Sizes (comma-separated)
            </label>
            <input
              type="text"
              value={formSizes}
              onChange={(e) => setFormSizes(e.target.value)}
              placeholder="e.g., XS, S, M, L, XL, XXL"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem'
              }}
            />
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
              Supports letter sizes (XS-XXL), numeric (0-20), shoe sizes (5-11), or custom text
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                style={{ marginRight: '0.5rem', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ color: '#374151', fontSize: '0.9rem' }}>
                Set as default sizing set
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleCreate}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Create Set
            </button>
            <button
              onClick={cancelEditing}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sizing Sets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sizes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px dashed #d1d5db'
          }}>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>
              No sizing sets yet. Click "Add New Set" to create your first one.
            </p>
          </div>
        ) : (
          sizes.map((size) => {
            const isEditing = editingId === size.id
            const isFallback = size.source === 'fallback' || !size.store_id

            return (
              <div
                key={size.id}
                style={{
                  backgroundColor: 'white',
                  border: `2px solid ${size.is_default ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  padding: '1.25rem'
                }}
              >
                {isEditing ? (
                  // Edit Form
                  <div>
                    <h3 style={{ color: '#1f2937', fontSize: '1.1rem', marginTop: 0, marginBottom: '1rem' }}>
                      Edit Sizing Set
                    </h3>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', color: '#374151', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Set Name
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.95rem'
                        }}
                      />
                  </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', color: '#374151', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Sizes (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formSizes}
                        onChange={(e) => setFormSizes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.95rem'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formIsDefault}
                          onChange={(e) => setFormIsDefault(e.target.checked)}
                          style={{ marginRight: '0.5rem', width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ color: '#374151', fontSize: '0.9rem' }}>
                          Set as default sizing set
                        </span>
                      </label>
                    </div>

                    {isFallback && (
                      <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 0, marginBottom: '1rem' }}>
                        Saving creates a custom copy for your shop so you can edit the built-in template.
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleUpdate(size.id)}
                        style={{
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ color: '#1f2937', fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                            {size.name}
                          </h3>
                          {size.is_default && (
                            <span style={{
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              DEFAULT
                            </span>
                          )}
                          {isFallback && (
                            <span style={{
                              backgroundColor: '#f3f4f6',
                              color: '#4b5563',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: '1px solid #e5e7eb'
                            }}>
                              TEMPLATE
                            </span>
                          )}
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginTop: '0.75rem'
                        }}>
                          {size.sizes.map((s, idx) => (
                            <span
                              key={idx}
                              style={{
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                border: '1px solid #e5e7eb'
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => startEditing(size)}
                          style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Edit
                        </button>
                        {!isFallback && (
                          <button
                            onClick={() => handleDelete(size.id, isTemplateOverride(size))}
                            style={{
                              backgroundColor: isTemplateOverride(size) ? '#fef3c7' : '#fef2f2',
                              color: isTemplateOverride(size) ? '#92400e' : '#dc2626',
                              border: `1px solid ${isTemplateOverride(size) ? '#fde68a' : '#fecaca'}`,
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            {isTemplateOverride(size) ? 'Restore Default' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
