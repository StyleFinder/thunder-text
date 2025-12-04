/**
 * Mock data for Store Dashboard testing
 * Used while building out actual API integrations for Meta, Google, TikTok, Pinterest
 */

export interface Campaign {
  id: string;
  name: string;
  platform: 'meta' | 'google' | 'tiktok' | 'pinterest';
  status: 'active' | 'paused' | 'completed';
  budget?: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc?: number;
  conversions: number;
  conversionRate?: number;
  revenue?: number;
  roas: number;
  startDate: string;
  endDate?: string;
}

export interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  imageUrl?: string;
}

export interface StoreOwnerInfo {
  name: string;
  email: string;
  phone: string;
  industryNiche: string;
  yearsInBusiness: number;
  city: string;
  state: string;
  storeType: 'online' | 'brick-and-mortar' | 'both';
  ecommercePlatform: 'shopify' | 'woocommerce' | 'bigcommerce' | 'custom' | 'other';
}

export interface StoreMetrics {
  averageOrderValue: number;
  topProducts: TopProduct[];
  topCategories: Array<{
    name: string;
    salesCount: number;
    revenue: number;
  }>;
}

export interface CoachNote {
  id: string;
  coachName: string;
  content: string;
  createdAt: string;
}

export interface StoreDashboardData {
  shopId: string;
  shopName: string;
  ownerInfo: StoreOwnerInfo;
  connectedPlatforms: Array<'meta' | 'google' | 'tiktok' | 'pinterest'>;
  advertisingGoals: string;
  campaigns: Campaign[];
  metrics: StoreMetrics;
  coachNotes: CoachNote[];
}

// Mock data for testing
export const mockStoreDashboard: StoreDashboardData = {
  shopId: '38b6c917-c23d-4fa6-9fa3-165f7ca959d2',
  shopName: 'Chic Boutique',
  ownerInfo: {
    name: 'Sarah Johnson',
    email: 'sarah@chicboutique.com',
    phone: '(555) 123-4567',
    industryNiche: "Women's Clothing",
    yearsInBusiness: 3,
    city: 'Austin',
    state: 'TX',
    storeType: 'both',
    ecommercePlatform: 'shopify'
  },
  connectedPlatforms: ['meta', 'google'],
  advertisingGoals: 'Increase brand awareness and drive sales for new summer collection. Target ROAS of 4.0+ and expand customer base by 25% in Q2 2025.',
  campaigns: [
    // Meta Campaigns
    {
      id: 'meta-1',
      name: 'Summer Collection Launch',
      platform: 'meta',
      status: 'active',
      spend: 1245.50,
      impressions: 45230,
      clicks: 1356,
      ctr: 3.0,
      conversions: 89,
      roas: 4.2,
      startDate: '2025-10-01',
    },
    {
      id: 'meta-2',
      name: 'Retargeting - Cart Abandoners',
      platform: 'meta',
      status: 'active',
      spend: 567.25,
      impressions: 18900,
      clicks: 892,
      ctr: 4.7,
      conversions: 67,
      roas: 5.8,
      startDate: '2025-10-15',
    },
    {
      id: 'meta-3',
      name: 'New Customer Acquisition',
      platform: 'meta',
      status: 'active',
      spend: 890.00,
      impressions: 32100,
      clicks: 1023,
      ctr: 3.2,
      conversions: 45,
      roas: 3.1,
      startDate: '2025-10-20',
    },
    // Google Campaigns
    {
      id: 'google-1',
      name: 'Shopping - Best Sellers',
      platform: 'google',
      status: 'active',
      spend: 678.90,
      impressions: 28450,
      clicks: 756,
      ctr: 2.7,
      conversions: 52,
      roas: 4.5,
      startDate: '2025-10-05',
    },
    {
      id: 'google-2',
      name: 'Search - Brand Terms',
      platform: 'google',
      status: 'active',
      spend: 345.75,
      impressions: 12300,
      clicks: 489,
      ctr: 4.0,
      conversions: 38,
      roas: 6.2,
      startDate: '2025-10-10',
    },
  ],
  metrics: {
    averageOrderValue: 87.50,
    topProducts: [
      {
        id: 'prod-1',
        name: 'Floral Maxi Dress',
        sales: 156,
        revenue: 12480.00,
      },
      {
        id: 'prod-2',
        name: 'Denim Jacket - Classic Blue',
        sales: 134,
        revenue: 10720.00,
      },
      {
        id: 'prod-3',
        name: 'Silk Blouse - White',
        sales: 98,
        revenue: 6370.00,
      },
      {
        id: 'prod-4',
        name: 'High-Waist Jeans',
        sales: 87,
        revenue: 6960.00,
      },
      {
        id: 'prod-5',
        name: 'Summer Sandals',
        sales: 76,
        revenue: 3040.00,
      },
    ],
    topCategories: [
      {
        name: 'Dresses',
        salesCount: 287,
        revenue: 22960.00,
      },
      {
        name: 'Tops & Blouses',
        salesCount: 245,
        revenue: 15925.00,
      },
      {
        name: 'Bottoms',
        salesCount: 198,
        revenue: 15840.00,
      },
      {
        name: 'Outerwear',
        salesCount: 156,
        revenue: 18720.00,
      },
      {
        name: 'Accessories',
        salesCount: 134,
        revenue: 5360.00,
      },
    ],
  },
  coachNotes: [
    {
      id: 'note-1',
      coachName: 'Michael Chen',
      content: 'Initial consultation completed. Sarah is very motivated and has clear goals. Recommended focusing on Meta retargeting given the strong ROAS. Will follow up in 2 weeks to review performance.',
      createdAt: '2025-10-01T14:30:00Z',
    },
    {
      id: 'note-2',
      coachName: 'Jessica Rivera',
      content: 'Covering for Michael this week. Reviewed campaign performance - Meta retargeting is performing exceptionally well at 5.8 ROAS. Suggested increasing budget by 20%. New customer acquisition campaign needs optimization - CTR is good but conversions are lower than expected.',
      createdAt: '2025-10-22T10:15:00Z',
    },
  ],
};

