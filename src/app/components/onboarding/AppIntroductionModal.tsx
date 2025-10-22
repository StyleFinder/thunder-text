'use client'

import React from 'react'
import {
  Modal,
  BlockStack,
  Text,
  InlineStack,
  Icon,
  Box,
  List,
  Badge,
  Divider
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

interface AppIntroductionModalProps {
  open: boolean
  onClose: () => void
  onGetStarted?: () => void
}

export function AppIntroductionModal({ open, onClose, onGetStarted }: AppIntroductionModalProps) {
  const handleGetStarted = () => {
    onClose()
    if (onGetStarted) {
      onGetStarted()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Welcome to Thunder Text"
      primaryAction={{
        content: 'Get Started',
        onAction: handleGetStarted
      }}
      secondaryActions={[
        {
          content: 'Close',
          onAction: onClose
        }
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="500">
          {/* App Introduction */}
          <Box>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon source={MagicIcon} tone="base" />
                </div>
                <Text as="p" variant="bodyLg">
                  Generate SEO-optimized product descriptions from images
                </Text>
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                Thunder Text uses advanced AI (GPT-4 Vision) to analyze your product images and automatically create compelling, search-optimized descriptions that convert browsers into buyers.
              </Text>
            </BlockStack>
          </Box>

          <Divider />

          {/* How It Works */}
          <Box>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                3 Simple Steps
              </Text>

              <BlockStack gap="200">
                <InlineStack gap="300" align="start">
                  <Badge tone="info">1</Badge>
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Upload Images
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Add product photos - AI analyzes colors, materials, and design
                    </Text>
                  </BlockStack>
                </InlineStack>

                <InlineStack gap="300" align="start">
                  <Badge tone="info">2</Badge>
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      AI Generates Content
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Get SEO-optimized descriptions, titles, and marketing copy
                    </Text>
                  </BlockStack>
                </InlineStack>

                <InlineStack gap="300" align="start">
                  <Badge tone="info">3</Badge>
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Review & Publish
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Edit if needed and publish directly to your products
                    </Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Box>

          <Divider />

          {/* Key Features */}
          <Box>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                Key Features
              </Text>

              <BlockStack gap="200">
                <InlineStack gap="200">
                  <Icon source={ImageIcon} tone="interactive" />
                  <Text as="p" variant="bodyMd">
                    Visual AI analysis of product images
                  </Text>
                </InlineStack>

                <InlineStack gap="200">
                  <Icon source={SearchIcon} tone="interactive" />
                  <Text as="p" variant="bodyMd">
                    SEO optimization for better rankings
                  </Text>
                </InlineStack>

                <InlineStack gap="200">
                  <Icon source={AutomationIcon} tone="interactive" />
                  <Text as="p" variant="bodyMd">
                    Bulk processing for multiple products
                  </Text>
                </InlineStack>

                <InlineStack gap="200">
                  <Icon source={ClockIcon} tone="interactive" />
                  <Text as="p" variant="bodyMd">
                    Save 90% of content creation time
                  </Text>
                </InlineStack>

                <InlineStack gap="200">
                  <Icon source={CashDollarIcon} tone="interactive" />
                  <Text as="p" variant="bodyMd">
                    Increase conversions with better descriptions
                  </Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Box>

          <Divider />

          {/* Benefits */}
          <Box>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                Why Thunder Text?
              </Text>

              <List type="bullet">
                <List.Item>
                  <Text as="span" variant="bodyMd">
                    <strong>Accurate:</strong> AI analyzes actual product images, not generic templates
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="span" variant="bodyMd">
                    <strong>Fast:</strong> Generate descriptions in seconds, not hours
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="span" variant="bodyMd">
                    <strong>SEO-Optimized:</strong> Built-in optimization for search engines
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="span" variant="bodyMd">
                    <strong>Customizable:</strong> Multiple templates and tones to match your brand
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="span" variant="bodyMd">
                    <strong>Scalable:</strong> Handle single products or bulk catalogs
                  </Text>
                </List.Item>
              </List>
            </BlockStack>
          </Box>

          {/* Call to Action */}
          <Box background="bg-surface-secondary" padding="400" borderRadius="200">
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={CheckIcon} tone="success" />
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Free for your first 10 products
                </Text>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                No credit card required. Start generating professional product descriptions today!
              </Text>
            </BlockStack>
          </Box>
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}