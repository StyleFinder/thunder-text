# AIE Admin Dashboard - Best Practices Curation

## Overview

Admin dashboard for curating high-performing user ads into the AIE best practices database. This allows the system to learn from real-world performance and improve future ad generation.

---

## Relationship Between Ad Libraries

### **User Ad Library (`ad_library` table)**

- Each store has their own ad library
- Users create, edit, and track their ads
- Contains real performance metrics from campaigns
- Users own their data

### **Best Practices Library (`aie_ad_examples` table)**

- Platform-owned curated examples
- Populated by admin from high-performing user ads
- Used by RAG system for generating new ads
- Read-only for users

### **Data Flow**

```
User creates ad → ad_library (shop-specific)
  ↓
Ad performs well in real campaigns
  ↓
Admin reviews performance across ALL shops
  ↓
Admin promotes ad → aie_ad_examples (platform-wide)
  ↓
RAG uses for inspiration in future generations
```

---

## Admin Curation Workflow

### **Step 1: Browse High-Performing Ads**

Admin dashboard shows all active ads across all shops:

- Sorted by performance metrics (ROAS, CTR, conversion rate)
- Filterable by platform, industry, goal type
- Real-time metrics displayed

### **Step 2: Promote to Best Practices**

Admin clicks "Promote to Best Practice" button:

- **Verbatim copy** of ad content (headline, primary text, description, CTA)
- **Real metrics** shown on admin dashboard at time of promotion
- **Attribution** tracked: shop name stored with promoted ad
- **Inspiration elements**: System extracts which elements were excellent:
  - Hook strength
  - Call-to-action effectiveness
  - Overall structure
  - Emotional appeal

### **Step 3: Best Practice Usage**

When RAG generates new ads:

- System doesn't regenerate verbatim
- Extracts best-performing **elements**:
  - "This hook pattern worked well"
  - "This CTA structure drove conversions"
  - "This tone resonated with audience"
- Combines multiple best practices into new variants

---

## Legal & Privacy

### **Terms of Service Agreement**

Users agree that:

> "By using Thunder Text Ad Generator, you agree that your ad copy may be used as inspiration for improving ad creation for all users. Your ads may be analyzed to extract best practices patterns (e.g., effective hooks, CTAs, structures) that help the AI generate better recommendations."

### **Data Usage**

- **Verbatim copy allowed**: Yes, copied to `aie_ad_examples`
- **Attribution included**: Yes, shop name stored
- **Metrics shown**: Real metrics on admin dashboard
- **User notification**: Not required (covered by ToS)
- **Opt-out**: Not planned for Phase 1

---

## Metrics Handling

### **⚠️ Important Consideration: Metrics Timing**

**Challenge**: Ad effectiveness wanes over time

- Ads start strong, then performance degrades
- End-of-life metrics don't represent "best practice"
- Need to capture metrics at **peak performance**

**Solution Options** (to be decided in future phase):

**Option A: Peak Performance Window**

```sql
-- Capture metrics during ad's best period
SELECT MAX(roas) as peak_roas,
       date_range as peak_period
WHERE ad_age BETWEEN 7 AND 30 days
```

**Option B: Moving Average**

```sql
-- 7-day rolling average during first 60 days
-- Avoid early volatility and late decay
```

**Option C: Admin Manual Selection**

```
Admin reviews metrics over time
Admin manually selects "best period" to preserve
System stores snapshot of that period
```

**Option D: Automated Peak Detection**

```
System automatically detects when ad hit peak performance
Flags that period for admin review
Admin confirms before promoting
```

**Decision Required**: Choose timing strategy before implementing admin dashboard

---

## Admin Dashboard Features (Future Phase)

### **Route**: `/admin/aie/curation`

### **View: Ad Performance Table**

```
┌─────────────────────────────────────────────────────────────┐
│  Ad Curation Dashboard                    [Filters ▾]       │
├─────────────────────────────────────────────────────────────┤
│  Shop       │ Ad Preview      │ Platform │ ROAS  │ CTR    │
├─────────────────────────────────────────────────────────────┤
│  Store A    │ "Summer Sale..."│ Meta     │ 8.5x  │ 4.2%   │
│             │ "Get 50% off..."│          │       │ [Promote] │
├─────────────────────────────────────────────────────────────┤
│  Store B    │ "New Arrival..."│ Instagram│ 6.2x  │ 3.8%   │
│             │ "Fresh styles..."│         │       │ [Promote] │
└─────────────────────────────────────────────────────────────┘
```

