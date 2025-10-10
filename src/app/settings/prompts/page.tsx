'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Box,
  InlineStack,
  BlockStack,
  TextField,
  Banner,
  Spinner,
  Modal,
  Select,
  Toast,
  Frame
} from '@shopify/polaris'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

interface SystemPrompt {
  id: string
  name: string
  content: string
  is_default: boolean
  updated_at: string
}

interface Template {
  id: string
  name: string
  content: string
  is_default: boolean
  updated_at: string
  store_id: string
}

function PromptsSettingsContent() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop') || 'test-store'

  // State
  const [systemPrompt, setSystemPrompt] = useState<SystemPrompt | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // System prompt editing
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false)
  const [systemPromptContent, setSystemPromptContent] = useState('')

  // Template selection and editing
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [editingTemplateName, setEditingTemplateName] = useState('')
  const [editingTemplateContent, setEditingTemplateContent] = useState('')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')

  // Get selected template
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  // Load prompts
  useEffect(() => {
    async function loadPrompts() {
      try {
        setLoading(true)
        const response = await fetch(`/api/prompts?store_id=${shop}`)

        if (!response.ok) {
          throw new Error('Failed to load prompts')
        }

        const data = await response.json()
        setSystemPrompt(data.system_prompt)
        setTemplates(data.category_templates || [])

        if (data.system_prompt) {
          setSystemPromptContent(data.system_prompt.content)
        }

        // Auto-select first template or default template
        if (data.category_templates && data.category_templates.length > 0) {
          const defaultTemplate = data.category_templates.find((t: Template) => t.is_default)
          const firstTemplate = defaultTemplate || data.category_templates[0]
          setSelectedTemplateId(firstTemplate.id)
        }
      } catch (err) {
        console.error('Error loading prompts:', err)
        setError('Failed to load prompts')
      } finally {
        setLoading(false)
      }
    }

    loadPrompts()
  }, [shop])

  // Update editing fields when template selection changes
  useEffect(() => {
    if (selectedTemplate && !editingTemplate) {
      setEditingTemplateName(selectedTemplate.name)
      setEditingTemplateContent(selectedTemplate.content)
    }
  }, [selectedTemplateId, selectedTemplate, editingTemplate])

  // Save system prompt
  const handleSaveSystemPrompt = async () => {
    if (!systemPromptContent.trim()) return

    try {
      setSaving(true)
      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          type: 'system_prompt',
          content: systemPromptContent,
          name: 'Custom System Prompt'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save system prompt')
      }

      const result = await response.json()
      setSystemPrompt(result.data)
      setEditingSystemPrompt(false)
      setSuccess('System prompt saved successfully!')

    } catch (err) {
      console.error('Error saving system prompt:', err)
      setError('Failed to save system prompt')
    } finally {
      setSaving(false)
    }
  }

  // Save template
  const handleSaveTemplate = async () => {
    if (!selectedTemplateId || !editingTemplateName.trim() || !editingTemplateContent.trim()) return

    try {
      setSaving(true)
      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          type: 'category_template',
          template_id: selectedTemplateId,
          name: editingTemplateName,
          content: editingTemplateContent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save template')
      }

      const result = await response.json()
      setTemplates(prev =>
        prev.map(t => t.id === selectedTemplateId ? result.data : t)
      )

      setEditingTemplate(false)
      setSuccess('Template saved successfully!')

    } catch (err) {
      console.error('Error saving template:', err)
      setError('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Create new template
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      setError('Please provide both a name and content for the template')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          type: 'category_template',
          name: newTemplateName,
          content: newTemplateContent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create template')
      }

      const result = await response.json()
      setTemplates(prev => [...prev, result.data])
      setSelectedTemplateId(result.data.id)
      setShowCreateModal(false)
      setNewTemplateName('')
      setNewTemplateContent('')
      setSuccess('Template created successfully!')

    } catch (err) {
      console.error('Error creating template:', err)
      setError('Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return

    try {
      setSaving(true)
      const response = await fetch('/api/prompts/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          template_id: selectedTemplateId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      const remainingTemplates = templates.filter(t => t.id !== selectedTemplateId)
      setTemplates(remainingTemplates)

      // Select first remaining template
      if (remainingTemplates.length > 0) {
        setSelectedTemplateId(remainingTemplates[0].id)
      } else {
        setSelectedTemplateId('')
      }

      setShowDeleteModal(false)
      setSuccess('Template deleted successfully!')

    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Failed to delete template')
    } finally {
      setSaving(false)
    }
  }

  // Set default template
  const handleSetDefault = async () => {
    if (!selectedTemplateId) return

    try {
      setSaving(true)
      const response = await fetch('/api/prompts/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          template_id: selectedTemplateId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to set as default')
      }

      setTemplates(prev =>
        prev.map(t => ({
          ...t,
          is_default: t.id === selectedTemplateId
        }))
      )

      setSuccess('Default template updated!')

    } catch (err) {
      console.error('Error setting default:', err)
      setError('Failed to set template as default')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Page title="Prompt Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="600">
                <InlineStack align="center">
                  <Spinner size="large" />
                  <Text variant="bodyMd">Loading prompts...</Text>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  const handleResetSystemPrompt = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/prompts/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          type: 'system_prompt'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reset system prompt')
      }

      const result = await response.json()
      setSystemPrompt(result.data)
      setSystemPromptContent(result.data.content)
      setEditingSystemPrompt(false)
      setSuccess('System prompt reset to default!')

    } catch (err) {
      console.error('Error resetting system prompt:', err)
      setError('Failed to reset system prompt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Frame>
      <Page title="Prompt Settings">
        {error && (
          <Banner title="Error" tone="critical" onDismiss={() => setError(null)}>
            <p>{error}</p>
          </Banner>
        )}

        {success && (
          <Toast content={success} onDismiss={() => setSuccess(null)} />
        )}

        <Layout>
          {/* Templates Section - MOVED TO TOP */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Box>
                    <Text as="h2" variant="headingMd">Product Description Templates</Text>
                    <Text variant="bodySm" tone="subdued">
                      Create and manage custom templates for different product types
                    </Text>
                  </Box>
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateModal(true)}
                    size="large"
                  >
                    Create New Template
                  </Button>
                </InlineStack>

                {templates.length === 0 ? (
                  <Box padding="400">
                    <Text variant="bodyMd" tone="subdued">
                      No templates created yet. Click "Create New Template" to get started.
                    </Text>
                  </Box>
                ) : (
                  <BlockStack gap="400">
                    {/* Template Dropdown Selector */}
                    <Select
                      label="Select Template to Edit"
                      options={templates.map(t => ({
                        label: `${t.name}${t.is_default ? ' (Default)' : ''}`,
                        value: t.id
                      }))}
                      value={selectedTemplateId}
                      onChange={setSelectedTemplateId}
                    />

                    {selectedTemplate && (
                      <BlockStack gap="300">
                        {/* Template Name */}
                        <TextField
                          label="Template Name"
                          value={editingTemplateName}
                          onChange={setEditingTemplateName}
                          autoComplete="off"
                          disabled={!editingTemplate}
                        />

                        {/* Template Content */}
                        <TextField
                          label="Template Content"
                          value={editingTemplateContent}
                          onChange={setEditingTemplateContent}
                          multiline={12}
                          autoComplete="off"
                          disabled={!editingTemplate}
                        />

                        {/* Action Buttons */}
                        <InlineStack gap="200" align="end">
                          {editingTemplate ? (
                            <>
                              <Button
                                onClick={() => {
                                  setEditingTemplate(false)
                                  setEditingTemplateName(selectedTemplate.name)
                                  setEditingTemplateContent(selectedTemplate.content)
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                onClick={handleSaveTemplate}
                                loading={saving}
                              >
                                Save Template
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="tertiary"
                                tone="critical"
                                onClick={() => setShowDeleteModal(true)}
                              >
                                Delete
                              </Button>
                              {!selectedTemplate.is_default && (
                                <Button
                                  variant="tertiary"
                                  onClick={handleSetDefault}
                                  loading={saving}
                                >
                                  Set as Default
                                </Button>
                              )}
                              <Button
                                variant="primary"
                                onClick={() => setEditingTemplate(true)}
                              >
                                Edit
                              </Button>
                            </>
                          )}
                        </InlineStack>
                      </BlockStack>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* System Prompt Section - MOVED TO BOTTOM */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Box>
                    <Text as="h2" variant="headingMd">Master System Prompt</Text>
                    <Text variant="bodySm" tone="subdued">
                      Universal copywriting principles applied to all product descriptions
                    </Text>
                  </Box>
                  <InlineStack gap="200">
                    {editingSystemPrompt && (
                      <Button
                        onClick={handleResetSystemPrompt}
                        loading={saving}
                      >
                        Restore to Default
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (editingSystemPrompt) {
                          handleSaveSystemPrompt()
                        } else {
                          setEditingSystemPrompt(true)
                        }
                      }}
                      loading={saving && editingSystemPrompt}
                    >
                      {editingSystemPrompt ? 'Save' : 'Edit'}
                    </Button>
                  </InlineStack>
                </InlineStack>

                <TextField
                  label=""
                  value={systemPromptContent}
                  onChange={setSystemPromptContent}
                  multiline={10}
                  autoComplete="off"
                  disabled={!editingSystemPrompt}
                />

                {editingSystemPrompt && (
                  <InlineStack align="end">
                    <Button onClick={() => {
                      setEditingSystemPrompt(false)
                      setSystemPromptContent(systemPrompt?.content || '')
                    }}>
                      Cancel
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Create Template Modal */}
        <Modal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setNewTemplateName('')
            setNewTemplateContent('')
          }}
          title="Create New Template"
          primaryAction={{
            content: 'Create Template',
            onAction: handleCreateTemplate,
            loading: saving
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => {
              setShowCreateModal(false)
              setNewTemplateName('')
              setNewTemplateContent('')
            }
          }]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Template Name"
                value={newTemplateName}
                onChange={setNewTemplateName}
                autoComplete="off"
                placeholder="e.g., Summer Dresses, Casual Jewelry, Formal Wear"
                helpText="Give your template a descriptive name"
              />
              <TextField
                label="Template Content"
                value={newTemplateContent}
                onChange={setNewTemplateContent}
                multiline={8}
                autoComplete="off"
                placeholder="Enter your template instructions here..."
                helpText="Define the structure and style for this type of product"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Template"
          primaryAction={{
            content: 'Delete',
            onAction: handleDeleteTemplate,
            loading: saving,
            destructive: true
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => setShowDeleteModal(false)
          }]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>
      </Page>
    </Frame>
  )
}

export default function PromptsSettingsPage() {
  return (
    <Suspense fallback={
      <Page title="Prompt Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="600">
                <InlineStack align="center">
                  <Spinner size="large" />
                  <Text variant="bodyMd">Loading...</Text>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    }>
      <PromptsSettingsContent />
    </Suspense>
  )
}
