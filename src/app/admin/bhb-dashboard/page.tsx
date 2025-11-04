"use client";

import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Badge,
  Spinner,
  DataTable,
  EmptyState,
  Banner,
} from "@shopify/polaris";

interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  purchases: number;
  purchase_value: number;
  conversion_rate: number;
  roas: number;
  performance_tier: "excellent" | "good" | "average" | "poor" | "critical";
}

interface ShopPerformance {
  shop_id: string;
  shop_domain: string;
  shop_is_active: boolean;
  facebook_connected: boolean;
  ad_account_id: string | null;
  ad_account_name: string | null;
  campaigns: CampaignPerformance[];
  total_spend: number;
  total_purchases: number;
  total_purchase_value: number;
  avg_roas: number;
  avg_conversion_rate: number;
  error?: string;
}

interface InsightsResponse {
  success: boolean;
  data: ShopPerformance[];
  summary: {
    total_shops: number;
    shops_with_facebook: number;
    total_campaigns: number;
    total_spend: number;
    total_purchases: number;
    total_purchase_value: number;
    avg_roas: number;
    excellent_campaigns: number;
    good_campaigns: number;
    average_campaigns: number;
    poor_campaigns: number;
    critical_campaigns: number;
  };
  generated_at: string;
  data_period: string;
}

/**
 * Get badge tone and label for performance tier
 */
