"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, Button, Badge, Input, Table, PageLayout, Text } from '@/components/bhb';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { Star } from 'lucide-react';
import { logger } from '@/lib/logger'

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
  // Future platform connections
  google_ads_connected?: boolean;
  google_ad_account_id?: string | null;
  tiktok_ads_connected?: boolean;
  tiktok_ad_account_id?: string | null;
  coach_assigned: string | null;
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
 * Get badge variant and label for performance tier
 */
function getPerformanceBadge(tier: string) {
  switch (tier) {
    case "excellent":
      return { variant: "success" as const, label: "🌟 Excellent" };
    case "good":
      return { variant: "success" as const, label: "✅ Good" };
    case "average":
      return { variant: "info" as const, label: "➖ Average" };
    case "poor":
      return { variant: "warning" as const, label: "⚠️ Poor" };
    case "critical":
      return { variant: "error" as const, label: "🚨 Critical" };
    default:
      return { variant: "info" as const, label: tier };
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
  const [selectedCoach, setSelectedCoach] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [allFavorites, setAllFavorites] = useState<Map<string, string[]>>(new Map());
  const [coachesList, setCoachesList] = useState<Array<{ name: string; email: string }>>([]);
  const { data: session } = useSession();

  // Get logged-in coach email from session, fallback to hardcoded for development
  const coachEmail = session?.user?.email || "baker2122+coach@gmail.com";

  useEffect(() => {
    fetchInsights();
    fetchFavorites();
    fetchAllFavorites();
    fetchCoaches();
  }, [coachEmail]);

  async function fetchInsights() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/bhb/insights");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch campaign insights");
      }

      setInsights(data);
    } catch (err) {
      logger.error("Error fetching insights:", err as Error, { component: 'bhb' });
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchFavorites() {
    try {
      const response = await fetch(`/api/coach/favorites?coach_email=${encodeURIComponent(coachEmail)}`);
      const data = await response.json();

      if (data.success) {
        setFavorites(new Set(data.favorites));
      }
    } catch (err) {
      logger.error("Error fetching favorites:", err as Error, { component: 'bhb' });
    }
  }

  async function fetchAllFavorites() {
    try {
      const response = await fetch(`/api/coach/favorites/all`);
      const data = await response.json();

      if (data.success) {
        // Convert array of {shop_id, coach_emails[]} to Map
        const favMap = new Map<string, string[]>();
        data.favorites.forEach((fav: { shop_id: string; coach_emails: string[] }) => {
          favMap.set(fav.shop_id, fav.coach_emails);
        });
        setAllFavorites(favMap);
      }
    } catch (err) {
      logger.error("Error fetching all favorites:", err as Error, { component: 'bhb' });
    }
  }

  async function fetchCoaches() {
    try {
      const response = await fetch('/api/coaches');
      const data = await response.json();

      if (data.success) {
        setCoachesList(data.coaches);
      }
    } catch (err) {
      logger.error("Error fetching coaches:", err as Error, { component: 'bhb' });
    }
  }

  async function toggleFavorite(shopId: string) {
    const isFavorited = favorites.has(shopId);

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await fetch(
          `/api/coach/favorites?coach_email=${encodeURIComponent(coachEmail)}&shop_id=${shopId}`,
          { method: 'DELETE' }
        );
        const data = await response.json();

        if (data.success) {
          const newFavorites = new Set(favorites);
          newFavorites.delete(shopId);
          setFavorites(newFavorites);
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/coach/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coach_email: coachEmail, shop_id: shopId }),
        });
        const data = await response.json();

        if (data.success) {
          const newFavorites = new Set(favorites);
          newFavorites.add(shopId);
          setFavorites(newFavorites);
        }
      }
    } catch (err) {
      logger.error("Error toggling favorite:", err as Error, { component: 'bhb' });
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
      <PageLayout title="BHB Dashboard - Loading...">
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: layout.spacing.xxl }}>
            <Text>Loading campaign performance data across all stores...</Text>
          </div>
        </Card>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="BHB Dashboard - Error">
        <Card>
          <div style={{ padding: layout.spacing.lg, backgroundColor: colors.error, color: colors.white, borderRadius: layout.cornerRadius }}>
            <Text variant="h3" color={colors.white}>Failed to load dashboard</Text>
            <Text color={colors.white}>{error}</Text>
          </div>
        </Card>
      </PageLayout>
    );
  }

  if (!insights || insights.data.length === 0) {
    return (
      <PageLayout title="BHB Dashboard">
        <Card>
          <div style={{ textAlign: 'center', padding: layout.spacing.xxl }}>
            <Text variant="h2">No active stores found</Text>
            <Text color={colors.grayText}>There are currently no active ACE stores to display.</Text>
          </div>
        </Card>
      </PageLayout>
    );
  }

  const { summary, data: shops } = insights;

  // List of coaches (hardcoded until coach_assigned column is added to database)
  // Coaches list is now fetched from database via API

  // Filter shops by selected coach and search query
  let filteredShops = shops;

  // Filter by coach - when a coach is selected, show only their favorited stores
  if (selectedCoach !== "all") {
    // Get the selected coach's favorites
    const selectedCoachFavorites = new Set<string>();
    if (allFavorites.size > 0) {
      allFavorites.forEach((coachEmails, shopId) => {
        if (coachEmails.includes(selectedCoach)) {
          selectedCoachFavorites.add(shopId);
        }
      });

      filteredShops = filteredShops.filter((shop) =>
        selectedCoachFavorites.has(shop.shop_id)
      );
    }
    // If allFavorites hasn't loaded yet, don't filter
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredShops = filteredShops.filter((shop) =>
      shop.shop_domain.toLowerCase().includes(query)
    );
  }

  // Sort: logged-in coach's favorites first, then alphabetically
  filteredShops.sort((a, b) => {
    const aFavorite = favorites.has(a.shop_id);
    const bFavorite = favorites.has(b.shop_id);

    // Favorites first
    if (aFavorite && !bFavorite) return -1;
    if (!aFavorite && bFavorite) return 1;

    // Then alphabetically by shop domain
    return a.shop_domain.localeCompare(b.shop_domain);
  });

  // Build table data
  const tableData: any[] = [];
  filteredShops.forEach((shop) => {
    const isExpanded = expandedShops.has(shop.shop_id);

    // Shop summary row
    tableData.push({
      type: 'shop',
      shop,
      isExpanded,
    });

    // If expanded, add campaign rows
    if (isExpanded) {
      shop.campaigns.forEach((campaign) => {
        tableData.push({
          type: 'campaign',
          campaign,
          shop,
        });
      });
    }
  });

  const tableColumns = [
    { header: '⭐', key: 'favorite', align: 'center' as const, width: '50px' },
    { header: 'Store / Campaign', key: 'name', align: 'left' as const },
    { header: 'Coach', key: 'coach', align: 'left' as const },
    { header: 'Campaigns', key: 'campaigns', align: 'right' as const },
    { header: 'Spend', key: 'spend', align: 'right' as const },
    { header: 'Purchases', key: 'purchases', align: 'right' as const },
    { header: 'Revenue', key: 'revenue', align: 'right' as const },
    { header: 'Conv. Rate', key: 'conversion', align: 'right' as const },
    { header: 'ROAS', key: 'roas', align: 'right' as const },
    { header: 'Actions', key: 'actions', align: 'center' as const },
  ];

  return (
    <PageLayout title="BoutiqueHub Black Dashboard" subtitle="Campaign Performance Across All ACE Stores">
      <div style={{ display: 'flex', flexDirection: 'column', gap: layout.spacing.lg }}>
        {/* Search and Coach Filter */}
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: layout.spacing.lg }}>
            <div>
              <Input
                label="Search Stores"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by store name..."
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: layout.spacing.sm, fontSize: '11px', fontWeight: 500, color: colors.oxfordNavy }}>
                Filter by Coach
              </label>
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '11px',
                  borderRadius: layout.cornerRadius,
                  border: '1px solid #d9d9d9',
                  backgroundColor: colors.white,
                }}
              >
                <option value="all">All Stores</option>
                {coachesList.map((coach) => (
                  <option key={coach.email} value={coach.email}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: layout.spacing.lg }}>
          <Card>
            <Text variant="cardLabel" style={{ display: 'block', marginBottom: '9px', lineHeight: '1.2' }}>Total Stores</Text>
            <Text variant="cardValue" style={{ display: 'block', marginBottom: '6px', lineHeight: '1.1' }}>{summary.total_shops}</Text>
            <Text variant="bodySmall" color={colors.grayText} style={{ display: 'block', lineHeight: '1.4' }}>{summary.shops_with_facebook} with Facebook Ads</Text>
          </Card>

          <Card>
            <Text variant="cardLabel" style={{ display: 'block', marginBottom: '9px', lineHeight: '1.2' }}>Total Campaigns</Text>
            <Text variant="cardValue" style={{ display: 'block', marginBottom: '6px', lineHeight: '1.1' }}>{summary.total_campaigns}</Text>
            <div style={{ display: 'flex', gap: layout.spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge variant="success">{summary.excellent_campaigns} ★</Badge>
              <Badge variant="success">{summary.good_campaigns} ✓</Badge>
              <Badge variant="warning">{summary.poor_campaigns} ⚠</Badge>
              <Badge variant="error">{summary.critical_campaigns} 🚨</Badge>
            </div>
          </Card>

          <Card>
            <Text variant="cardLabel" style={{ display: 'block', marginBottom: '9px', lineHeight: '1.2' }}>Total Spend (30d)</Text>
            <Text variant="cardValue" style={{ display: 'block', marginBottom: '6px', lineHeight: '1.1' }}>{formatCurrency(summary.total_spend)}</Text>
            <Text variant="bodySmall" color={colors.grayText} style={{ display: 'block', lineHeight: '1.4' }}>{summary.total_purchases} purchases</Text>
          </Card>

          <Card>
            <Text variant="cardLabel" style={{ display: 'block', marginBottom: '9px', lineHeight: '1.2' }}>Average ROAS</Text>
            <Text
              variant="cardValue"
              style={{ display: 'block', marginBottom: '6px', lineHeight: '1.1' }}
              color={
                summary.avg_roas >= 2.0
                  ? colors.success
                  : summary.avg_roas >= 1.0
                    ? colors.oxfordNavy
                    : colors.error
              }
            >
              {summary.avg_roas.toFixed(2)}x
            </Text>
            <Text variant="bodySmall" color={colors.grayText} style={{ display: 'block', lineHeight: '1.4' }}>{formatCurrency(summary.total_purchase_value)} revenue</Text>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: layout.spacing.md }}>
          <Text variant="h2">Store Campaign Performance</Text>
          <Text variant="bodySmall">
            Last updated: {new Date(insights.generated_at).toLocaleString()}
          </Text>
        </div>

        <Table
          columns={tableColumns}
          data={tableData}
          renderCell={(column, row, rowIndex) => {
            if (row.type === 'shop') {
              const shop = row.shop;
              const isExpanded = row.isExpanded;

              switch (column.key) {
                case 'favorite':
                  const isFavorited = favorites.has(shop.shop_id);
                  return (
                    <button
                      onClick={() => toggleFavorite(shop.shop_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        size={20}
                        fill={isFavorited ? '#FFD700' : 'none'}
                        stroke={isFavorited ? '#FFD700' : '#CCCCCC'}
                        strokeWidth={2}
                      />
                    </button>
                  );
                case 'name':
                  // Determine disconnected platforms (only show if they have account_id, meaning they were previously connected)
                  const disconnectedPlatforms: string[] = [];

                  // Facebook Ads - currently active
                  if (!shop.facebook_connected && shop.ad_account_id) {
                    disconnectedPlatforms.push('Facebook Ads');
                  }

                  // Google Ads - ready for future integration
                  if (shop.google_ads_connected === false && shop.google_ad_account_id) {
                    disconnectedPlatforms.push('Google Ads');
                  }

                  // TikTok Ads - ready for future integration
                  if (shop.tiktok_ads_connected === false && shop.tiktok_ad_account_id) {
                    disconnectedPlatforms.push('TikTok Ads');
                  }

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: layout.spacing.sm }}>
                      <a
                        href={`/bhb/store/${shop.shop_id}`}
                        style={{
                          color: colors.smartBlue,
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {shop.shop_domain}
                      </a>
                      {disconnectedPlatforms.length > 0 && (
                        <div
                          title={`Disconnected: ${disconnectedPlatforms.join(', ')}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '18px',
                            height: '18px',
                            backgroundColor: colors.error,
                            borderRadius: '3px',
                            color: colors.white,
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'help',
                          }}
                        >
                          ✕
                        </div>
                      )}
                      {shop.error && <Badge variant="error">Error</Badge>}
                    </div>
                  );
                case 'coach':
                  // Check if multiple coaches have favorited this store
                  const coachesWhoFavorited = allFavorites.get(shop.shop_id) || [];
                  const multipleCoachesFavorited = coachesWhoFavorited.length > 1;

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: layout.spacing.xs }}>
                      <span>{shop.coach_assigned || '—'}</span>
                      {multipleCoachesFavorited && (
                        <span
                          title={`Favorited by: ${coachesWhoFavorited.join(', ')}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 6px',
                            backgroundColor: colors.backgroundLight,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.oxfordNavy,
                            cursor: 'help',
                            border: `1px solid ${colors.smartBlue}`,
                          }}
                        >
                          Coaches ({coachesWhoFavorited.length})
                        </span>
                      )}
                    </div>
                  );
                case 'campaigns':
                  return shop.campaigns.length;
                case 'spend':
                  return formatCurrency(shop.total_spend);
                case 'purchases':
                  return shop.total_purchases;
                case 'revenue':
                  return formatCurrency(shop.total_purchase_value);
                case 'conversion':
                  return formatPercentage(shop.avg_conversion_rate);
                case 'roas':
                  return shop.avg_roas.toFixed(2);
                case 'actions':
                  return (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => toggleShopExpansion(shop.shop_id)}
                    >
                      {isExpanded ? "▼ Hide" : "▶ Show"} Campaigns
                    </Button>
                  );
                default:
                  return '';
              }
            } else if (row.type === 'campaign') {
              const campaign = row.campaign;
              const badge = getPerformanceBadge(campaign.performance_tier);

              switch (column.key) {
                case 'favorite':
                  return '';
                case 'name':
                  return (
                    <div style={{ paddingLeft: layout.spacing.xl, display: 'flex', alignItems: 'center', gap: layout.spacing.sm }}>
                      <Text variant="bodySmall">↳ {campaign.campaign_name}</Text>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  );
                case 'coach':
                  return '';
                case 'campaigns':
                  return '';
                case 'spend':
                  return formatCurrency(campaign.spend);
                case 'purchases':
                  return campaign.purchases;
                case 'revenue':
                  return formatCurrency(campaign.purchase_value);
                case 'conversion':
                  return formatPercentage(campaign.conversion_rate);
                case 'roas':
                  return campaign.roas.toFixed(2);
                case 'actions':
                  return '';
                default:
                  return '';
              }
            }
            return '';
          }}
        />
        </Card>

        {/* Legend */}
        <Card>
          <Text variant="h3" style={{ marginBottom: layout.spacing.md }}>Performance Tier Legend</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: layout.spacing.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: layout.spacing.sm }}>
              <Badge variant="success">🌟 Excellent</Badge>
              <Text variant="bodySmall" color={colors.grayText}>ROAS ≥ 4.0, Conv ≥ 3%, Spend ≥ $100</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: layout.spacing.sm }}>
              <Badge variant="success">✅ Good</Badge>
              <Text variant="bodySmall" color={colors.grayText}>ROAS ≥ 2.5 or Conv ≥ 2%</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: layout.spacing.sm }}>
              <Badge variant="info">➖ Average</Badge>
              <Text variant="bodySmall" color={colors.grayText}>ROAS ≥ 1.5 or Conv ≥ 1%</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: layout.spacing.sm }}>
              <Badge variant="warning">⚠️ Poor</Badge>
              <Text variant="bodySmall" color={colors.grayText}>ROAS &lt; 1.5, Conv &lt; 1%</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: layout.spacing.sm }}>
              <Badge variant="error">🚨 Critical</Badge>
              <Text variant="bodySmall" color={colors.grayText}>Spend &gt; $500, ROAS &lt; 1.0 (burning money)</Text>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
