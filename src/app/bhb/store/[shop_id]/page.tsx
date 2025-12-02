'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, Button, Badge, Input, Table, PageLayout, Text, Icon } from '@/components/bhb';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { getMockStoreDashboard, type StoreDashboardData, type Campaign } from '@/lib/mock-data/store-dashboard-mock';
import { logger } from '@/lib/logger'

export default function StoreDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const shopId = params.shop_id as string;

  const [storeData, setStoreData] = useState<StoreDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'7' | '30' | '60' | '90'>('30');
  const [advertisingGoals, setAdvertisingGoals] = useState('');
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const campaignsPerPage = 10;

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'coach') {
      router.push('/coach/login');
      return;
    }

    // Fetch store data and notes
    async function fetchData() {
      // Get store data (using mock data for now)
      const data = getMockStoreDashboard(shopId);
      if (!data) {
        router.push('/bhb');
        return;
      }

      setStoreData(data);
      setAdvertisingGoals(data.advertisingGoals);

      // Fetch real notes from database
      try {
        const response = await fetch(`/api/coach/notes?shop_id=${shopId}`);
        if (response.ok) {
          const { notes } = await response.json();
          setStoreData(prev => prev ? { ...prev, coachNotes: notes } : null);
        }
      } catch (error) {
        logger.error('[Store Dashboard] Error fetching notes:', error as Error, { component: '[shop_id]' });
      }

      setLoading(false);
    }

    fetchData();
  }, [session, status, shopId, router]);

  if (loading || !storeData) {
    return (
      <PageLayout title="Loading...">
        <Card>
          <Text>Loading store dashboard...</Text>
        </Card>
      </PageLayout>
    );
  }

  const handleSaveGoals = () => {
    // TODO: Save to database via API
    setIsEditingGoals(false);
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const response = await fetch('/api/coach/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          content: newNoteContent,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();

        // Update local state with the new note
        setStoreData({
          ...storeData!,
          coachNotes: [note, ...storeData!.coachNotes],
        });

        setNewNoteContent('');
        setShowAddNote(false);
      } else {
        const { error } = await response.json();
        logger.error('[Store Dashboard] Error saving note:', error as Error, { component: '[shop_id]' });
        alert('Failed to save note. Please try again.');
      }
    } catch (error) {
      logger.error('[Store Dashboard] Error saving note:', error as Error, { component: '[shop_id]' });
      alert('Failed to save note. Please try again.');
    }
  };

  // Group campaigns by platform
  const groupedCampaigns = storeData.campaigns.reduce((acc, campaign) => {
    if (!acc[campaign.platform]) {
      acc[campaign.platform] = [];
    }
    acc[campaign.platform].push(campaign);
    return acc;
  }, {} as Record<string, Campaign[]>);

  const platformNames = {
    meta: 'Meta',
    google: 'Google',
    tiktok: 'TikTok',
    pinterest: 'Pinterest',
  };

  const platformColors = {
    meta: 'success' as const,
    google: 'info' as const,
    tiktok: 'warning' as const,
    pinterest: 'error' as const,
  };

  // Build all campaign table data
  const allCampaignData: any[] = [];
  Object.entries(groupedCampaigns).forEach(([platform, campaigns]) => {
    campaigns.forEach((campaign) => {
      allCampaignData.push({
        ...campaign,
        platform,
        platformName: platformNames[platform as keyof typeof platformNames],
        platformColor: platformColors[platform as keyof typeof platformColors],
      });
    });
  });

  // Pagination logic
  const totalPages = Math.ceil(allCampaignData.length / campaignsPerPage);
  const startIndex = (currentPage - 1) * campaignsPerPage;
  const endIndex = startIndex + campaignsPerPage;
  const paginatedCampaigns = allCampaignData.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const campaignColumns = [
    { header: 'Campaign Name', key: 'name', align: 'left' as const },
    { header: 'Platform', key: 'platform', align: 'left' as const },
    { header: 'Status', key: 'status', align: 'left' as const },
    { header: 'Spend', key: 'spend', align: 'right' as const },
    { header: 'Impressions', key: 'impressions', align: 'right' as const },
    { header: 'Clicks', key: 'clicks', align: 'right' as const },
    { header: 'CTR', key: 'ctr', align: 'right' as const },
    { header: 'Conversions', key: 'conversions', align: 'right' as const },
    { header: 'ROAS', key: 'roas', align: 'right' as const },
    { header: 'Actions', key: 'actions', align: 'center' as const },
  ];

  const productColumns = [
    { header: 'Product', key: 'name', align: 'left' as const },
    { header: 'Sales', key: 'sales', align: 'right' as const },
    { header: 'Revenue', key: 'revenue', align: 'right' as const },
  ];

  const categoryColumns = [
    { header: 'Category', key: 'name', align: 'left' as const },
    { header: 'Sales', key: 'salesCount', align: 'right' as const },
    { header: 'Revenue', key: 'revenue', align: 'right' as const },
  ];

  return (
    <PageLayout
      title={storeData.shopName}
      subtitle={`Store Dashboard - ${storeData.ownerInfo.industryNiche}`}
      backLink={{ label: 'BHB Dashboard', href: '/bhb' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: layout.spacing.xl }}>
        {/* Store Overview Header */}
        <Card>
        <Text variant="h2" style={{ marginBottom: layout.spacing.md }}>Store Information</Text>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: layout.spacing.lg }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: layout.spacing.sm, flex: 1 }}>
            <div style={{ display: 'flex', gap: layout.spacing.lg, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: layout.spacing.xs, alignItems: 'center' }}>
                <Icon name="user" size={16} color={colors.grayText} />
                <Text variant="bodySmall">{storeData.ownerInfo.name}</Text>
              </div>
              <div style={{ display: 'flex', gap: layout.spacing.xs, alignItems: 'center' }}>
                <Text variant="bodySmall">{storeData.ownerInfo.email}</Text>
              </div>
              <div style={{ display: 'flex', gap: layout.spacing.xs, alignItems: 'center' }}>
                <Text variant="bodySmall">{storeData.ownerInfo.phone}</Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: layout.spacing.lg, flexWrap: 'wrap', alignItems: 'center' }}>
              {storeData.ownerInfo.city && storeData.ownerInfo.state && (
                <div style={{ display: 'flex', gap: layout.spacing.xs, alignItems: 'center' }}>
                  <Text variant="bodySmall">{storeData.ownerInfo.city}, {storeData.ownerInfo.state}</Text>
                </div>
              )}
              {storeData.ownerInfo.storeType && (
                <div style={{ display: 'flex', gap: layout.spacing.xs, alignItems: 'center' }}>
                  <Text variant="bodySmall">
                    {storeData.ownerInfo.storeType === 'both' ? 'Online & Physical' : storeData.ownerInfo.storeType === 'online' ? 'Online Only' : 'Physical Store'}
                  </Text>
                </div>
              )}
              {storeData.ownerInfo.ecommercePlatform && (
                <div style={{ display: 'flex', gap: layout.spacing.xs, alignItems: 'center' }}>
                  <Text variant="bodySmall">
                    {storeData.ownerInfo.ecommercePlatform.charAt(0).toUpperCase() + storeData.ownerInfo.ecommercePlatform.slice(1)}
                  </Text>
                </div>
              )}
              <div style={{ display: 'flex', gap: layout.spacing.xs, alignItems: 'center' }}>
                <Icon name="calendar" size={16} color={colors.grayText} />
                <Text variant="bodySmall">{storeData.ownerInfo.yearsInBusiness} years in business</Text>
              </div>
            </div>
          </div>

          <div>
            <Text variant="bodySmall" style={{ marginBottom: layout.spacing.sm }}>Connected Platforms</Text>
            <div style={{ display: 'flex', gap: layout.spacing.sm }}>
              {storeData.connectedPlatforms.map(platform => (
                <Badge key={platform} variant="success">
                  ✓ {platformNames[platform]}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Advertising Goals */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: layout.spacing.md }}>
          <Text variant="h2">Advertising Goals</Text>
          {!isEditingGoals ? (
            <Button onClick={() => setIsEditingGoals(true)}>Edit</Button>
          ) : (
            <div style={{ display: 'flex', gap: layout.spacing.sm }}>
              <Button variant="outline" onClick={() => {
                setAdvertisingGoals(storeData.advertisingGoals);
                setIsEditingGoals(false);
              }}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveGoals}>Save</Button>
            </div>
          )}
        </div>

        {isEditingGoals ? (
          <Input
            value={advertisingGoals}
            onChange={setAdvertisingGoals}
            multiline={4}
          />
        ) : (
          <Text color={colors.grayText}>{advertisingGoals}</Text>
        )}
      </Card>

      {/* Active Campaigns */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: layout.spacing.md }}>
          <Text variant="h2">Active Campaigns</Text>
          <div style={{ display: 'flex', gap: '0', border: `1px solid ${colors.smartBlue}`, borderRadius: layout.cornerRadius, overflow: 'hidden' }}>
            {(['7', '30', '60', '90'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: timePeriod === period ? colors.smartBlue : colors.white,
                  color: timePeriod === period ? colors.white : colors.smartBlue,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {period} days
              </button>
            ))}
          </div>
        </div>

        <Table
          columns={campaignColumns}
          data={paginatedCampaigns}
          renderCell={(column, row) => {
            switch (column.key) {
              case 'name':
                return <Text style={{ fontWeight: 600 }}>{row.name}</Text>;
              case 'platform':
                return <Badge variant={row.platformColor}>{row.platformName}</Badge>;
              case 'status':
                return <Badge variant={row.status === 'active' ? 'success' : 'info'}>{row.status}</Badge>;
              case 'spend':
                return `$${row.spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              case 'impressions':
                return row.impressions.toLocaleString();
              case 'clicks':
                return row.clicks.toLocaleString();
              case 'ctr':
                return `${row.ctr.toFixed(1)}%`;
              case 'conversions':
                return row.conversions;
              case 'roas':
                return (
                  <Text
                    style={{ fontWeight: 600 }}
                    color={row.roas >= 4 ? colors.success : row.roas >= 2 ? colors.brightAmber : colors.error}
                  >
                    {row.roas.toFixed(1)}x
                  </Text>
                );
              case 'actions':
                return <Button size="small" variant="text">View</Button>;
              default:
                return row[column.key];
            }
          }}
        />

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: layout.spacing.md, gap: layout.spacing.md, alignItems: 'center' }}>
            <Button size="small" onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</Button>
            <Text variant="bodySmall">Page {currentPage} of {totalPages}</Text>
            <Button size="small" onClick={handleNextPage} disabled={currentPage === totalPages}>Next</Button>
          </div>
        )}
      </Card>

      {/* Product Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: layout.spacing.md, marginBottom: layout.spacing.lg }}>
        <Card>
          <Text variant="h2" style={{ marginBottom: layout.spacing.md }}>Average Order Value</Text>
          <Text variant="cardValue" style={{ marginBottom: layout.spacing.sm }}>
            ${storeData.metrics.averageOrderValue.toFixed(2)}
          </Text>
          <Text variant="bodySmall">Last 30 days</Text>
        </Card>

        <Card>
          <Text variant="h2" style={{ marginBottom: layout.spacing.md }}>Top Products</Text>
          <Table
            columns={productColumns}
            data={storeData.metrics.topProducts}
            renderCell={(column, row) => {
              switch (column.key) {
                case 'name':
                  return <Text style={{ fontWeight: 600 }}>{row.name}</Text>;
                case 'sales':
                  return row.sales;
                case 'revenue':
                  return `$${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                default:
                  return row[column.key];
              }
            }}
          />
        </Card>

        <Card>
          <Text variant="h2" style={{ marginBottom: layout.spacing.md }}>Top Categories</Text>
          <Table
            columns={categoryColumns}
            data={storeData.metrics.topCategories}
            renderCell={(column, row) => {
              switch (column.key) {
                case 'name':
                  return <Text style={{ fontWeight: 600 }}>{row.name}</Text>;
                case 'salesCount':
                  return row.salesCount;
                case 'revenue':
                  return `$${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                default:
                  return row[column.key];
              }
            }}
          />
        </Card>
      </div>

      {/* Coach Notes */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: layout.spacing.md }}>
          <Text variant="h2">Coach Notes</Text>
          {!showAddNote ? (
            <Button onClick={() => setShowAddNote(true)}>Add Note</Button>
          ) : (
            <div style={{ display: 'flex', gap: layout.spacing.sm }}>
              <Button variant="outline" onClick={() => {
                setNewNoteContent('');
                setShowAddNote(false);
              }}>Cancel</Button>
              <Button variant="primary" onClick={handleAddNote}>Save Note</Button>
            </div>
          )}
        </div>

        {showAddNote && (
          <div style={{ marginBottom: layout.spacing.md }}>
            <Input
              value={newNoteContent}
              onChange={setNewNoteContent}
              multiline={4}
              placeholder="Enter your coaching notes, recommendations, or observations about this store..."
            />
          </div>
        )}

        {storeData.coachNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: layout.spacing.lg }}>
            <Text color={colors.grayText}>
              No notes yet. Add your first note to track coaching sessions and recommendations.
            </Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: layout.spacing.md }}>
            {storeData.coachNotes.map((note, index) => (
              <div key={note.id}>
                {index > 0 && <div style={{ borderTop: `1px solid ${colors.backgroundLight}`, marginBottom: layout.spacing.md }} />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: layout.spacing.sm }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 600 }}>{note.coachName}</Text>
                    <Text variant="bodySmall">
                      {new Date(note.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </div>
                  <Text color={colors.grayText}>{note.content}</Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>
    </PageLayout>
  );
}