// Additional mock stores for BHB dashboard list
export const mockStores = [
  {
    id: '38b6c917-c23d-4fa6-9fa3-165f7ca959d2',
    shopName: 'Chic Boutique',
    displayName: 'Chic Boutique',
    ownerName: 'Sarah Johnson',
    industryNiche: "Women's Clothing",
    city: 'Austin',
    state: 'TX',
    storeType: 'both' as const,
    ecommercePlatform: 'shopify' as const,
    totalSpend: 3727.40,
    totalRevenue: 15689.75,
    roas: 4.2,
    connectedPlatforms: ['meta', 'google'],
  },
  {
    id: '11111111-1111-1111-1111-111111111111',
    shopName: 'Baby Bliss Co',
    displayName: 'Baby Bliss Co',
    ownerName: 'Amanda Martinez',
    industryNiche: 'Baby Goods',
    city: 'Portland',
    state: 'OR',
    storeType: 'online' as const,
    ecommercePlatform: 'shopify' as const,
    totalSpend: 2156.80,
    totalRevenue: 9627.60,
    roas: 4.5,
    connectedPlatforms: ['meta', 'pinterest'],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    shopName: 'Glow Beauty Bar',
    displayName: 'Glow Beauty Bar',
    ownerName: 'Priya Patel',
    industryNiche: 'Health & Beauty',
    city: 'Los Angeles',
    state: 'CA',
    storeType: 'both' as const,
    ecommercePlatform: 'shopify' as const,
    totalSpend: 4890.25,
    totalRevenue: 19561.00,
    roas: 4.0,
    connectedPlatforms: ['meta', 'google', 'tiktok'],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    shopName: 'Rustic Home Goods',
    displayName: 'Rustic Home Goods',
    ownerName: 'Tom Davidson',
    industryNiche: 'Home Goods',
    city: 'Nashville',
    state: 'TN',
    storeType: 'brick-and-mortar' as const,
    ecommercePlatform: 'woocommerce' as const,
    totalSpend: 1567.50,
    totalRevenue: 5495.25,
    roas: 3.5,
    connectedPlatforms: ['meta', 'google'],
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    shopName: 'Wild West Apparel',
    displayName: 'Wild West Apparel',
    ownerName: 'Jake Thompson',
    industryNiche: 'Western Wear',
    city: 'Denver',
    state: 'CO',
    storeType: 'online' as const,
    ecommercePlatform: 'bigcommerce' as const,
    totalSpend: 3245.90,
    totalRevenue: 14206.05,
    roas: 4.4,
    connectedPlatforms: ['meta'],
  },
];

