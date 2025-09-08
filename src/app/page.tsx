'use client'

import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  DropZone,
  InlineStack,
  TextField,
  Select,
  Spinner,
  Banner,
  List,
  Badge,
} from '@shopify/polaris'

interface GenerationResult {
  title: string
  description: string
  bulletPoints: string[]
  metaDescription: string
  keywords: string[]
  confidence: number
  processingTime: number
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [files, setFiles] = useState<File[]>([])
  const [productTitle, setProductTitle] = useState('')
  const [category, setCategory] = useState('')
  const [targetLength, setTargetLength] = useState('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDropZoneChange = (files: File[]) => {
    setFiles(files)
    setError(null)
  }

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError('Please upload at least one product image')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      // Convert files to base64 URLs for the API
      const imagePromises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      })

      const images = await Promise.all(imagePromises)

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          productTitle: productTitle || undefined,
          category: category || undefined,
          targetLength,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate description')
      }

      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  if (status === 'loading') {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p">Loading...</Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (!session) {
    return (
      <Page
        title="Thunder Text"
        subtitle="AI-powered product descriptions for your Shopify store"
      >
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack vertical spacing="loose">
                <Text variant="headingLg" as="h2">
                  Welcome to Thunder Text
                </Text>
                <Text variant="bodyMd" as="p">
                  Generate compelling, SEO-optimized product descriptions from images using advanced AI technology.
                </Text>
                <Button primary onClick={() => signIn('shopify')}>
                  Connect Your Shopify Store
                </Button>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  const lengthOptions = [
    { label: 'Short (50-100 words)', value: 'short' },
    { label: 'Medium (100-200 words)', value: 'medium' },
    { label: 'Long (200-400 words)', value: 'long' },
  ]

  return (
    <Page
      title="Generate Product Description"
      subtitle="Upload product images to create AI-powered descriptions"
    >
      <Layout>
        <Layout.Section>
          {error && (
            <Banner status="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}

          <Card>
            <InlineStack vertical spacing="loose">
              <Text variant="headingMd" as="h3">
                Product Images
              </Text>
              
              <DropZone
                accept="image/*"
                type="image"
                onDrop={handleDropZoneChange}
                disabled={isGenerating}
              >
                <DropZone.FileUpload />
              </DropZone>

              {files.length > 0 && (
                <InlineStack>
                  {files.map((file, index) => (
                    <Badge key={index}>{file.name}</Badge>
                  ))}
                </InlineStack>
              )}

              <TextField
                label="Product Title (Optional)"
                value={productTitle}
                onChange={setProductTitle}
                placeholder="e.g., Premium Leather Handbag"
                disabled={isGenerating}
              />

              <TextField
                label="Category (Optional)"
                value={category}
                onChange={setCategory}
                placeholder="e.g., Fashion, Electronics, Home & Garden"
                disabled={isGenerating}
              />

              <Select
                label="Description Length"
                options={lengthOptions}
                value={targetLength}
                onChange={setTargetLength}
                disabled={isGenerating}
              />

              <Button
                primary
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={files.length === 0}
              >
                {isGenerating ? 'Generating...' : 'Generate Description'}
              </Button>
            </InlineStack>
          </Card>
        </Layout.Section>

        {result && (
          <Layout.Section>
            <Card>
              <InlineStack vertical spacing="loose">
                <Text variant="headingMd" as="h3">
                  Generated Content
                </Text>

                <InlineStack vertical spacing="tight">
                  <Text variant="headingSm" as="h4">Product Title</Text>
                  <Text variant="bodyMd" as="p">{result.title}</Text>
                </InlineStack>

                <InlineStack vertical spacing="tight">
                  <Text variant="headingSm" as="h4">Description</Text>
                  <Text variant="bodyMd" as="p">{result.description}</Text>
                </InlineStack>

                <InlineStack vertical spacing="tight">
                  <Text variant="headingSm" as="h4">Key Features</Text>
                  <List type="bullet">
                    {result.bulletPoints.map((point, index) => (
                      <List.Item key={index}>{point}</List.Item>
                    ))}
                  </List>
                </InlineStack>

                <InlineStack vertical spacing="tight">
                  <Text variant="headingSm" as="h4">Meta Description</Text>
                  <Text variant="bodyMd" as="p">{result.metaDescription}</Text>
                </InlineStack>

                <InlineStack vertical spacing="tight">
                  <Text variant="headingSm" as="h4">SEO Keywords</Text>
                  <InlineStack>
                    {result.keywords.map((keyword, index) => (
                      <Badge key={index}>{keyword}</Badge>
                    ))}
                  </InlineStack>
                </InlineStack>

                <InlineStack spacing="loose">
                  <Text variant="bodySm" as="p" color="subdued">
                    Confidence: {Math.round(result.confidence * 100)}%
                  </Text>
                  <Text variant="bodySm" as="p" color="subdued">
                    Processing Time: {result.processingTime}ms
                  </Text>
                  <Text variant="bodySm" as="p" color="subdued">
                    Tokens Used: {result.tokenUsage.total}
                  </Text>
                </InlineStack>
              </InlineStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  )
}
