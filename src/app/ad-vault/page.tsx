'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, Input, Table, PageLayout, Text } from '@/features/bhb';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { logger } from '@/lib/logger'

interface AdVariant {
  id: string;
  headline: string;
  primary_text: string;
  description: string;
  predicted_score: number;
  variant_type: string;
  created_at: string;
  ad_request: {
    platform: string;
    goal: string;
    shop: {
      shop_domain: string;
      display_name: string;
      store_name: string;
    };
  };
}

export default function AdVaultPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [variants, setVariants] = useState<AdVariant[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<AdVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<AdVariant | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filter states
  const [searchValue, setSearchValue] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 10]);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'coach')) {
      router.push('/coach/login');
    } else if (status === 'authenticated') {
      fetchAdVault();
    }
  }, [status, session, router]);

  const fetchAdVault = async () => {
    try {
      const params = new URLSearchParams();
      if (platformFilter !== 'all') {
        params.append('platform', platformFilter);
      }
      params.append('minScore', scoreRange[0].toString());
      params.append('maxScore', scoreRange[1].toString());

      const response = await fetch(`/api/coach/ad-vault?${params}`);
      const data = await response.json();

      if (response.ok) {
        setVariants(data.variants || []);
        setFilteredVariants(data.variants || []);
      }
    } catch (error) {
      logger.error('[Ad Vault] Error fetching ads:', error as Error, { component: 'ad-vault' });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = variants;

    // Search filter
    if (searchValue) {
      const term = searchValue.toLowerCase();
      filtered = filtered.filter(v =>
        v.headline?.toLowerCase().includes(term) ||
        v.primary_text?.toLowerCase().includes(term) ||
        v.ad_request?.shop?.shop_domain?.toLowerCase().includes(term) ||
        v.ad_request?.shop?.display_name?.toLowerCase().includes(term)
      );
    }

    setFilteredVariants(filtered);
  }, [searchValue, variants]);

  const viewAdDetails = (ad: AdVariant) => {
    setSelectedAd(ad);
    setShowModal(true);
  };

  if (status === 'loading' || loading) {
    return (
      <PageLayout title="Ad Vault - Loading...">
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: layout.spacing.xxl }}>
            <Text>Loading ad vault...</Text>
          </div>
        </Card>
      </PageLayout>
    );
  }

  const tableColumns = [
    { header: 'Store', key: 'store', align: 'left' as const },
    { header: 'Headline', key: 'headline', align: 'left' as const },
    { header: 'Platform', key: 'platform', align: 'left' as const },
    { header: 'Goal', key: 'goal', align: 'left' as const },
    { header: 'Score', key: 'score', align: 'center' as const },
    { header: 'Created', key: 'created', align: 'left' as const },
    { header: 'Actions', key: 'actions', align: 'center' as const },
  ];

  return (
    <PageLayout title="Ad Vault" subtitle="All ad variants across all stores">
      <Card style={{ marginBottom: layout.spacing.lg }}>
        <div style={{ display: 'flex', gap: layout.spacing.md, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <Input
              label="Search"
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Search by headline, copy, or store name"
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: layout.spacing.sm, fontSize: '14px', fontWeight: 500, color: colors.oxfordNavy }}>
              Platform
            </label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                borderRadius: layout.cornerRadius,
                border: '1px solid #d9d9d9',
                backgroundColor: colors.white,
              }}
            >
              <option value="all">All Platforms</option>
              <option value="meta">Meta (Facebook/Instagram)</option>
              <option value="google">Google Ads</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          <div style={{ minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: layout.spacing.sm, fontSize: '14px', fontWeight: 500, color: colors.oxfordNavy }}>
              Score Range: {scoreRange[0]} - {scoreRange[1]}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={scoreRange[1]}
              onChange={(e) => setScoreRange([scoreRange[0], parseFloat(e.target.value)])}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Card>

      <Card>
        {filteredVariants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: layout.spacing.xxl }}>
            <Text variant="h2">No ads found</Text>
            <Text color={colors.grayText}>Try adjusting your filters or search criteria.</Text>
          </div>
        ) : (
          <>
            <Table
              columns={tableColumns}
              data={filteredVariants}
              renderCell={(column, row) => {
                const storeName = row.ad_request?.shop?.display_name ||
                                  row.ad_request?.shop?.store_name ||
                                  row.ad_request?.shop?.shop_domain ||
                                  'Unknown Store';

                switch (column.key) {
                  case 'store':
                    return storeName;
                  case 'headline':
                    return row.headline || 'No headline';
                  case 'platform':
                    return row.ad_request?.platform || 'N/A';
                  case 'goal':
                    return row.ad_request?.goal || 'N/A';
                  case 'score':
                    return row.predicted_score ? (
                      <Badge variant={row.predicted_score >= 7 ? 'success' : row.predicted_score >= 5 ? 'warning' : 'error'}>
                        {row.predicted_score.toFixed(1)}
                      </Badge>
                    ) : 'N/A';
                  case 'created':
                    return new Date(row.created_at).toLocaleDateString();
                  case 'actions':
                    return <Button size="small" variant="text" onClick={() => viewAdDetails(row)}>View</Button>;
                  default:
                    return '';
                }
              }}
            />

            <div style={{ padding: layout.spacing.md, textAlign: 'center', borderTop: `1px solid ${colors.backgroundLight}`, marginTop: layout.spacing.md }}>
              <Text variant="bodySmall">
                Showing {filteredVariants.length} of {variants.length} ads
              </Text>
            </div>
          </>
        )}
      </Card>

      {/* Ad Detail Modal */}
      {showModal && selectedAd && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: layout.spacing.lg,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: colors.white,
              borderRadius: layout.cornerRadius,
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: layout.spacing.lg }}>
                <Text variant="h2">{selectedAd.headline || 'Ad Details'}</Text>
                <Button variant="text" onClick={() => setShowModal(false)}>✕</Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: layout.spacing.lg }}>
                <div>
                  <Text variant="h3" style={{ marginBottom: layout.spacing.sm }}>Store</Text>
                  <Text>
                    {selectedAd.ad_request?.shop?.display_name ||
                     selectedAd.ad_request?.shop?.store_name ||
                     selectedAd.ad_request?.shop?.shop_domain}
                  </Text>
                </div>

                <div>
                  <Text variant="h3" style={{ marginBottom: layout.spacing.sm }}>Platform & Goal</Text>
                  <Text>{selectedAd.ad_request?.platform} - {selectedAd.ad_request?.goal}</Text>
                </div>

                <div>
                  <Text variant="h3" style={{ marginBottom: layout.spacing.sm }}>Headline</Text>
                  <Text>{selectedAd.headline}</Text>
                </div>

                <div>
                  <Text variant="h3" style={{ marginBottom: layout.spacing.sm }}>Primary Text</Text>
                  <Text>{selectedAd.primary_text}</Text>
                </div>

                {selectedAd.description && (
                  <div>
                    <Text variant="h3" style={{ marginBottom: layout.spacing.sm }}>Description</Text>
                    <Text>{selectedAd.description}</Text>
                  </div>
                )}

                <div>
                  <Text variant="h3" style={{ marginBottom: layout.spacing.sm }}>Predicted Score</Text>
                  <Badge variant={selectedAd.predicted_score >= 7 ? 'success' : selectedAd.predicted_score >= 5 ? 'warning' : 'error'}>
                    {selectedAd.predicted_score?.toFixed(2) || 'N/A'}
                  </Badge>
                </div>

                <div>
                  <Text variant="h3" style={{ marginBottom: layout.spacing.sm }}>Variant Type</Text>
                  <Text>{selectedAd.variant_type}</Text>
                </div>

                <div>
                  <Text variant="h3" style={{ marginBottom: layout.spacing.sm }}>Created</Text>
                  <Text>{new Date(selectedAd.created_at).toLocaleString()}</Text>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
