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
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/prompts'

interface SystemPrompt {
  id: string
  name: string
  content: string
  is_default: boolean
  updated_at: string
}

interface CategoryTemplate {
  id: string
  name: string
  category: string
  content: string
  is_default: boolean
  updated_at: string
  store_id: string
}

function PromptsSettingsContent() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop') || 'test-store'
  
  console.log('🏪 PromptsSettingsContent initialized with shop:', shop)
  
  // State
  const [systemPrompt, setSystemPrompt] = useState<SystemPrompt | null>(null)
  const [categoryTemplates, setCategoryTemplates] = useState<CategoryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Edit states
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false)
  const [systemPromptContent, setSystemPromptContent] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [templateContent, setTemplateContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('general')
  
  // Modal states
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetType, setResetType] = useState<'system' | 'template' | null>(null)
  const [resetCategory, setResetCategory] = useState<ProductCategory | null>(null)

  // Load prompts
  useEffect(() => {
    async function loadPrompts() {
      try {
        console.log('🔄 Starting to load prompts for shop:', shop)
        setLoading(true)
        const response = await fetch(`/api/prompts?store_id=${shop}`)
        
        console.log('📡 API response status:', response.status)
        if (!response.ok) {
          throw new Error('Failed to load prompts')
        }

        const data = await response.json()
        console.log('📦 Data received:', {
          hasSystemPrompt: !!data.system_prompt,
          systemPromptName: data.system_prompt?.name,
          categoryTemplatesCount: data.category_templates?.length || 0
        })
        
        setSystemPrompt(data.system_prompt)
        setCategoryTemplates(data.category_templates || [])
        
        if (data.system_prompt) {
          setSystemPromptContent(data.system_prompt.content)
        }
        
        console.log('✅ Prompts loaded successfully, setting loading to false')
      } catch (err) {
        console.error('❌ Error loading prompts:', err)
        setError('Failed to load prompts')
      } finally {
        console.log('🏁 Setting loading to false in finally block')
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

  // Save category template
  const handleSaveTemplate = async (category: ProductCategory, content: string) => {
    if (!content.trim()) return
    
    try {
      setSaving(true)
      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          type: 'category_template',
          category,
          content,
          name: `Custom ${PRODUCT_CATEGORIES.find(c => c.value === category)?.label} Template`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save template')
      }

      const result = await response.json()
      
      // Update local state
      setCategoryTemplates(prev => 
        prev.map(t => t.category === category ? result.data : t)
      )
      
      setEditingTemplate(null)
      setTemplateContent('')
      setSuccess('Template saved successfully!')
      
    } catch (err) {
      console.error('Error saving template:', err)
      setError('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Reset prompt/template
  const handleReset = async () => {
    if (!resetType) return
    
    try {
      setSaving(true)
      const response = await fetch('/api/prompts/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: shop,
          type: resetType === 'system' ? 'system_prompt' : 'category_template',
          category: resetCategory
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reset')
      }

      const result = await response.json()
      
      if (resetType === 'system') {
        setSystemPrompt(result.data)
        setSystemPromptContent(result.data.content)
      } else if (resetCategory) {
        setCategoryTemplates(prev => 
          prev.map(t => t.category === resetCategory ? result.data : t)
        )
      }
      
      setShowResetModal(false)
      setResetType(null)
      setResetCategory(null)
      setSuccess('Reset to defaults successfully!')
      
    } catch (err) {
      console.error('Error resetting:', err)
      setError('Failed to reset to defaults')
    } finally {
      setSaving(false)
    }
  }

  // Handle default template change
  const handleDefaultTemplateChange = async (category: string) => {
    if (!category) return
    
    // Get the actual store_id from the templates (they all have the same store_id)
    const storeId = categoryTemplates.length > 0 ? categoryTemplates[0].store_id : shop
    
    try {
      setSaving(true)
      const response = await fetch('/api/prompts/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          category
        })
      })

      if (!response.ok) {
        throw new Error('Failed to set as default')
      }

      const result = await response.json()
      
      // Update local state - mark this template as default and others as not default
      setCategoryTemplates(prev => 
        prev.map(t => ({ 
          ...t, 
          is_default: t.category === category 
        }))
      )
      
      setSuccess(`${PRODUCT_CATEGORIES.find(c => c.value === category)?.label} template set as default!`)
      
    } catch (err) {
      console.error('Error setting as default:', err)
      setError('Failed to set template as default')
    } finally {
      setSaving(false)
    }
  }

  // Get template for category
  const getTemplate = (category: ProductCategory) => 
    categoryTemplates.find(t => t.category === category)

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
          {/* Default Template Configuration Section */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Box>
                    <Text as="h2" variant="headingMd">Default Template Settings</Text>
                    <Text variant="bodySm" tone="subdued">
                      Configure which template is automatically used for new products
                    </Text>
                  </Box>
                </InlineStack>
                
                <Box
                  padding="400"
                  background="bg-surface-accent"
                  borderRadius="200"
                  borderWidth="0165"
                  borderColor="border-accent"
                >
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingSm" tone="text-accent-secondary">
                        Global Default Template
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        Applied to all new products
                      </Text>
                    </InlineStack>
                    
                    <Select
                      label=""
                      options={[
                        { label: 'None', value: '' },
                        ...PRODUCT_CATEGORIES.map(cat => ({
                          label: cat.label,
                          value: cat.value
                        }))
                      ]}
                      value={categoryTemplates.find(t => t.is_default)?.category || ''}
                      onChange={handleDefaultTemplateChange}
                      helpText="This template will be used automatically when creating new product descriptions"
                    />
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Category Templates Management Section */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Template Editor</Text>
                <Text variant="bodySm" tone="subdued">
                  Edit and customize templates for different product categories
                </Text>
                
                <Select
                  label="Select Category to Edit"
                  options={PRODUCT_CATEGORIES.map(cat => ({
                    label: cat.label,
                    value: cat.value
                  }))}
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory(value as ProductCategory)}
                  helpText="Choose which category template you want to view or modify"
                />
                
                {(() => {
                  const template = getTemplate(selectedCategory)
                  const categoryLabel = PRODUCT_CATEGORIES.find(c => c.value === selectedCategory)?.label
                  
                  return (
                    <Card>
                      <BlockStack gap="400">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">{categoryLabel} Template</Text>
                          <InlineStack gap="200">
                            <Button 
                              variant="tertiary"
                              onClick={() => {
                                setResetType('template')
                                setResetCategory(selectedCategory)
                                setShowResetModal(true)
                              }}
                            >
                              Reset to Default
                            </Button>
                            <Button 
                              variant="primary"
                              onClick={() => {
                                if (editingTemplate === selectedCategory) {
                                  setEditingTemplate(null)
                                  setTemplateContent('')
                                } else {
                                  setEditingTemplate(selectedCategory)
                                  setTemplateContent(template?.content || '')
                                }
                              }}
                            >
                              {editingTemplate === selectedCategory ? 'Cancel' : 'Edit'}
                            </Button>
                          </InlineStack>
                        </InlineStack>

                        {editingTemplate === selectedCategory ? (
                          <BlockStack gap="300">
                            <TextField
                              label={`${categoryLabel} Template Content`}
                              value={templateContent}
                              onChange={setTemplateContent}
                              multiline={8}
                              autoComplete="off"
                            />
                            <InlineStack align="end" gap="200">
                              <Button 
                                onClick={() => {
                                  setEditingTemplate(null)
                                  setTemplateContent('')
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                variant="primary"
                                onClick={() => handleSaveTemplate(selectedCategory, templateContent)}
                                loading={saving}
                              >
                                Save Template
                              </Button>
                            </InlineStack>
                          </BlockStack>
                        ) : (
                          <Box
                            padding="300"
                            background="bg-surface-secondary"
                            borderRadius="200"
                          >
                            <Text variant="bodySm" as="pre" style={{ whiteSpace: 'pre-wrap' }}>
                              {template?.content || `No template configured for ${categoryLabel}`}
                            </Text>
                          </Box>
                        )}
                      </BlockStack>
                    </Card>
                  )
                })()}
              </BlockStack>
            </Card>
          </Layout.Section>

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
                  <InlineStack gap="200">
                    <Button 
                      variant="tertiary"
                      onClick={() => {
                        setResetType('system')
                        setShowResetModal(true)
                      }}
                    >
                      Reset to Default
                    </Button>
                    <Button 
                      variant="primary"
                      onClick={() => setEditingSystemPrompt(!editingSystemPrompt)}
                    >
                      {editingSystemPrompt ? 'Cancel' : 'Edit'}
                    </Button>
                  </InlineStack>
                </InlineStack>

                {editingSystemPrompt ? (
                  <BlockStack gap="300">
                    <TextField
                      label="System Prompt Content"
                      value={systemPromptContent}
                      onChange={setSystemPromptContent}
                      multiline={8}
                      autoComplete="off"
                    />
                    <InlineStack align="end" gap="200">
                      <Button onClick={() => setEditingSystemPrompt(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="primary"
                        onClick={handleSaveSystemPrompt}
                        loading={saving}
                      >
                        Save Changes
                      </Button>
                    </InlineStack>
                  </BlockStack>
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
        </Layout>

        {/* Reset Confirmation Modal */}
        <Modal
          open={showResetModal}
          onClose={() => {
            setShowResetModal(false)
            setResetType(null)
            setResetCategory(null)
          }}
          title="Reset to Default"
          primaryAction={{
            content: 'Reset',
            onAction: handleReset,
            loading: saving,
            destructive: true
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => {
              setShowResetModal(false)
              setResetType(null)
              setResetCategory(null)
            }
          }]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to reset the{' '}
              {resetType === 'system' ? 'master system prompt' : 
                `${PRODUCT_CATEGORIES.find(c => c.value === resetCategory)?.label || resetCategory} template`
              }{' '}
              to its default version? This will overwrite any custom changes you've made.
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