function getPerformanceBadge(tier: string) {
  switch (tier) {
    case "excellent":
      return { tone: "success" as const, label: "🌟 Excellent" };
    case "good":
      return { tone: "success" as const, label: "✅ Good" };
    case "average":
      return { tone: "info" as const, label: "➖ Average" };
    case "poor":
      return { tone: "warning" as const, label: "⚠️ Poor" };
    case "critical":
      return { tone: "critical" as const, label: "🚨 Critical" };
    default:
      return { tone: "info" as const, label: tier };
  }
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export default function BHBDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInsights();
  }, []);

  async function fetchInsights() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/insights");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch campaign insights");
      }

      setInsights(data);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function toggleShopExpansion(shopId: string) {
    const newExpanded = new Set(expandedShops);
    if (newExpanded.has(shopId)) {
      newExpanded.delete(shopId);
    } else {
      newExpanded.add(shopId);
    }
    setExpandedShops(newExpanded);
  }

  if (loading) {
    return (
      <Page title="BHB Dashboard - Loading...">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="800">
                <InlineStack align="center" blockAlign="center" gap="400">
                  <Spinner size="large" />
                  <Text as="p" variant="bodyLg">
                    Loading campaign performance data across all stores...
                  </Text>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="BHB Dashboard - Error">
        <Layout>
          <Layout.Section>
            <Banner tone="critical" title="Failed to load dashboard">
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!insights || insights.data.length === 0) {
    return (
      <Page title="BHB Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="No active stores found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  There are currently no active Thunder Text stores to display.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const { summary, data: shops } = insights;

  // Build data table rows
  const rows = shops.flatMap((shop) => {
    const isExpanded = expandedShops.has(shop.shop_id);

    // Shop summary row
    const shopRow = [
      <InlineStack gap="200" blockAlign="center" key={`shop-${shop.shop_id}`}>
        <Text as="span" variant="bodyMd" fontWeight="bold">
          {shop.shop_domain}
        </Text>
        {!shop.facebook_connected && <Badge tone="warning">No Facebook</Badge>}
        {shop.error && <Badge tone="critical">Error</Badge>}
      </InlineStack>,
      shop.campaigns.length,
      formatCurrency(shop.total_spend),
      shop.total_purchases,
      formatCurrency(shop.total_purchase_value),
      formatPercentage(shop.avg_conversion_rate),
      shop.avg_roas.toFixed(2),
      <button
        key={`expand-${shop.shop_id}`}
        onClick={() => toggleShopExpansion(shop.shop_id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#2c6ecb",
          textDecoration: "underline",
        }}
      >
        {isExpanded ? "▼ Hide" : "▶ Show"} Campaigns
      </button>,
    ];

    // If expanded, add campaign rows
    const campaignRows = isExpanded
      ? shop.campaigns.map((campaign) => {
          const badge = getPerformanceBadge(campaign.performance_tier);
          return [
            <Box
              paddingInlineStart="800"
              key={`campaign-${campaign.campaign_id}`}
            >
              <InlineStack gap="200" blockAlign="center">
                <Text as="span" variant="bodySm" tone="subdued">
                  ↳ {campaign.campaign_name}
                </Text>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </InlineStack>
            </Box>,
            "",
            formatCurrency(campaign.spend),
            campaign.purchases,
            formatCurrency(campaign.purchase_value),
            formatPercentage(campaign.conversion_rate),
            campaign.roas.toFixed(2),
            "",
          ];
        })
      : [];

    return [shopRow, ...campaignRows];
  });

  return (
    <Page
      title="BHB Dashboard"
      subtitle="Campaign Performance Across All Thunder Text Stores"
    >
      <Layout>
        {/* Summary Cards */}
        <Layout.Section>
          <InlineStack gap="400" wrap={false}>
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  Total Stores
                </Text>
                <Text as="p" variant="headingLg">
                  {summary.total_shops}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {summary.shops_with_facebook} with Facebook Ads
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  Total Campaigns
                </Text>
                <Text as="p" variant="headingLg">
                  {summary.total_campaigns}
                </Text>
                <InlineStack gap="100">
                  <Badge tone="success">{`${summary.excellent_campaigns} ★`}</Badge>
                  <Badge tone="success">{`${summary.good_campaigns} ✓`}</Badge>
                  <Badge tone="warning">{`${summary.poor_campaigns} ⚠`}</Badge>
                  <Badge tone="critical">{`${summary.critical_campaigns} 🚨`}</Badge>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  Total Spend (30d)
                </Text>
                <Text as="p" variant="headingLg">
                  {formatCurrency(summary.total_spend)}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {summary.total_purchases} purchases
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  Average ROAS
                </Text>
                <Text
                  as="p"
                  variant="headingLg"
                  tone={
                    summary.avg_roas >= 2.0
                      ? "success"
                      : summary.avg_roas >= 1.0
                        ? undefined
                        : "critical"
                  }
                >
                  {summary.avg_roas.toFixed(2)}x
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {formatCurrency(summary.total_purchase_value)} revenue
                </Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Performance Table */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Store Campaign Performance
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Last updated:{" "}
                  {new Date(insights.generated_at).toLocaleString()}
                </Text>
              </InlineStack>

              <DataTable
                columnContentTypes={[
                  "text",
                  "numeric",
                  "numeric",
                  "numeric",
                  "numeric",
                  "numeric",
                  "numeric",
                  "text",
                ]}
                headings={[
                  "Store / Campaign",
                  "Campaigns",
                  "Spend",
                  "Purchases",
                  "Revenue",
                  "Conv. Rate",
                  "ROAS",
                  "Actions",
                ]}
                rows={rows}
                hoverable
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Legend */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Performance Tier Legend
              </Text>
              <InlineStack gap="400" wrap={true}>
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="success">🌟 Excellent</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">
                    ROAS ≥ 4.0, Conv ≥ 3%, Spend ≥ $100
                  </Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="success">✅ Good</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">
                    ROAS ≥ 2.5 or Conv ≥ 2%
                  </Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="info">➖ Average</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">
                    ROAS ≥ 1.5 or Conv ≥ 1%
                  </Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="warning">⚠️ Poor</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">
                    ROAS &lt; 1.5, Conv &lt; 1%
                  </Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="critical">🚨 Critical</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">
                    Spend &gt; $500, ROAS &lt; 1.0 (burning money)
                  </Text>
                </InlineStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
