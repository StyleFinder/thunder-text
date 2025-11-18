# Mock Facebook Ads Data Setup

This guide explains how to populate the BHB Dashboard with realistic mock Facebook ad campaign data for testing purposes.

## Why Mock Data?

- **Fast Testing**: No need to wait for real ad campaigns to run
- **Predictable Results**: Test all performance tiers (excellent, good, average, poor, critical)
- **Safe Development**: No risk of accidentally spending money on real ads
- **Complete Coverage**: Every store gets realistic campaign data

## Quick Start

### 1. Apply Coach Assignments Migration (if not done yet)

```bash
# Copy SQL from supabase/migrations/update_coach_assignments.sql
# and run it in Supabase SQL Editor:
# https://supabase.com/dashboard/project/nrtarnyqxnnfgrfxtvhv/sql/new
```

### 2. Run the Mock Data Seeder

```bash
node scripts/seed-mock-facebook-data.js
```

### 3. Restart Dev Server (if running)

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 4. View BHB Dashboard

```bash
# Visit in your browser:
http://localhost:3050/admin/bhb-dashboard
```

## What Gets Created

The seeder creates:

- ✅ **14 Facebook integrations** (one per active store)
- ✅ **30-70 total campaigns** (2-5 campaigns per store)
- ✅ **Realistic performance distribution**:
  - 15% Excellent (ROAS 3.5-6.0x)
  - 25% Good (ROAS 2.5-3.4x)
  - 30% Average (ROAS 1.5-2.4x)
  - 20% Poor (ROAS 0.8-1.4x)
  - 10% Critical (ROAS 0.1-0.7x)

## Generated Data Structure

Each campaign includes:

```javascript
{
  campaign_id: "mock_campaign_123",
  campaign_name: "Sally's Chic Collection - Spring Launch",
  spend: 842.50,
  purchases: 45,
  purchase_value: 3295.75,
  conversion_rate: 2.85,
  roas: 3.91,
  impressions: 125000,
  clicks: 1580,
  ctr: 1.26,
  cpc: 0.53
}
```

## Testing Different Scenarios

### View All Stores

1. Go to BHB Dashboard
2. Leave "Filter by Coach" set to "All Stores"
3. You should see all 14 stores with campaign data

### Filter by Coach

1. Select "Jeff Fenn" from the coach dropdown
2. You should see only Jeff's 2 assigned stores with their campaigns
3. Try other coaches to see their stores

### Search Stores

1. Type "Sally" in the search box
2. You should see "Sally's Chic Collection" with its campaigns
3. Clear search and try other store names

### View Campaign Details

1. Click "▶ Show Campaigns" on any store
2. You should see 2-5 campaigns with detailed metrics
3. Campaigns show varying performance (color-coded badges)

## Re-seeding Data

To regenerate with different random values:

```bash
# Re-run the seeder - it will update existing integrations
node scripts/seed-mock-facebook-data.js
```

## Cleaning Up Mock Data

To remove all mock data:

```sql
-- Run in Supabase SQL Editor
DELETE FROM integrations
WHERE additional_metadata->>'mock_data' = 'true';
```

## How It Works

1. **Seeder Script** (`scripts/seed-mock-facebook-data.js`):
   - Generates realistic campaign performance data
   - Stores campaigns in `integrations.additional_metadata.ad_accounts[].campaigns`

2. **Facebook API Service** (`src/lib/services/facebook-api.ts`):
   - Checks for `mock_data: true` in integration metadata
   - Returns mock campaigns instead of calling Facebook API
   - Falls back to real API if no mock data exists

3. **BHB Dashboard** (`src/app/admin/bhb-dashboard/page.tsx`):
   - Calls `getCampaignInsights()` which returns mock or real data
   - Displays campaigns with performance tiers and metrics
   - No changes needed - works transparently with mock data

## Troubleshooting

### No campaigns showing?

```bash
# Check if integrations were created
# Run in Supabase SQL Editor:
SELECT shop_id, provider, additional_metadata->>'mock_data' as is_mock
FROM integrations
WHERE provider = 'facebook';
```

### Need to check raw campaign data?

```bash
# Run in Supabase SQL Editor:
SELECT
  s.store_name,
  jsonb_array_length(i.additional_metadata->'ad_accounts'->0->'campaigns') as num_campaigns
FROM integrations i
JOIN shops s ON s.id = i.shop_id
WHERE i.provider = 'facebook'
  AND i.additional_metadata->>'mock_data' = 'true';
```

### Want to see one store's campaigns?

```bash
# Run in Supabase SQL Editor (replace shop name):
SELECT
  i.additional_metadata->'ad_accounts'->0->'campaigns' as campaigns
FROM integrations i
JOIN shops s ON s.id = i.shop_id
WHERE s.store_name = 'Sally''s Chic Collection'
  AND i.provider = 'facebook';
```

## Next Steps

1. ✅ Mock data populated
2. ✅ BHB Dashboard showing campaigns
3. 🎯 Test coach filtering
4. 🎯 Test search functionality
5. 🎯 Test star/favorite feature
6. 🎯 Verify performance tier calculations
7. 🎯 Ready for real Facebook integration testing
