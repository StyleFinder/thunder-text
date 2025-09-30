'use client'

import React from 'react'
import {
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Icon,
  Box,
  List,
  Badge,
  Banner,
  MediaCard,
  VideoThumbnail,
  Thumbnail
} from '@shopify/polaris'
import {
  MagicIcon,
  ImageIcon,
  ClockIcon,
  SearchIcon,
  CashDollarIcon,
  AutomationIcon,
  CheckIcon
} from '@shopify/polaris-icons'

interface AppIntroductionProps {
  onComplete?: () => void
  showSkip?: boolean
}

export function AppIntroduction({ onComplete, showSkip = true }: AppIntroductionProps) {
  const features = [
    {
      icon: ImageIcon,
      title: 'Image Analysis',
      description: 'Upload product photos and our AI analyzes colors, materials, and design details'
    },
    {
      icon: MagicIcon,
      title: 'AI Generation',
      description: 'GPT-4 Vision creates compelling, accurate descriptions from your images'
    },
    {
      icon: SearchIcon,
      title: 'SEO Optimization',
      description: 'Automatically optimized for search engines to increase organic traffic'
    },
    {
      icon: ClockIcon,
      title: 'Save Time',
      description: 'Generate descriptions in seconds instead of writing for hours'
    },
    {
      icon: CashDollarIcon,
      title: 'Boost Sales',
      description: 'Better product descriptions lead to higher conversion rates'
    },
    {
      icon: AutomationIcon,
      title: 'Bulk Processing',
      description: 'Handle multiple products at once with our batch processing feature'
    }
  ]

  const benefits = [
    'Reduce product listing time by 90%',
    'Improve SEO rankings with optimized content',
    'Maintain consistent brand voice',
    'Increase conversion rates with better descriptions',
    'Scale your catalog effortlessly'
  ]

  return (
    <BlockStack gap="600">
      {/* Welcome Hero */}
      <Card>
        <Box padding="600">
          <BlockStack gap="400">
            <InlineStack align="center" blockAlign="center" gap="300">
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon source={MagicIcon} tone="base" />
              </div>
              <BlockStack gap="100">
                <Text as="h1" variant="headingLg">
                  Welcome to Thunder Text
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Generate SEO-optimized product descriptions from images. AI-powered content can boost conversions.
                </Text>
              </BlockStack>
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>

      {/* How It Works */}
      <Card>
        <Box padding="600">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              How Thunder Text Works
            </Text>

            <BlockStack gap="300">
              <InlineStack gap="300" align="start">
                <Badge tone="info">1</Badge>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Upload Product Images
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Add photos of your products - the AI will analyze visual details like colors, materials, and design
                  </Text>
                </BlockStack>
              </InlineStack>

              <InlineStack gap="300" align="start">
                <Badge tone="info">2</Badge>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    AI Analyzes & Generates
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    GPT-4 Vision examines your images and creates detailed, engaging descriptions
                  </Text>
                </BlockStack>
              </InlineStack>

              <InlineStack gap="300" align="start">
                <Badge tone="info">3</Badge>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Review & Publish
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Review the generated content, make any edits, and publish directly to your products
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Box>
      </Card>

      {/* Key Features Grid */}
      <Box>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Powerful Features
          </Text>

          <InlineStack gap="400" wrap>
            {features.map((feature, index) => (
              <Box key={index} minWidth="280px" maxWidth="320px">
                <Card>
                  <Box padding="400">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={feature.icon} tone="interactive" />
                        <Text as="h3" variant="headingSm">
                          {feature.title}
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {feature.description}
                      </Text>
                    </BlockStack>
                  </Box>
                </Card>
              </Box>
            ))}
          </InlineStack>
        </BlockStack>
      </Box>

      {/* Benefits */}
      <Card>
        <Box padding="600">
          <BlockStack gap="400">
            <InlineStack gap="200" align="space-between">
              <Text as="h2" variant="headingMd">
                Why Choose Thunder Text?
              </Text>
              <Badge tone="success">Trusted by 500+ Stores</Badge>
            </InlineStack>

            <List type="bullet">
              {benefits.map((benefit, index) => (
                <List.Item key={index}>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={CheckIcon} tone="success" />
                    <Text as="span" variant="bodyMd">{benefit}</Text>
                  </InlineStack>
                </List.Item>
              ))}
            </List>
          </BlockStack>
        </Box>
      </Card>

      {/* Quick Start CTA */}
      <Card>
        <Box padding="600" background="bg-surface-secondary">
          <BlockStack gap="400">
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Ready to Transform Your Product Descriptions?
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Start generating professional product content in seconds. No credit card required for your first 10 products.
              </Text>
            </BlockStack>

            <InlineStack gap="300">
              <Button variant="primary" size="large" onClick={onComplete}>
                Get Started
              </Button>
              {showSkip && (
                <Button size="large" onClick={onComplete}>
                  Skip Introduction
                </Button>
              )}
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>

      {/* Success Story */}
      <Banner
        title="Success Story"
        tone="success"
      >
        <p>
          "Thunder Text reduced our product listing time by 85% and increased our organic traffic by 40% in just 2 months.
          The AI-generated descriptions are incredibly accurate and convert better than our manually written ones."
        </p>
        <p><strong>- Sarah Chen, Fashion Boutique Owner</strong></p>
      </Banner>
    </BlockStack>
  )
}