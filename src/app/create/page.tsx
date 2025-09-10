'use client'

import { useState, useCallback, Suspense } from 'react'
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
  Select,
  TextField,
  Banner,
  Spinner,
  DropZone,
  Thumbnail,
  Modal,
  Frame
} from '@shopify/polaris'

interface UploadedFile {
  file: File
  preview: string
}

function CreateProductContent() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')
  
  // Form state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [productCategory, setProductCategory] = useState('')
  const [availableSizing, setAvailableSizing] = useState('')
  const [descriptionTemplate, setDescriptionTemplate] = useState('Default Template (system)')
  const [fabricMaterial, setFabricMaterial] = useState('')
  const [occasionUse, setOccasionUse] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyFeatures, setKeyFeatures] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  
  // Loading states
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [productCreated, setProductCreated] = useState<any>(null)

  // Product categories from the dropdown
  const categoryOptions = [
    { label: 'Select a category', value: '' },
    { label: 'Fashion & Apparel', value: 'Fashion & Apparel' },
    { label: 'Electronics & Gadgets', value: 'Electronics & Gadgets' },
    { label: 'Home & Garden', value: 'Home & Garden' },
    { label: 'Health & Beauty', value: 'Health & Beauty' },
    { label: 'Sports & Outdoors', value: 'Sports & Outdoors' },
    { label: 'Books & Media', value: 'Books & Media' },
    { label: 'Toys & Games', value: 'Toys & Games' },
    { label: 'Food & Beverages', value: 'Food & Beverages' },
    { label: 'Automotive', value: 'Automotive' },
    { label: 'Arts & Crafts', value: 'Arts & Crafts' },
    { label: 'Jewelry & Accessories', value: 'Jewelry & Accessories' },
    { label: 'Office & Business', value: 'Office & Business' },
    { label: 'Pet Supplies', value: 'Pet Supplies' },
    { label: 'Other', value: 'Other' }
  ]

  // Available sizing options
  const sizingOptions = [
    { label: 'Select sizing range', value: '' },
    { label: 'One Size', value: 'One Size' },
    { label: 'XS - XL', value: 'XS - XL' },
    { label: 'XS - XXL', value: 'XS - XXL' },
    { label: 'XS - XXXL', value: 'XS - XXXL' },
    { label: 'Numeric (6-16)', value: 'Numeric (6-16)' },
    { label: 'Numeric (28-44)', value: 'Numeric (28-44)' },
    { label: 'Children (2T-14)', value: 'Children (2T-14)' },
    { label: 'Custom Sizing', value: 'Custom Sizing' }
  ]

  // Description template options
  const templateOptions = [
    { label: 'Default Template (system)', value: 'Default Template (system)' },
    { label: 'Fashion Template', value: 'Fashion Template' },
    { label: 'Electronics Template', value: 'Electronics Template' },
    { label: 'Home & Garden Template', value: 'Home & Garden Template' },
    { label: 'Beauty Template', value: 'Beauty Template' },
    { label: 'Sports Template', value: 'Sports Template' }
  ]

  const handleDrop = useCallback(
    (dropFiles: File[], acceptedFiles: File[], rejectedFiles: File[]) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }))
      setUploadedFiles(prev => [...prev, ...newFiles])
    },
    []
  )

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleGenerateDescription = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one product image')
      return
    }

    if (!productCategory) {
      setError('Please select a product category')
      return
    }

    setGenerating(true)
    setError(null)
    setShowModal(true)

    try {
      // Convert files to base64 for API
      const imageData = await Promise.all(
        uploadedFiles.map(async ({ file }) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        })
      )

      const response = await fetch('/api/generate/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imageData,
          category: productCategory,
          sizing: availableSizing,
          template: descriptionTemplate,
          fabricMaterial,
          occasionUse,
          targetAudience,
          keyFeatures,
          additionalNotes
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      // Handle successful generation
      setGeneratedContent(data.data.generatedContent)
      console.log('Generated content:', data.data)
      
    } catch (err) {
      console.error('Error generating content:', err)
      setError('Failed to generate product description. Please try again.')
    } finally {
      setGenerating(false)
      setShowModal(false)
    }
  }

  const handleCreateInShopify = async () => {
    if (!generatedContent) return

    setCreatingProduct(true)
    setError(null)

    try {
      // Convert uploaded files to base64 for Shopify image upload
      const uploadedImagesData = await Promise.all(
        uploadedFiles.map(async ({ file }) => {
          return new Promise<{ dataUrl: string; name: string; altText: string }>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                dataUrl: reader.result as string,
                name: file.name,
                altText: generatedContent.title || file.name
              })
            }
            reader.readAsDataURL(file)
          })
        })
      )

      const url = new URL('/api/shopify/products/create', window.location.origin)
      if (shop) {
        url.searchParams.append('shop', shop)
      }
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generatedContent,
          productData: {
            category: productCategory,
            sizing: availableSizing,
            template: descriptionTemplate,
            fabricMaterial,
            occasionUse,
            targetAudience,
            keyFeatures,
            additionalNotes
          },
          uploadedImages: uploadedImagesData
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create product in Shopify')
      }

      console.log('Product created successfully:', data.data)
      setProductCreated(data.data)
      setGeneratedContent(null) // Close the generated content modal

    } catch (err) {
      console.error('Error creating product in Shopify:', err)
      setError(`Failed to create product in Shopify: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setCreatingProduct(false)
    }
  }

  if (!shop || !authenticated) {
    return (
      <Page title="Create New Product">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Authentication Required</Text>
                <Text as="p">
                  Please install Thunder Text from your Shopify admin panel to access this page.
                </Text>
                <Button primary onClick={() => window.location.href = '/'}>
                  Back to Home
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  return (
    <Page 
      title="Create New Product" 
      subtitle="Generate product descriptions from images"
      primaryAction={
        <Button 
          primary 
          onClick={() => window.location.href = `/dashboard?${searchParams?.toString() || ''}`}
        >
          Back to Dashboard
        </Button>
      }
    >
      <Layout>
        {/* Information Banners */}
        <Layout.Section>
          <BlockStack gap="400">
            <Banner status="info">
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">How to create a new product</Text>
                <Text as="p">
                  1. Upload product images (up to 5)
                </Text>
                <Text as="p">
                  2. Fill in product details and sizing
                </Text>
                <Text as="p">
                  3. Click "Generate Description" to create AI-powered content
                </Text>
                <Text as="p">
                  4. Review and create the product in Shopify
                </Text>
              </BlockStack>
            </Banner>
            
            <Banner status="warning">
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">Looking to update an existing product?</Text>
                <Text as="p">
                  Use the "Update Existing Product" option from the dashboard to generate descriptions for products already in your store.
                </Text>
              </BlockStack>
            </Banner>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="500">
            {/* Image Upload Section */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Product Images</Text>
                <Text as="p" tone="subdued">
                  Drag & drop product images here, or click to select
                </Text>
                <Text as="p" tone="subdued">
                  Supported formats: JPG, PNG, WebP (max 10MB per image, up to 10 images)
                </Text>
                
                <DropZone
                  onDrop={handleDrop}
                  accept="image/*"
                  type="image"
                  allowMultiple
                >
                  {uploadedFiles.length > 0 ? (
                    <BlockStack gap="300">
                      <InlineStack gap="300" wrap={false}>
                        {uploadedFiles.map(({ file, preview }, index) => (
                          <Box key={index}>
                            <Thumbnail
                              source={preview}
                              alt={file.name}
                              size="large"
                            />
                            <Box paddingBlockStart="200">
                              <Button 
                                size="micro" 
                                onClick={() => removeFile(index)}
                              >
                                Remove
                              </Button>
                            </Box>
                          </Box>
                        ))}
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        Drop more files here to add them, or click to browse
                      </Text>
                    </BlockStack>
                  ) : (
                    <div style={{ 
                      padding: '60px 40px', 
                      textAlign: 'center',
                      border: '2px dashed #cccccc',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer'
                    }}>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyLg">
                          📷 Upload Product Images
                        </Text>
                        <Text as="p" tone="subdued">
                          Drop files here or click to browse
                        </Text>
                        <Button>Select Images</Button>
                      </BlockStack>
                    </div>
                  )}
                </DropZone>
              </BlockStack>
            </Card>

            {/* Product Details Form */}
            <Layout>
              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Product Details</Text>
                    
                    <Select
                      label="Product Category"
                      options={categoryOptions}
                      value={productCategory}
                      onChange={setProductCategory}
                    />
                    
                    <Select
                      label="Available Sizing"
                      helpText="Select the available size range for this product"
                      options={sizingOptions}
                      value={availableSizing}
                      onChange={setAvailableSizing}
                    />
                    
                    <Select
                      label="Description Template"
                      helpText="Choose the template to use for description generation. Active templates are marked."
                      options={templateOptions}
                      value={descriptionTemplate}
                      onChange={setDescriptionTemplate}
                    />
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Additional Information</Text>
                    
                    <TextField
                      label="Fabric/Material Content"
                      placeholder="e.g. 100% organic cotton, stainless steel, recycled plastic"
                      value={fabricMaterial}
                      onChange={setFabricMaterial}
                      helpText="Describe the materials used in this product"
                      multiline={2}
                    />
                    
                    <TextField
                      label="Occasion Use"
                      placeholder="e.g. outdoor activities, formal events, everyday use"
                      value={occasionUse}
                      onChange={setOccasionUse}
                      helpText="When or where would customers use this product?"
                      multiline={2}
                    />
                    
                    <TextField
                      label="Target Audience"
                      placeholder="e.g. young professionals, parents, fitness enthusiasts"
                      value={targetAudience}
                      onChange={setTargetAudience}
                      helpText="Who is this product designed for?"
                      multiline={2}
                    />
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>

            {/* Additional Features and Notes */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Features & Additional Details</Text>
                
                <TextField
                  label="Key Features"
                  placeholder="e.g. waterproof, eco-friendly, machine washable, lifetime warranty"
                  value={keyFeatures}
                  onChange={setKeyFeatures}
                  helpText="List the main features and benefits"
                  multiline={3}
                />
                
                <TextField
                  label="Additional Notes"
                  placeholder="Any other important information about this product"
                  value={additionalNotes}
                  onChange={setAdditionalNotes}
                  helpText="Optional: Add any special instructions or details"
                  multiline={3}
                />
              </BlockStack>
            </Card>

            {/* Error Display */}
            {error && (
              <Banner status="critical">
                <Text as="p">{error}</Text>
              </Banner>
            )}

            {/* Action Buttons */}
            <Card>
              <InlineStack align="end" gap="300">
                <Button onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button
                  primary
                  loading={generating}
                  onClick={handleGenerateDescription}
                  disabled={uploadedFiles.length === 0 || !productCategory}
                >
                  {generating ? 'Generating...' : 'Generate Description'}
                </Button>
              </InlineStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* AI Generation Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title=""
        primaryAction={undefined}
        secondaryActions={undefined}
      >
        <Modal.Section>
          <BlockStack gap="500" align="center">
            <BlockStack gap="300" align="center">
              <Text as="h2" variant="headingLg" alignment="center">
                Creating Your Product Description
              </Text>
              
              <Box paddingBlockStart="400" paddingBlockEnd="400">
                <Spinner size="large" />
              </Box>
              
              <BlockStack gap="200" align="center">
                <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                  A work of art is in progress...
                </Text>
                <Text as="p" variant="bodyMd" alignment="center">
                  Our AI is analyzing your images and crafting the perfect description.
                </Text>
                <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                  This typically takes 10-15 seconds.
                </Text>
              </BlockStack>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Generated Content Results */}
      {generatedContent && (
        <Modal
          open={!!generatedContent}
          onClose={() => setGeneratedContent(null)}
          title="Generated Product Description"
          primaryAction={{
            content: creatingProduct ? 'Creating Product...' : 'Create Product in Shopify',
            loading: creatingProduct,
            onAction: handleCreateInShopify
          }}
          secondaryActions={[
            {
              content: 'Generate Again',
              onAction: () => {
                setGeneratedContent(null)
                handleGenerateDescription()
              }
            },
            {
              content: 'Close',
              onAction: () => setGeneratedContent(null)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Product Title"
                value={generatedContent.title || ''}
                onChange={() => {}}
                readOnly
              />
              
              <TextField
                label="Description"
                value={generatedContent.description || ''}
                onChange={() => {}}
                multiline={6}
                readOnly
              />
              
              <TextField
                label="Meta Description"
                value={generatedContent.metaDescription || ''}
                onChange={() => {}}
                multiline={2}
                readOnly
              />
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Key Features</Text>
                  {generatedContent.bulletPoints && generatedContent.bulletPoints.length > 0 ? (
                    <BlockStack gap="100">
                      {generatedContent.bulletPoints.map((point: string, index: number) => (
                        <Text as="p" key={index}>• {point}</Text>
                      ))}
                    </BlockStack>
                  ) : (
                    <Text as="p" tone="subdued">No bullet points generated</Text>
                  )}
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">SEO Keywords</Text>
                  <Text as="p">
                    {generatedContent.keywords && generatedContent.keywords.length > 0 
                      ? generatedContent.keywords.join(', ') 
                      : 'No keywords generated'
                    }
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Product Created Success Modal */}
      {productCreated && (
        <Modal
          open={!!productCreated}
          onClose={() => setProductCreated(null)}
          title="🎉 Product Created Successfully!"
          primaryAction={{
            content: 'View in Shopify Admin',
            onAction: () => {
              window.open(productCreated.shopifyUrl, '_blank')
            }
          }}
          secondaryActions={[
            {
              content: 'Create Another Product',
              onAction: () => {
                setProductCreated(null)
                // Reset form
                setUploadedFiles([])
                setProductCategory('')
                setAvailableSizing('')
                setDescriptionTemplate('Default Template (system)')
                setFabricMaterial('')
                setOccasionUse('')
                setTargetAudience('')
                setKeyFeatures('')
                setAdditionalNotes('')
              }
            },
            {
              content: 'Close',
              onAction: () => setProductCreated(null)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Banner status="success">
                <Text as="p">
                  Your product has been successfully created in Shopify as a draft. 
                  You can now review and publish it from your Shopify admin.
                </Text>
              </Banner>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Product Details</Text>
                  <BlockStack gap="200">
                    <Text as="p">
                      <Text as="span" fontWeight="bold">Title:</Text> {productCreated.product?.title}
                    </Text>
                    <Text as="p">
                      <Text as="span" fontWeight="bold">Status:</Text> Draft (ready for review)
                    </Text>
                    <Text as="p">
                      <Text as="span" fontWeight="bold">Product ID:</Text> {productCreated.product?.id}
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Next Steps</Text>
                  <BlockStack gap="100">
                    <Text as="p">• Review the product details in your Shopify admin</Text>
                    <Text as="p">• Add product images if needed</Text>
                    <Text as="p">• Set pricing and inventory</Text>
                    <Text as="p">• Publish when ready to sell</Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  )
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={
      <Box padding="800">
        <InlineStack align="center" blockAlign="center">
          <Spinner size="small" />
          <Text as="p">Loading Create Product Page...</Text>
        </InlineStack>
      </Box>
    }>
      <CreateProductContent />
    </Suspense>
  )
}