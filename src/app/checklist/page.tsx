'use client'

import { useState } from 'react'
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Checkbox,
  Box,
  Divider,
  ProgressBar,
  List
} from '@shopify/polaris'

interface CheckItem {
  id: string
  label: string
  checked: boolean
  subItems?: string[]
}

export default function ChecklistPage() {
  // Meta Business Suite checklist
  const [metaItems, setMetaItems] = useState<CheckItem[]>([
    {
      id: 'meta-1',
      label: 'Check "People" list for unauthorized access (ex-employees, agencies)',
      checked: false
    },
    {
      id: 'meta-2',
      label: 'Review Ad Account health – look for red ❌ or warning badges',
      checked: false
    },
    {
      id: 'meta-3',
      label: 'Confirm Instagram connection (often disconnects unexpectedly)',
      checked: false
    },
    {
      id: 'meta-4',
      label: 'Under Data Sources → Pixels:',
      checked: false,
      subItems: [
        'Ensure the dataset says "receiving events"',
        'Check Event Match Quality score (ideal 8–10)',
        'Investigate warnings only if labeled "Limiting Reach/Audience"'
      ]
    },
    {
      id: 'meta-5',
      label: 'If using CommentSold, report SDK app errors to their reps — new version is expected to fix these',
      checked: false
    }
  ])

  // Facebook Ad Manager checklist
  const [facebookItems, setFacebookItems] = useState<CheckItem[]>([
    {
      id: 'fb-1',
      label: 'Weekly ad audit:',
      checked: false,
      subItems: [
        'Check ROAS column to flag underperforming ads',
        'Pause low performers; focus on high-ROAS campaigns'
      ]
    },
    {
      id: 'fb-2',
      label: 'Ignore "Learning" vs. "Learning Limited" labels',
      checked: false
    },
    {
      id: 'fb-3',
      label: 'Ignore Opportunity Score budget prompts — focus instead on ROAS and CTR',
      checked: false
    }
  ])

  // Google Analytics checklist
  const [googleItems, setGoogleItems] = useState<CheckItem[]>([
    {
      id: 'google-1',
      label: 'Check Reports → Acquisition → Overview weekly',
      checked: false
    },
    {
      id: 'google-2',
      label: 'Watch the balance between New Users vs. Active Users',
      checked: false
    },
    {
      id: 'google-3',
      label: 'Note: Low new user count = time to refresh campaigns or keywords',
      checked: false
    }
  ])

  const toggleItem = (
    items: CheckItem[],
    setItems: React.Dispatch<React.SetStateAction<CheckItem[]>>,
    id: string
  ) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  const getCompletionStats = (items: CheckItem[]) => {
    const completed = items.filter(item => item.checked).length
    const total = items.length
    const percentage = Math.round((completed / total) * 100)
    return { completed, total, percentage }
  }

  const metaStats = getCompletionStats(metaItems)
  const facebookStats = getCompletionStats(facebookItems)
  const googleStats = getCompletionStats(googleItems)

  const totalCompleted = metaStats.completed + facebookStats.completed + googleStats.completed
  const totalItems = metaStats.total + facebookStats.total + googleStats.total
  const overallPercentage = Math.round((totalCompleted / totalItems) * 100)

  return (
    <Page
      title="Weekly Marketing Checklist"
      subtitle="Essential weekly checks for your e-commerce marketing health"
    >
      <Layout>
        {/* Overall Progress Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">Overall Progress</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {totalCompleted} of {totalItems} checks completed
                  </Text>
                </BlockStack>
                <Text as="p" variant="heading2xl" fontWeight="bold">
                  {overallPercentage}%
                </Text>
              </InlineStack>
              <ProgressBar progress={overallPercentage} size="small" />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Meta Business Suite Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingLg">Meta Business Suite</Text>
                    <Badge tone={metaStats.percentage === 100 ? 'success' : 'info'}>
                      {`${metaStats.completed}/${metaStats.total}`}
                    </Badge>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Check weekly - Facebook pixel & events health
                  </Text>
                </BlockStack>
              </InlineStack>

              <Divider />

              <BlockStack gap="400">
                {metaItems.map((item) => (
                  <BlockStack key={item.id} gap="200">
                    <Checkbox
                      label={item.label}
                      checked={item.checked}
                      onChange={() => toggleItem(metaItems, setMetaItems, item.id)}
                    />
                    {item.subItems && (
                      <Box paddingInlineStart="800">
                        <List type="bullet">
                          {item.subItems.map((subItem, index) => (
                            <List.Item key={index}>
                              <Text as="span" variant="bodyMd" tone="subdued">
                                {subItem}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </Box>
                    )}
                  </BlockStack>
                ))}
              </BlockStack>

              {metaStats.percentage === 100 && (
                <Box background="bg-fill-success" padding="300" borderRadius="200">
                  <Text as="p" variant="bodyMd" tone="success" fontWeight="semibold">
                    ✓ Complete!
                  </Text>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Facebook Ad Manager Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingLg">Meta Ad Manager</Text>
                    <Badge tone={facebookStats.percentage === 100 ? 'success' : 'info'}>
                      {`${facebookStats.completed}/${facebookStats.total}`}
                    </Badge>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Check weekly - Monitor ad performance & ROAS
                  </Text>
                </BlockStack>
              </InlineStack>

              <Divider />

              <BlockStack gap="400">
                {facebookItems.map((item) => (
                  <BlockStack key={item.id} gap="200">
                    <Checkbox
                      label={item.label}
                      checked={item.checked}
                      onChange={() => toggleItem(facebookItems, setFacebookItems, item.id)}
                    />
                    {item.subItems && (
                      <Box paddingInlineStart="800">
                        <List type="bullet">
                          {item.subItems.map((subItem, index) => (
                            <List.Item key={index}>
                              <Text as="span" variant="bodyMd" tone="subdued">
                                {subItem}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </Box>
                    )}
                  </BlockStack>
                ))}
              </BlockStack>

              {facebookStats.percentage === 100 && (
                <Box background="bg-fill-success" padding="300" borderRadius="200">
                  <Text as="p" variant="bodyMd" tone="success" fontWeight="semibold">
                    ✓ Complete!
                  </Text>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Google Analytics Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingLg">Google Analytics</Text>
                    <Badge tone={googleStats.percentage === 100 ? 'success' : 'info'}>
                      {`${googleStats.completed}/${googleStats.total}`}
                    </Badge>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Check weekly - Monitor user acquisition
                  </Text>
                </BlockStack>
              </InlineStack>

              <Divider />

              <BlockStack gap="400">
                {googleItems.map((item) => (
                  <BlockStack key={item.id} gap="200">
                    <Checkbox
                      label={item.label}
                      checked={item.checked}
                      onChange={() => toggleItem(googleItems, setGoogleItems, item.id)}
                    />
                    {item.subItems && (
                      <Box paddingInlineStart="800">
                        <List type="bullet">
                          {item.subItems.map((subItem, index) => (
                            <List.Item key={index}>
                              <Text as="span" variant="bodyMd" tone="subdued">
                                {subItem}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </Box>
                    )}
                  </BlockStack>
                ))}
              </BlockStack>

              {googleStats.percentage === 100 && (
                <Box background="bg-fill-success" padding="300" borderRadius="200">
                  <Text as="p" variant="bodyMd" tone="success" fontWeight="semibold">
                    ✓ Complete!
                  </Text>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
