/**
 * Ad Library Page
 * Displays store's ad library with tabs for different statuses
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Page,
  Layout,
  Card,
  Tabs,
  EmptyState,
  Badge,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Spinner,
  Banner,
  Divider,
  TextField,
} from '@shopify/polaris';
import { PlusIcon } from '@shopify/polaris-icons';

interface AdLibraryItem {
  id: string;
  shop_id: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  headline: string;
  primary_text: string;
  description: string | null;
  cta: string;
  platform: string;
  campaign_goal: string;
  variant_type: string | null;
  image_urls: string[];
  product_metadata: {
    products?: Array<{
      id: string;
      title: string;
      handle: string;
    }>;
  };
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
}

interface AdCardProps {
  ad: AdLibraryItem;
  onStatusChange: (adId: string, newStatus: string) => void;
  onEdit: (ad: AdLibraryItem) => void;
}

function AdCard({ ad, onStatusChange, onEdit }: AdCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge tone="info">Draft</Badge>;
      case 'active':
        return <Badge tone="success">Active</Badge>;
      case 'paused':
        return <Badge tone="warning">Paused</Badge>;
      case 'archived':
        return <Badge>Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const hasMetrics = ad.impressions > 0 || ad.clicks > 0;

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header with status and date */}
        <InlineStack align="space-between" blockAlign="center">
          {getStatusBadge(ad.status)}
          <Text as="p" variant="bodySm" tone="subdued">
            Created {formatDate(ad.created_at)}
          </Text>
        </InlineStack>

        {/* Media Section */}
        {ad.image_urls && ad.image_urls.length > 0 && (
          <>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" fontWeight="semibold">
                Media ({ad.image_urls.length} {ad.image_urls.length === 1 ? 'image' : 'images'})
              </Text>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  maxWidth: '50%',
                }}
              >
                {ad.image_urls.slice(0, 4).map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      paddingBottom: '100%',
                      backgroundColor: '#f6f6f7',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Ad image ${idx + 1}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                ))}
                {ad.image_urls.length > 4 && (
                  <div
                    style={{
                      position: 'relative',
                      paddingBottom: '100%',
                      backgroundColor: '#f6f6f7',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text as="p" variant="bodySm" tone="subdued" fontWeight="semibold">
                      +{ad.image_urls.length - 4}
                    </Text>
                  </div>
                )}
              </div>
              {ad.image_urls.length > 1 && (
                <Text as="p" variant="bodyXs" tone="subdued" alignment="center">
                  Carousel
                </Text>
              )}
            </BlockStack>
            <Divider />
          </>
        )}

        {/* Ad Content */}
        <BlockStack gap="200">
          <Text as="h3" variant="headingMd" fontWeight="bold">
            {ad.headline}
          </Text>
          <Text as="p" variant="bodyMd">
            {ad.primary_text}
          </Text>
          {ad.description && (
            <Text as="p" variant="bodySm" tone="subdued">
              {ad.description}
            </Text>
          )}
          <InlineStack gap="200" align="start">
            <Badge tone="info">{ad.cta}</Badge>
            <Badge>{ad.platform}</Badge>
            <Badge>{ad.campaign_goal}</Badge>
          </InlineStack>
        </BlockStack>

        {/* Product Info */}
        {ad.product_metadata?.products && ad.product_metadata.products.length > 0 && (
          <BlockStack gap="100">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              Products
            </Text>
            {ad.product_metadata.products.map((product) => (
              <Text key={product.id} as="p" variant="bodyXs" tone="subdued">
                • {product.title}
              </Text>
            ))}
          </BlockStack>
        )}

        {/* Metrics (if available) */}
        {hasMetrics && (
          <>
            <Divider />
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" fontWeight="semibold">
                Performance
              </Text>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '8px',
                }}
              >
                <BlockStack gap="050">
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Impressions
                  </Text>
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    {ad.impressions.toLocaleString()}
                  </Text>
                </BlockStack>
                <BlockStack gap="050">
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Clicks
                  </Text>
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    {ad.clicks.toLocaleString()}
                  </Text>
                </BlockStack>
                {ad.conversions > 0 && (
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      Conversions
                    </Text>
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      {ad.conversions.toLocaleString()}
                    </Text>
                  </BlockStack>
                )}
                {ad.ctr !== null && (
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      CTR
                    </Text>
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      {ad.ctr.toFixed(2)}%
                    </Text>
                  </BlockStack>
                )}
                {ad.roas !== null && ad.roas > 0 && (
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      ROAS
                    </Text>
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      {ad.roas.toFixed(2)}x
                    </Text>
                  </BlockStack>
                )}
              </div>
            </BlockStack>
          </>
        )}

        {/* Actions */}
        <Divider />
        <InlineStack gap="200">
          {ad.status === 'draft' && (
            <Button onClick={() => onStatusChange(ad.id, 'active')}>Activate</Button>
          )}
          {ad.status === 'active' && (
            <Button onClick={() => onStatusChange(ad.id, 'paused')}>Pause</Button>
          )}
          {ad.status === 'paused' && (
            <>
              <Button onClick={() => onStatusChange(ad.id, 'active')}>Resume</Button>
              <Button onClick={() => onStatusChange(ad.id, 'archived')}>Archive</Button>
            </>
          )}
          {ad.status !== 'archived' && <Button onClick={() => onEdit(ad)}>Edit</Button>}
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

