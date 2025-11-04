# Seasonal Trends Engine

**Track search interest trends and optimize merchandising timing for seasonal products**

---

## Overview

The Seasonal Trends Engine helps store owners make data-driven decisions about inventory, pricing, and merchandising by tracking Google search interest trends for 20+ retail themes (Game Day, Valentine's, Christmas, etc.).

### Key Features

- ✅ **20 Pre-configured Retail Themes** with seasonal bounds
- ✅ **Rising/Stable/Waning Status** based on momentum analysis
- ✅ **Weekly Sparkline Charts** with optional seasonal overlay
- ✅ **Actionable Playbooks** for each trend status
- ✅ **Intelligent Refresh Scheduling** (only during active seasons)
- ✅ **2-Year Historical Backfill** on theme activation
- ✅ **Dashboard-First UI** (no email notifications)

---

## Architecture

### Database Schema

```
themes              → Global catalog of 20 retail themes
theme_keywords      → Keywords per theme (3-5 per theme)
shop_themes         → Shop subscriptions to themes
trend_series        → Raw time series data (JSONB points)
trend_signals       → Computed metrics (momentum, status, peaks)
seasonal_profiles   → Normalized 52-week historical curves
trend_refresh_log   → Audit trail for refresh jobs
```

**RLS Pattern**: All shop-scoped tables use `shop_id = auth.uid()` pattern

### Components

```
src/lib/trends/
├── types.ts                     → TypeScript interfaces
├── compute.ts                   → Momentum algorithm
└── providers/
    └── serpapi.ts               → SerpAPI Google Trends client

src/app/api/trends/
├── themes/route.ts              → GET /api/trends/themes
├── signals/route.ts             → GET /api/trends/signals?themeSlug=...
├── shop-themes/route.ts         → POST/DELETE /api/trends/shop-themes
└── refresh/backfill/route.ts    → POST /api/trends/refresh/backfill

src/app/components/trends/
├── TrendStatusBadge.tsx         → Rising/Stable/Waning badge
├── TrendSparkline.tsx           → Recharts area chart
└── TrendThermometer.tsx         → Compact trend card

src/app/trends/
└── page.tsx                     → Main dashboard page
```

---

## Setup & Deployment

### 1. Install Dependencies

```bash
npm install recharts
```

### 2. Run Database Migrations

```bash
# Apply schema migration
npx supabase migration up

# Verify tables created
npx supabase db execute "
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'theme%' OR tablename LIKE 'trend%');
"

# Seed 20 retail themes
npx supabase db execute -f supabase/migrations/20251103_seed_retail_themes.sql
```

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
# SerpAPI Configuration
SERPAPI_KEY=your_serpapi_key_here

# Refresh Settings
TRENDS_REFRESH_CRON="0 3 * * 1"
TRENDS_BACKFILL_YEARS=2
TRENDS_MAX_CONCURRENT_REQUESTS=5
TRENDS_RATE_LIMIT_DELAY_MS=1500
```

**Get SerpAPI Key**: https://serpapi.com/dashboard

- Free tier: 100 searches/month
- Paid plans: $50/month for 5,000 searches

### 4. Deploy Supabase Edge Function (Optional)

For automated weekly refresh:

```bash
# Deploy function
npx supabase functions deploy trends-refresh --no-verify-jwt

# Set secrets
npx supabase secrets set SERPAPI_KEY=your_key_here

# Schedule cron job (via Supabase Dashboard or SQL)
SELECT cron.schedule(
  'trends-weekly-refresh',
  '0 3 * * 1',  -- Every Monday 3 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/trends-refresh',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

### 5. Build & Deploy

```bash
npm run build
git push origin feature/seasonal-trends-engine
```

---

## Usage

### For Store Owners

1. **Navigate to Trends**: `/trends` route in Shopify embedded app
2. **View Active Themes**: See all in-season themes with current status
3. **Enable Themes**: Click to subscribe (triggers 2-year backfill)
4. **Review Playbooks**: Get actionable recommendations per theme

### API Usage

**List Themes**:

```bash
GET /api/trends/themes
→ Returns all active themes with inSeason flag
```

**Get Signal**:

```bash
GET /api/trends/signals?themeSlug=game-day
→ Returns signal, series, and seasonal profile
```

**Enable Theme**:

```bash
POST /api/trends/shop-themes
Body: { "themeSlug": "game-day", "market": "US", "priority": 5 }
→ Subscribes shop to theme, triggers backfill
```

**Disable Theme**:

```bash
DELETE /api/trends/shop-themes?id=SHOP_THEME_ID
→ Soft deletes (preserves historical data)
```

---

## Seasonal Themes Catalog

| Theme            | Category | Season         | Keywords Example                        |
| ---------------- | -------- | -------------- | --------------------------------------- |
| Game Day         | Sports   | Aug 1 - Feb 15 | game day outfits, football fan gear     |
| Christmas        | Holiday  | Oct 1 - Dec 31 | christmas gifts, ugly sweater           |
| Valentine's Day  | Holiday  | Jan 1 - Feb 14 | valentines gifts, gifts for her         |
| Halloween        | Holiday  | Sep 1 - Oct 31 | halloween costumes, decorations         |
| Back to School   | Seasonal | Jul 1 - Sep 30 | back to school outfits, supplies        |
| Spring Break     | Seasonal | Feb 1 - Apr 30 | spring break outfits, swimwear          |
| Wedding Season   | Occasion | Apr 1 - Oct 31 | wedding guest dresses, bridesmaid gifts |
| Mother's Day     | Holiday  | Apr 1 - May 31 | mothers day gifts, gifts for mom        |
| Father's Day     | Holiday  | May 1 - Jun 30 | fathers day gifts, gifts for dad        |
| _...and 11 more_ |          |                |                                         |

**Total: 20 themes** covering Sports, Holidays, Seasonal events, and Occasions.

---

## Algorithm: Momentum Computation

```typescript
// 1. Split series into windows
recentWindow = last 2 weeks (weekly) or 14 days (daily)
baselineWindow = prior 4 weeks (weekly) or 28 days (daily)

// 2. Calculate momentum
momentumPct = (avg(recent) - avg(baseline)) / avg(baseline) * 100

// 3. Determine status
if (momentumPct >= +20%)  → Rising
if (momentumPct <= -20%)  → Waning
else                      → Stable

// 4. Find peak
lastPeak = argmax(value) in last 12 weeks
peakRecency = days since lastPeak
```

**Playbook Rules**:

- **Rising**: "Lead with full price. Feature prominently. Consider ad push."
- **Stable**: "Maintain price. Test bundles or cross-sell."
- **Waning**: "Begin markdown ladder. Offer free shipping to clear."

---

## Monitoring & Troubleshooting

### Key Metrics

```sql
-- Active subscriptions
SELECT COUNT(*) FROM shop_themes WHERE is_enabled = true;

-- Refresh job success rate (last 7 days)
SELECT status, COUNT(*)
FROM trend_refresh_log
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY status;

-- Stale data (last refresh > 10 days ago)
SELECT t.name, COUNT(DISTINCT st.shop_id) as affected_shops
FROM themes t
JOIN shop_themes st ON st.theme_id = t.id AND st.is_enabled = true
LEFT JOIN trend_series ts ON ts.theme_id = t.id
GROUP BY t.id, t.name
HAVING MAX(ts.updated_at) < NOW() - INTERVAL '10 days';
```

### Common Issues

**Problem**: Backfill timeout
**Solution**: Check `trend_refresh_log` for errors, retry via API

**Problem**: SerpAPI rate limit
**Solution**: Increase `TRENDS_RATE_LIMIT_DELAY_MS` to 2000ms

**Problem**: Theme not in season
**Solution**: Update `active_start`/`active_end` in `themes` table

---

## Scaling Considerations

### Current Capacity

| Metric              | Limit      | Notes                         |
| ------------------- | ---------- | ----------------------------- |
| **Shops**           | 1,000+     | Postgres handles easily       |
| **Themes per Shop** | 6 avg      | ~6,000 active subscriptions   |
| **API Calls/Week**  | ~3,000     | Refresh only in-season themes |
| **Database Size**   | ~350K rows | trend_series dominates        |

### Cost Analysis

**SerpAPI Usage** (1,000 shops × 6 themes):

- Weekly refresh (in-season): ~3,000 API calls/week
- Annual: ~150,000 API calls
- **Cost**: $50/month (5K searches) + overage

**Database**: Free tier sufficient for MVP, Pro tier ($25/mo) for 1K+ shops

---

## Future Enhancements

### Phase 2: Regional Granularity

- State/DMA-level trends
- Regional heatmaps in UI
- Auto-detect shop region

### Phase 3: Shopify Integration

- Overlay sales data on trend charts
- Correlation: momentum → sell-through
- Auto-tag products with themes

### Phase 4: Advanced Analytics

- Keyword discovery (Related Queries)
- Predictive alerts (trend peaks in 2 weeks)
- Competitive benchmarking

### Phase 5: Automation

- Auto-markdown triggers (Waning status)
- Collection visibility rules (boost Rising)
- Ad budget recommendations

---

## Support & Documentation

- **Main Docs**: `/docs/SEASONAL_TRENDS_ENGINE.md` (this file)
- **Migrations**: `/supabase/migrations/20251103_*.sql`
- **API Endpoints**: `/src/app/api/trends/*`
- **UI Components**: `/src/app/components/trends/*`

**Questions?** Open an issue on GitHub or contact the development team.

---

## License

Internal use only for Thunder Text / Mini CFO.
