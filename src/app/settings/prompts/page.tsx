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
  Toast,
  Frame,
  DataTable
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

  // Edit states
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false)
  const [systemPromptContent, setSystemPromptContent] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingTemplateName, setEditingTemplateName] = useState('')
  const [editingTemplateContent, setEditingTemplateContent] = useState('')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')

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
      } catch (err) {
        console.error('Error loading prompts:', err)
        setError('Failed to load prompts')
      } finally {
        setLoading(false)
      }
    }

    loadPrompts()
  }, [shop])

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

  // Save edited template
  const handleSaveTemplate = async () => {
    if (!editingTemplateId || !editingTemplateName.trim() || !editingTemplateContent.trim()) return

    try {
      setSaving(true)
      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          type: 'category_template',
          template_id: editingTemplateId,
          name: editingTemplateName,
          content: editingTemplateContent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save template')
      }

      const result = await response.json()
      setTemplates(prev =>
        prev.map(t => t.id === editingTemplateId ? result.data : t)
      )

      setEditingTemplateId(null)
      setEditingTemplateName('')
      setEditingTemplateContent('')
      setSuccess('Template saved successfully!')

    } catch (err) {
      console.error('Error saving template:', err)
      setError('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return

    try {
      setSaving(true)
      const response = await fetch('/api/prompts/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          template_id: deleteTemplateId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      setTemplates(prev => prev.filter(t => t.id !== deleteTemplateId))
      setShowDeleteModal(false)
      setDeleteTemplateId(null)
      setSuccess('Template deleted successfully!')

    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Failed to delete template')
    } finally {
      setSaving(false)
    }
  }

  // Set default template
  const handleSetDefault = async (templateId: string) => {
    try {
      setSaving(true)
      const response = await fetch('/api/prompts/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          template_id: templateId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to set as default')
      }

      setTemplates(prev =>
        prev.map(t => ({
          ...t,
          is_default: t.id === templateId
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
          {/* System Prompt Section */}
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

                {editingSystemPrompt ? (
                  <TextField
                    label="System Prompt Content"
                    value={systemPromptContent}
                    onChange={setSystemPromptContent}
                    multiline={12}
                    autoComplete="off"
                  />
                ) : (
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <Text variant="bodySm" as="pre" style={{ whiteSpace: 'pre-wrap' }}>
                      {systemPrompt?.content || 'No system prompt configured'}
                    </Text>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Templates Section */}
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
                  <BlockStack gap="300">
                    {templates.map(template => (
                      <Card key={template.id}>
                        <BlockStack gap="300">
                          <InlineStack align="space-between">
                            <Box>
                              <InlineStack gap="200">
                                <Text as="h3" variant="headingSm">{template.name}</Text>
                                {template.is_default && (
                                  <Box
                                    padding="100"
                                    paddingInlineStart="200"
                                    paddingInlineEnd="200"
                                    background="bg-fill-success"
                                    borderRadius="100"
                                  >
                                    <Text variant="bodySm" tone="success">Default</Text>
                                  </Box>
                                )}
                              </InlineStack>
                              <Text variant="bodySm" tone="subdued">
                                Last updated: {new Date(template.updated_at).toLocaleDateString()}
                              </Text>
                            </Box>
                            <InlineStack gap="200">
                              {!template.is_default && (
                                <Button
                                  variant="tertiary"
                                  onClick={() => handleSetDefault(template.id)}
                                  loading={saving}
                                >
                                  Set as Default
                                </Button>
                              )}
                              <Button
                                variant="tertiary"
                                onClick={() => {
                                  if (editingTemplateId === template.id) {
                                    handleSaveTemplate()
                                  } else {
                                    setEditingTemplateId(template.id)
                                    setEditingTemplateName(template.name)
                                    setEditingTemplateContent(template.content)
                                  }
                                }}
                                loading={saving && editingTemplateId === template.id}
                              >
                                {editingTemplateId === template.id ? 'Save' : 'Edit'}
                              </Button>
                              <Button
                                variant="tertiary"
                                tone="critical"
                                onClick={() => {
                                  setDeleteTemplateId(template.id)
                                  setShowDeleteModal(true)
                                }}
                              >
                                Delete
                              </Button>
                            </InlineStack>
                          </InlineStack>

                          {editingTemplateId === template.id ? (
                            <BlockStack gap="300">
                              <TextField
                                label="Template Name"
                                value={editingTemplateName}
                                onChange={setEditingTemplateName}
                                autoComplete="off"
                              />
                              <TextField
                                label="Template Content"
                                value={editingTemplateContent}
                                onChange={setEditingTemplateContent}
                                multiline={8}
                                autoComplete="off"
                              />
                            </BlockStack>
                          ) : (
                            <Box
                              padding="300"
                              background="bg-surface-secondary"
                              borderRadius="200"
                            >
                              <Text variant="bodySm" as="pre" style={{ whiteSpace: 'pre-wrap' }}>
                                {template.content}
                              </Text>
                            </Box>
                          )}
                        </BlockStack>
                      </Card>
                    ))}
                  </BlockStack>
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
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteTemplateId(null)
          }}
          title="Delete Template"
          primaryAction={{
            content: 'Delete',
            onAction: handleDeleteTemplate,
            loading: saving,
            destructive: true
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => {
              setShowDeleteModal(false)
              setDeleteTemplateId(null)
            }
          }]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to delete this template? This action cannot be undone.
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