### **Filters Available**

- Platform (Meta, Instagram, Google, TikTok)
- Performance threshold (ROAS > X, CTR > Y%)
- Time period (Last 30/60/90 days)
- Industry/Product category
- Already promoted (Yes/No)

### **Promotion Modal**

```
┌────────────────────────────────────────┐
│ Promote to Best Practices              │
├────────────────────────────────────────┤
│ Shop: Store A                          │
│ Ad: "Summer Sale - 50% Off Everything" │
│                                        │
│ Peak Performance (July 15-22, 2024):  │
│ • ROAS: 8.5x                           │
│ • CTR: 4.2%                            │
│ • Conversions: 156                     │
│                                        │
│ Tag Elements (optional):               │
│ ☑ Excellent Hook                       │
│ ☑ Strong CTA                           │
│ ☐ Effective Tone                       │
│ ☑ Good Structure                       │
│                                        │
│ [Cancel]            [Promote to AIE]   │
└────────────────────────────────────────┘
```

---

## Database Schema Updates

### **`aie_ad_examples` Table** (add new columns)

```sql
ALTER TABLE aie_ad_examples ADD COLUMN IF NOT EXISTS
  originated_from_shop_id uuid REFERENCES shops(id),
  originated_from_ad_id uuid REFERENCES ad_library(id),
  shop_name text,  -- Denormalized for display
  promoted_at timestamp,
  promoted_by uuid REFERENCES users(id),
  peak_metrics jsonb;  -- Snapshot of metrics at peak

-- Example peak_metrics JSON:
{
  "roas": 8.5,
  "ctr": 4.2,
  "conversions": 156,
  "period_start": "2024-07-15",
  "period_end": "2024-07-22",
  "impressions": 12450,
  "clicks": 523
}
```

### **`ad_library` Table** (add tracking)

```sql
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS
  promoted_to_best_practice boolean DEFAULT false,
  promoted_at timestamp,
  promoted_by uuid;
```

---

## Implementation Phases

### **Phase 1 (Current Session): Store Ad Library**

- ✅ Create `ad_library` table
- ✅ Save selected variants to library
- ✅ Display ads in user's library
- ✅ Edit/delete functionality
- ✅ Draft/Active status management

### **Phase 2 (Future Session): Admin Dashboard**

- Create `/admin/aie/curation` route
- Build performance table with filters
- Implement "Promote to Best Practice" action
- Decide metrics timing strategy
- Add admin permissions/access control

### **Phase 3 (Future Session): Advanced Curation**

- Element tagging (hook strength, CTA effectiveness)
- Automated peak detection
- Batch promotion workflows
- Reporting: "Which shops contribute most best practices?"
- Feedback loop: "Did promoted ads improve generation quality?"

---

## Key Principles

1. **Two Separate Tables**: Clear ownership and use cases
2. **Verbatim Copying**: Admin copies exact ad content
3. **Real Metrics**: Shown on admin dashboard
4. **Attribution**: Shop name tracked with promoted ads
5. **Inspiration Not Duplication**: RAG extracts patterns, doesn't regenerate exactly
6. **ToS Coverage**: Users agree to contribution via terms
7. **Admin-Only Promotion**: Users cannot promote their own ads

---

## Questions for Future Sessions

1. **Metrics timing strategy**: Which option (A/B/C/D)?
2. **Admin access control**: Who can promote ads?
3. **Feedback mechanism**: How to measure if promoted ads improve AIE quality?
4. **User visibility**: Should users know their ad was promoted?
5. **Incentives**: Reward shops whose ads become best practices?

---

## Document Status

- **Created**: 2024-11-08
- **Purpose**: Reference for future admin dashboard implementation
- **Status**: Planning phase - not yet implemented
- **Next Steps**: Complete Phase 1 (Store Ad Library) first