// Helper function to get mock data by shop ID
export function getMockStoreDashboard(shopId: string): StoreDashboardData | null {
  if (shopId === '38b6c917-c23d-4fa6-9fa3-165f7ca959d2') {
    return mockStoreDashboard;
  }

  // For other shops, generate realistic mock data with campaigns
  const store = mockStores.find(s => s.id === shopId);
  if (!store) return null;

  // Generate 2-4 mock campaigns per store
  const numCampaigns = Math.floor(Math.random() * 3) + 2;
  const mockCampaigns: Campaign[] = [];

  const campaignTypes = ['Product Launch', 'Seasonal Sale', 'Brand Awareness', 'Retargeting', 'Collection Promotion'];
  const platforms: Array<'meta' | 'google' | 'tiktok' | 'pinterest'> = store.connectedPlatforms as Array<'meta' | 'google' | 'tiktok' | 'pinterest'>;

  for (let i = 0; i < numCampaigns; i++) {
    const spend = Math.random() * 2000 + 500;
    const revenue = spend * (Math.random() * 3 + 1.5); // ROAS between 1.5 and 4.5
    const clicks = Math.floor(spend * (Math.random() * 20 + 10));
    const purchases = Math.floor(clicks * (Math.random() * 0.04 + 0.01)); // 1-5% conversion

    mockCampaigns.push({
      id: `campaign-${store.id}-${i}`,
      name: `${campaignTypes[i % campaignTypes.length]} - ${platforms[i % platforms.length].toUpperCase()}`,
      platform: platforms[i % platforms.length],
      status: i === 0 ? 'active' : (Math.random() > 0.3 ? 'active' : 'paused'),
      budget: spend * 1.2,
      spend,
      impressions: Math.floor(clicks * (Math.random() * 50 + 30)),
      clicks,
      conversions: purchases,
      revenue,
      roas: revenue / spend,
      ctr: (clicks / (clicks * (Math.random() * 50 + 30))) * 100,
      cpc: spend / clicks,
      conversionRate: (purchases / clicks) * 100,
      startDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      endDate: undefined,
    });
  }

  return {
    shopId: store.id,
    shopName: store.shopName,
    ownerInfo: {
      name: store.ownerName,
      email: `contact@${store.shopName.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '(555) ' + Math.floor(Math.random() * 900 + 100) + '-' + Math.floor(Math.random() * 9000 + 1000),
      industryNiche: store.industryNiche,
      yearsInBusiness: Math.floor(Math.random() * 5) + 1,
      city: store.city,
      state: store.state,
      storeType: store.storeType,
      ecommercePlatform: store.ecommercePlatform,
    },
    connectedPlatforms: store.connectedPlatforms as Array<'meta' | 'google' | 'tiktok' | 'pinterest'>,
    advertisingGoals: `Grow ${store.industryNiche.toLowerCase()} sales through targeted digital advertising. Focus on customer acquisition and brand awareness in the ${store.city} market.`,
    campaigns: mockCampaigns,
    metrics: {
      averageOrderValue: Math.floor(Math.random() * 50 + 50),
      topProducts: [
        {
          id: '1',
          name: `Best Seller #1`,
          sales: Math.floor(Math.random() * 100 + 50),
          revenue: Math.floor(Math.random() * 5000 + 2000)
        },
        {
          id: '2',
          name: `Best Seller #2`,
          sales: Math.floor(Math.random() * 80 + 30),
          revenue: Math.floor(Math.random() * 4000 + 1500)
        },
        {
          id: '3',
          name: `Best Seller #3`,
          sales: Math.floor(Math.random() * 60 + 20),
          revenue: Math.floor(Math.random() * 3000 + 1000)
        },
      ],
      topCategories: [
        { name: store.industryNiche, salesCount: Math.floor(Math.random() * 200 + 100), revenue: Math.floor(Math.random() * 10000 + 5000) },
        { name: 'Accessories', salesCount: Math.floor(Math.random() * 150 + 50), revenue: Math.floor(Math.random() * 8000 + 3000) },
        { name: 'Sale Items', salesCount: Math.floor(Math.random() * 100 + 30), revenue: Math.floor(Math.random() * 5000 + 2000) },
      ],
    },
    coachNotes: [],
  };
}
