'use client'

import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Divider,
  Link,
  List,
} from '@shopify/polaris'

export default function HelpPage() {
  return (
    <Page
      title="Help Center"
      subtitle="Get help with Thunder Text features and functionality"
    >
      <Layout>
        {/* Getting Started */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Getting Started</Text>
              <Divider />

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">How do I create my first product description?</Text>
                <List type="number">
                  <List.Item>Click "Create Description" in the navigation menu</List.Item>
                  <List.Item>Upload 1-4 product images</List.Item>
                  <List.Item>Fill in basic product details (title, color, sizing)</List.Item>
                  <List.Item>Click "Generate Description" and wait for AI to process</List.Item>
                  <List.Item>Review and customize the generated content</List.Item>
                  <List.Item>Click "Create Product in Shopify" to add it to your store</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">How do I enhance an existing product?</Text>
                <List type="number">
                  <List.Item>Click "Enhance Product" in the navigation menu</List.Item>
                  <List.Item>Search for and select the product you want to improve</List.Item>
                  <List.Item>Review the current description</List.Item>
                  <List.Item>Click "Generate Enhanced Description"</List.Item>
                  <List.Item>Compare the new content with the original</List.Item>
                  <List.Item>Save changes to update your product in Shopify</List.Item>
                </List>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Features & Functionality */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Features & Functionality</Text>
              <Divider />

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">What can Thunder Text generate?</Text>
                <Text as="p" variant="bodyMd">Thunder Text uses AI to create:</Text>
                <List type="bullet">
                  <List.Item><strong>Product Title:</strong> SEO-optimized, compelling titles</List.Item>
                  <List.Item><strong>Description:</strong> Detailed, engaging HTML-formatted descriptions</List.Item>
                  <List.Item><strong>Bullet Points:</strong> Key features and benefits</List.Item>
                  <List.Item><strong>Meta Description:</strong> SEO metadata for search engines</List.Item>
                  <List.Item><strong>Keywords:</strong> Relevant tags for product discovery</List.Item>
                  <List.Item><strong>Category Suggestions:</strong> Automatic Shopify category assignment</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">How does color detection work?</Text>
                <Text as="p" variant="bodyMd">
                  Thunder Text automatically analyzes uploaded images to detect product colors.
                  The AI identifies the dominant colors and suggests standardized color names.
                  You can override these suggestions if needed before creating the product.
                </Text>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Can I customize the AI-generated content?</Text>
                <Text as="p" variant="bodyMd">
                  Yes! All generated content can be edited before creating or updating products in Shopify.
                  You can modify titles, descriptions, bullet points, and other fields directly in the interface.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Custom Templates & Settings */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Custom Templates & Settings</Text>
              <Divider />

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">How do I create custom prompts?</Text>
                <List type="number">
                  <List.Item>Navigate to Settings in the menu</List.Item>
                  <List.Item>Go to the "Prompts" section</List.Item>
                  <List.Item>Click "Create New Prompt Template"</List.Item>
                  <List.Item>Enter your custom instructions for the AI</List.Item>
                  <List.Item>Save and set as default if desired</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">What are category-specific templates?</Text>
                <Text as="p" variant="bodyMd">
                  Category templates allow you to customize AI generation for specific product types
                  (e.g., dresses, tops, shoes). This ensures descriptions match your brand voice and
                  highlight relevant features for each category.
                </Text>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">How do I set up default sizing options?</Text>
                <List type="number">
                  <List.Item>Go to Settings → Sizing</List.Item>
                  <List.Item>Configure your standard size ranges (XS-XXL, numeric, etc.)</List.Item>
                  <List.Item>Set defaults for different product categories</List.Item>
                  <List.Item>These will auto-populate when creating new products</List.Item>
                </List>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Troubleshooting */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Troubleshooting</Text>
              <Divider />

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">My images aren't uploading properly</Text>
                <Text as="p" variant="bodyMd">Check the following:</Text>
                <List type="bullet">
                  <List.Item>Image files are in JPEG, PNG, or WebP format</List.Item>
                  <List.Item>File size is under 10MB per image</List.Item>
                  <List.Item>You have a stable internet connection</List.Item>
                  <List.Item>Try refreshing the page and uploading again</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">The AI generation is taking too long</Text>
                <Text as="p" variant="bodyMd">
                  AI processing typically takes 10-30 seconds depending on image complexity.
                  If it takes longer than 2 minutes, refresh the page and try again.
                  Contact support if the issue persists.
                </Text>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Products aren't appearing in my Shopify store</Text>
                <Text as="p" variant="bodyMd">
                  Products are created as DRAFT by default. Check your Shopify admin under
                  Products → Drafts. You'll need to manually publish them after reviewing.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Contact & Support */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Contact & Support</Text>
              <Divider />

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Need more help?</Text>
                <Text as="p" variant="bodyMd">
                  Our support team is here to assist you:
                </Text>
                <List type="bullet">
                  <List.Item>
                    <strong>Email:</strong>{' '}
                    <Link url="mailto:support@shopstylefinder.com" external>
                      support@shopstylefinder.com
                    </Link>
                  </List.Item>
                  <List.Item><strong>Response Time:</strong> Within 24 hours on business days</List.Item>
                  <List.Item>
                    <strong>Documentation:</strong>{' '}
                    <Link url="https://docs.shopstylefinder.com" external>
                      docs.shopstylefinder.com
                    </Link>
                  </List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Report a Bug</Text>
                <Text as="p" variant="bodyMd">
                  Found an issue? Please report it to{' '}
                  <Link url="mailto:bugs@shopstylefinder.com" external>
                    bugs@shopstylefinder.com
                  </Link>
                  {' '}with:
                </Text>
                <List type="bullet">
                  <List.Item>Description of the problem</List.Item>
                  <List.Item>Steps to reproduce</List.Item>
                  <List.Item>Screenshots (if applicable)</List.Item>
                  <List.Item>Your store domain</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Feature Requests</Text>
                <Text as="p" variant="bodyMd">
                  Have an idea to improve Thunder Text? We'd love to hear it!{' '}
                  <Link url="mailto:feedback@shopstylefinder.com" external>
                    feedback@shopstylefinder.com
                  </Link>
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* About */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">About Thunder Text</Text>
              <Divider />
              <Text as="p" variant="bodyMd">
                Thunder Text is powered by advanced AI technology to help boutique store owners
                create compelling product descriptions quickly and efficiently. Built with ❤️ by
                the StyleFinder team.
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Version 3.0 | Last updated: October 2025
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
