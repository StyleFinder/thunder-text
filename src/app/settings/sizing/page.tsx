'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface CustomSizing {
  id: string
  store_id: string
  name: string
  sizes: string[]
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

function SizingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shop = searchParams?.get('shop')

  const [sizingOptions, setSizingOptions] = useState<CustomSizing[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalName, setModalName] = useState('')
  const [modalSizes, setModalSizes] = useState('')
  const [modalIsDefault, setModalIsDefault] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)

  useEffect(() => {
    if (shop) {
      fetchSizingOptions()
    }
  }, [shop])

  const fetchSizingOptions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sizing?store_id=${shop}`)
      const data = await response.json()

      if (data.success) {
        setSizingOptions(data.data)
      } else {
        showToast('Failed to load sizing options', true)
      }
    } catch (error) {
      console.error('Error fetching sizing options:', error)
      showToast('Failed to load sizing options', true)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, error = false) => {
    setToast({ message, error })
    setTimeout(() => setToast(null), 3000)
  }

  const openCreateModal = () => {
    setEditingId(null)
    setModalName('')
    setModalSizes('')
    setModalIsDefault(false)
    setShowModal(true)
  }

  const openEditModal = (sizing: CustomSizing) => {
    setEditingId(sizing.id)
    setModalName(sizing.name)
    setModalSizes(sizing.sizes.join(', '))
    setModalIsDefault(sizing.is_default)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setModalName('')
    setModalSizes('')
    setModalIsDefault(false)
  }

  const handleSave = async () => {
    if (!modalName.trim() || !modalSizes.trim()) {
      showToast('Name and sizes are required', true)
      return
    }

    const sizesArray = modalSizes
      .split(',')
      .map(size => size.trim())
      .filter(size => size.length > 0)

    if (sizesArray.length === 0) {
      showToast('Please enter at least one size', true)
      return
    }

    setSavingId(editingId || 'new')
    try {
      const url = '/api/sizing'
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId
        ? { store_id: shop, sizing_id: editingId, name: modalName, sizes: sizesArray, is_default: modalIsDefault }
        : { store_id: shop, name: modalName, sizes: sizesArray, is_default: modalIsDefault }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        await fetchSizingOptions()
        closeModal()
        showToast(editingId ? 'Sizing option updated successfully' : 'Sizing option created successfully')
      } else {
        showToast(data.error || 'Failed to save sizing option', true)
      }
    } catch (error) {
      console.error('Error saving sizing option:', error)
      showToast('Failed to save sizing option', true)
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    setSavingId(id)
    try {
      const response = await fetch(`/api/sizing?store_id=${shop}&sizing_id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        await fetchSizingOptions()
        showToast('Sizing option deleted successfully')
      } else {
        showToast(data.error || 'Failed to delete sizing option', true)
      }
    } catch (error) {
      console.error('Error deleting sizing option:', error)
      showToast('Failed to delete sizing option', true)
    } finally {
      setSavingId(null)
    }
  }

  const handleSetDefault = async (id: string) => {
    const sizing = sizingOptions.find(s => s.id === id)
    if (!sizing) return

    setSavingId(id)
    try {
      const response = await fetch('/api/sizing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          sizing_id: id,
          name: sizing.name,
          sizes: sizing.sizes,
          is_default: true
        })
      })

      const data = await response.json()

      if (data.success) {
        await fetchSizingOptions()
        showToast('Default sizing option updated')
      } else {
        showToast(data.error || 'Failed to set default', true)
      }
    } catch (error) {
      console.error('Error setting default:', error)
      showToast('Failed to set default', true)
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#2563eb', fontSize: '2rem', marginBottom: '1rem' }}>Custom Sizing Options</h1>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ color: '#2563eb', fontSize: '2rem', margin: '0' }}>Custom Sizing Options</h1>
            <p style={{ color: '#6b7280', margin: '0.5rem 0' }}>
              Create and manage size sets for your products
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onClick={openCreateModal}
            >
              + Create New Size Set
            </button>
            <Link href={`/settings?shop=${shop}`}>
              <button
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
                Back to Settings
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Sizing Options List */}
      {sizingOptions.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📏</div>
          <h3 style={{ color: '#1f2937', marginBottom: '0.5rem' }}>No sizing options yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Create your first size set to get started
          </p>
          <button
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '0.95rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onClick={openCreateModal}
          >
            Create Size Set
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {sizingOptions.map((sizing) => (
            <div
              key={sizing.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.5rem',
                opacity: savingId === sizing.id ? 0.5 : 1,
                pointerEvents: savingId === sizing.id ? 'none' : 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ color: '#1f2937', fontSize: '1.2rem', margin: 0 }}>
                      {sizing.name}
                    </h3>
                    {sizing.is_default && (
                      <span style={{
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginTop: '0.75rem'
                  }}>
                    {sizing.sizes.map((size, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  {!sizing.is_default && (
                    <button
                      style={{
                        backgroundColor: 'white',
                        color: '#3b82f6',
                        border: '1px solid #3b82f6',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      onClick={() => handleSetDefault(sizing.id)}
                      title="Set as default"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    style={{
                      backgroundColor: 'white',
                      color: '#6b7280',
                      border: '1px solid #d1d5db',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => openEditModal(sizing)}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    style={{
                      backgroundColor: 'white',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleDelete(sizing.id, sizing.name)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>
              {editingId ? 'Edit Size Set' : 'Create New Size Set'}
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                Name *
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                placeholder="e.g., Standard Sizes, Extended Range"
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                Sizes (comma-separated) *
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                placeholder="e.g., S, M, L, XL or 2, 4, 6, 8"
                value={modalSizes}
                onChange={(e) => setModalSizes(e.target.value)}
              />
              <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Sizes will be automatically capitalized when saved
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={modalIsDefault}
                  onChange={(e) => setModalIsDefault(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: '#374151', fontSize: '0.9rem' }}>
                  Set as default size set
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                onClick={closeModal}
                disabled={!!savingId}
              >
                Cancel
              </button>
              <button
                style={{
                  backgroundColor: savingId ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: savingId ? 'not-allowed' : 'pointer'
                }}
                onClick={handleSave}
                disabled={!!savingId}
              >
                {savingId ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.error ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.error ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '8px',
          padding: '1rem',
          maxWidth: '400px',
          zIndex: 1001,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '16px' }}>
              {toast.error ? '❌' : '✅'}
            </span>
            <span style={{
              color: toast.error ? '#dc2626' : '#059669',
              fontSize: '0.9rem'
            }}>
              {toast.message}
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function SizingPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading...</p>
      </div>
    }>
      <SizingPageContent />
    </Suspense>
  )
}