export default function AdLibraryPage() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || 'demo-shop';

  const [selected, setSelected] = useState(0);
  const [ads, setAds] = useState<AdLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerMessage, setBannerMessage] = useState<string>('');
  const [bannerTone, setBannerTone] = useState<'success' | 'critical' | 'info'>('info');

  const tabs = [
    { id: 'all', content: 'All', panelID: 'all-ads' },
    { id: 'draft', content: 'Drafts', panelID: 'draft-ads' },
    { id: 'active', content: 'Active', panelID: 'active-ads' },
    { id: 'paused', content: 'Paused', panelID: 'paused-ads' },
    { id: 'archived', content: 'Archived', panelID: 'archived-ads' },
  ];

  const currentTab = tabs[selected];
  const statusFilter = currentTab.id === 'all' ? null : currentTab.id;

  const fetchAds = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/aie/library', window.location.origin);
      url.searchParams.set('shopId', shop);
      if (statusFilter) {
        url.searchParams.set('status', statusFilter);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success) {
        setAds(data.data.ads || []);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch ads');
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      setBannerMessage(error instanceof Error ? error.message : 'Failed to load ads');
      setBannerTone('critical');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [shop, selected]);

  const handleStatusChange = async (adId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/aie/library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setBannerMessage('Ad status updated successfully');
        setBannerTone('success');
        fetchAds(); // Refresh the list
      } else {
        throw new Error(data.error?.message || 'Failed to update ad');
      }
    } catch (error) {
      console.error('Error updating ad:', error);
      setBannerMessage(error instanceof Error ? error.message : 'Failed to update ad status');
      setBannerTone('critical');
    }
  };

  const handleEdit = (ad: AdLibraryItem) => {
    // Future: Open edit modal
    console.log('Edit ad:', ad);
    setBannerMessage('Edit functionality coming soon');
    setBannerTone('info');
  };

  const filteredAds = ads;
  const adCount = filteredAds.length;

  return (
    <Page
      title="Ad Library"
      primaryAction={{
        content: 'Generate New Ad',
        icon: PlusIcon,
        url: `/aie?shop=${shop}`,
      }}
    >
      <Layout>
        {bannerMessage && (
          <Layout.Section>
            <Banner tone={bannerTone} onDismiss={() => setBannerMessage('')}>
              {bannerMessage}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="0">
            <Tabs tabs={tabs} selected={selected} onSelect={setSelected}>
              <div style={{ padding: '16px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spinner size="large" />
                  </div>
                ) : filteredAds.length === 0 ? (
                  <EmptyState
                    heading={
                      statusFilter
                        ? `No ${statusFilter} ads yet`
                        : 'No ads in your library yet'
                    }
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      {statusFilter === 'draft'
                        ? 'Generate your first ad to get started'
                        : statusFilter
                        ? `No ads with "${statusFilter}" status`
                        : 'Start by generating some ads'}
                    </p>
                    <Button url={`/aie?shop=${shop}`} variant="primary">
                      Generate New Ad
                    </Button>
                  </EmptyState>
                ) : (
                  <BlockStack gap="400">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {adCount} {adCount === 1 ? 'ad' : 'ads'}
                    </Text>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                      }}
                    >
                      {filteredAds.map((ad) => (
                        <AdCard
                          key={ad.id}
                          ad={ad}
                          onStatusChange={handleStatusChange}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </BlockStack>
                )}
              </div>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
