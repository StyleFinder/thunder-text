# Thunder Text Database Schema

**Version**: 1.0.0
**Database**: Supabase (PostgreSQL with pgvector)
**Last Updated**: 2025-12-05

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
4. [Business Profile System](#business-profile-system)
5. [Content Center](#content-center)
6. [AI Ad Engine (AIE)](#ai-ad-engine-aie)
7. [Facebook Integration](#facebook-integration)
8. [Seasonal Trends Engine](#seasonal-trends-engine)
9. [System Tables](#system-tables)
10. [Enums and Types](#enums-and-types)
11. [Indexes](#indexes)
12. [Row Level Security (RLS)](#row-level-security-rls)
13. [Triggers and Functions](#triggers-and-functions)

---

## Overview

Thunder Text uses Supabase (PostgreSQL) with the following extensions:

- **uuid-ossp**: UUID generation
- **pgvector**: Vector embeddings for RAG retrieval
- **pg_cron**: Scheduled jobs (optional)

### Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         THUNDER TEXT                             │
├─────────────────────────────────────────────────────────────────┤
│  CORE           │  CONTENT        │  AI ENGINE      │  TRENDS   │
│  ─────────────  │  ────────────── │  ────────────── │  ──────── │
│  shops          │  content_samples│  aie_best_      │  themes   │
│  products       │  brand_voice_   │    practices    │  trend_   │
│  coaches        │    profiles     │  aie_ad_        │    series │
│  integrations   │  generated_     │    examples     │  seasonal │
│                 │    content      │  aie_ad_        │  _profiles│
│                 │                 │    requests     │           │
├─────────────────────────────────────────────────────────────────┤
│  BUSINESS PROFILE                 │  FACEBOOK ADS               │
│  ───────────────────────────────  │  ────────────────────────── │
│  interview_prompts                │  facebook_ad_drafts         │
│  business_profiles                │  product_descriptions       │
│  business_profile_responses       │  facebook_notification_     │
│  profile_generation_history       │    settings                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   coaches    │────<│    shops     │────<│    products      │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌────────────────┐ ┌───────────────┐ ┌────────────────────┐
│ business_      │ │ integrations  │ │ content_samples    │
│ profiles       │ │               │ │                    │
└───────┬────────┘ └───────────────┘ └────────────────────┘
        │
        ▼
┌────────────────────────┐     ┌────────────────────────┐
│ business_profile_      │     │ brand_voice_profiles   │
│ responses              │     │                        │
└────────────────────────┘     └────────────────────────┘

┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   themes     │────<│   shop_themes    │>────│    shops     │
└──────┬───────┘     └──────────────────┘     └──────────────┘
       │
       ▼
┌──────────────────┐
│ trend_series     │
└──────────────────┘
```

---

## Core Tables

### shops

Primary user/store table supporting both Shopify and standalone users.

```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  -- Multi-user support
  shop_type TEXT DEFAULT 'shopify' CHECK (shop_type IN ('shopify', 'standalone')),
  email TEXT,
  password_hash TEXT,
  display_name TEXT,

  -- Coach assignment (BHB)
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| Column        | Type    | Nullable | Description                                 |
| ------------- | ------- | -------- | ------------------------------------------- |
| id            | UUID    | NO       | Primary key                                 |
| shop_domain   | TEXT    | NO       | Full Shopify domain or email for standalone |
| access_token  | TEXT    | NO       | OAuth access token                          |
| scope         | TEXT    | YES      | Comma-separated OAuth scopes                |
| is_active     | BOOLEAN | NO       | Whether app is installed/active             |
| shop_type     | TEXT    | NO       | `shopify` or `standalone`                   |
| email         | TEXT    | YES      | Required for standalone users               |
| password_hash | TEXT    | YES      | bcrypt hash for standalone users            |
| coach_id      | UUID    | YES      | Assigned BHB coach                          |

**Indexes**:

- `idx_shops_shop_domain` (shop_domain)
- `idx_shops_is_active` (is_active)
- `idx_shops_email` (email) WHERE shop_type = 'standalone'
- `idx_shops_type` (shop_type)
- `idx_shops_coach_id` (coach_id)

---

### coaches

BHB coaches who monitor store performance and provide support.

```sql
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'coach' CHECK (role IN ('coach', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| Column        | Type | Description        |
| ------------- | ---- | ------------------ |
| id            | UUID | Primary key        |
| email         | TEXT | Coach login email  |
| name          | TEXT | Display name       |
| password_hash | TEXT | bcrypt hash        |
| role          | TEXT | `coach` or `admin` |

---

### products

Product catalog for standalone (non-Shopify) users.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Product details
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),

  -- Media
  images JSONB DEFAULT '[]'::jsonb,

  -- Categorization
  product_type TEXT,
  tags TEXT[],
  variants JSONB DEFAULT '[]'::jsonb,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note**: Shopify users fetch products via GraphQL API; this table is for standalone users only.

---

### integrations

OAuth integrations for external services.

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Provider
  provider TEXT NOT NULL CHECK (provider IN ('facebook', 'meta', 'google', 'klaviyo')),
  provider_account_id TEXT NOT NULL,
  provider_account_name TEXT,

  -- OAuth Tokens (encrypted)
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,

  -- Provider-specific metadata
  additional_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, provider)
);
```

**additional_metadata** example for Facebook:

```json
{
  "business_id": "123456789",
  "business_name": "My Boutique",
  "ad_account_id": "act_123456789",
  "permissions_granted": ["ads_management", "ads_read"]
}
```

---

## Business Profile System

### interview_prompts

Master list of 21 business profile interview questions (system-managed).

```sql
CREATE TABLE interview_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_key VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  context_text TEXT,
  help_text TEXT,
  display_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  min_words INTEGER DEFAULT 20,
  suggested_words INTEGER DEFAULT 100,

  -- Quick Start support
  is_quick_start BOOLEAN DEFAULT false,
  quick_start_order INTEGER,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Categories**:

- `business_foundation` (Q1-3): Story, description, results
- `market_positioning` (Q4-6): Competition, trends, customer journey
- `ideal_customer_profile` (Q7-11): Best/worst clients, pain points
- `customer_challenges` (Q12-14): Hidden problems, objections, FAQ
- `business_model` (Q15-17): Lead gen, pricing, growth
- `brand_identity` (Q18-20): Reputation, communication, values
- `strategic_vision` (Q21): 3-5 year vision

---

### business_profiles

One per store - tracks interview progress and stores AI-generated profile.

```sql
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Interview Progress
  interview_status VARCHAR(20) DEFAULT 'not_started',
  interview_mode VARCHAR(20) DEFAULT 'full',
  current_question_number INTEGER DEFAULT 0,
  questions_completed INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 21,

  -- AI-Generated Master Profile
  master_profile_text TEXT,
  profile_summary TEXT,

  -- Structured Profile Components (JSONB)
  business_foundation JSONB,
  market_positioning JSONB,
  ideal_customer_profile JSONB,
  customer_challenges JSONB,
  business_model JSONB,
  brand_identity JSONB,
  strategic_vision JSONB,

  -- 6 Generated Documents
  market_research_doc TEXT,
  ica_doc TEXT,
  pain_points_doc TEXT,
  mission_vision_doc TEXT,
  brand_positioning_doc TEXT,
  ai_instructions_doc TEXT,

  -- Voice Guidelines
  voice_tone TEXT,
  voice_style TEXT,
  voice_vocabulary JSONB,
  voice_personality TEXT,

  -- Versioning
  profile_version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,

  -- Timestamps
  interview_started_at TIMESTAMPTZ,
  interview_completed_at TIMESTAMPTZ,
  profile_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**interview_status** values:

- `not_started`
- `in_progress`
- `completed`
- `regenerating`

**interview_mode** values:

- `full` (21 questions)
- `quick_start` (7 questions)

---

### business_profile_responses

Individual Q&A pairs - stores owner's answers to each question.

```sql
CREATE TABLE business_profile_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,

  prompt_key VARCHAR(100) NOT NULL,
  question_number INTEGER NOT NULL,
  response_text TEXT NOT NULL,
  word_count INTEGER,
  character_count INTEGER,

  response_order INTEGER,
  response_version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,

  original_response TEXT,
  edited_count INTEGER DEFAULT 0,

  first_answered_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### profile_generation_history

Track each time master profile is generated/regenerated.

```sql
CREATE TABLE profile_generation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,

  profile_version INTEGER NOT NULL,
  master_profile_text TEXT NOT NULL,
  generation_prompt TEXT,

  model_used VARCHAR(50),
  tokens_used INTEGER,
  generation_time_ms INTEGER,

  profile_word_count INTEGER,
  validation_passed BOOLEAN,
  validation_issues TEXT[],

  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Content Center

### content_samples

User-uploaded content samples for brand voice profile training.

```sql
CREATE TABLE content_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  title TEXT,
  sample_text TEXT NOT NULL,
  sample_type VARCHAR(50) NOT NULL CHECK (
    sample_type IN ('blog', 'email', 'description', 'social', 'other')
  ),
  word_count INTEGER NOT NULL CHECK (word_count >= 100),

  -- File upload support
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints**: Maximum 3 active samples per store.

---

### brand_voice_profiles

AI-generated brand voice profiles from user samples.

```sql
CREATE TABLE brand_voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Generated Profile Text
  profile_text TEXT NOT NULL,

  -- Structured Voice Components
  voice_tone TEXT,
  voice_style TEXT,
  voice_personality TEXT,
  vocabulary_preferences JSONB,

  -- Versioning
  profile_version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  user_edited BOOLEAN DEFAULT false,

  -- Source tracking
  sample_ids UUID[] NOT NULL,

  -- AI Metadata
  tokens_used INTEGER,
  generation_time_ms INTEGER,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### generated_content

Content pieces generated by the Content Creation Center.

```sql
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  content_type VARCHAR(50) NOT NULL CHECK (
    content_type IN ('blog', 'ad', 'store_copy', 'email',
                     'social_facebook', 'social_instagram', 'social_tiktok',
                     'product_description')
  ),
  platform VARCHAR(50) CHECK (platform IN ('facebook', 'instagram', 'tiktok')),

  topic TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,

  -- Generation parameters
  generation_params JSONB,
  generation_metadata JSONB,

  -- Optional product association
  product_images JSONB,

  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**generation_params** example:

```json
{
  "word_count": 150,
  "tone_intensity": 3,
  "cta_type": "shop_now",
  "custom_cta": null
}
```

---

## AI Ad Engine (AIE)

### aie_best_practices

Store ad creation best practices for RAG retrieval.

```sql
CREATE TABLE aie_best_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,

  -- Targeting
  platform TEXT NOT NULL CHECK (
    platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest', 'all')
  ),
  category TEXT NOT NULL,
  goal TEXT CHECK (goal IN ('awareness', 'engagement', 'conversion', 'traffic', 'all')),

  -- Content
  file_type TEXT CHECK (file_type IN ('pdf', 'audio', 'image', 'text', 'markdown')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  extracted_text TEXT,

  -- Metadata
  source_type TEXT CHECK (source_type IN ('public', 'expert', 'internal')),
  priority_score INTEGER DEFAULT 5,

  -- Vector embedding for RAG
  embedding vector(1536),

  is_active BOOLEAN DEFAULT true,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### aie_ad_examples

High-performing ad examples for reference and retrieval.

```sql
CREATE TABLE aie_ad_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('static', 'carousel', 'video', 'story', 'reel')),
  category TEXT NOT NULL,

  primary_text TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  cta TEXT,

  -- Performance
  performance_metrics JSONB DEFAULT '{}',
  performance_tag TEXT DEFAULT 'avg' CHECK (performance_tag IN ('high', 'avg', 'low')),

  source TEXT NOT NULL CHECK (source IN ('public', 'anonymized_internal')),
  image_url TEXT,

  embedding vector(1536),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### ads_library

Saved ad mockups for user's library.

```sql
CREATE TABLE ads_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Ad content
  headline TEXT NOT NULL,
  primary_text TEXT NOT NULL,
  description TEXT,

  -- Metadata
  platform TEXT NOT NULL,
  goal TEXT NOT NULL,
  variant_type TEXT,

  -- Product association
  product_id TEXT,
  product_title TEXT,
  product_image TEXT,
  product_data JSONB,

  -- AI metadata
  predicted_score DECIMAL(3, 1),
  selected_length TEXT,

  status TEXT DEFAULT 'draft',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Facebook Integration

### facebook_ad_drafts

Track all Facebook ad creation attempts.

```sql
CREATE TABLE facebook_ad_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Source
  product_description_id UUID REFERENCES product_descriptions(id) ON DELETE SET NULL,
  shopify_product_id TEXT,

  -- Ad Content
  ad_title TEXT NOT NULL CHECK (char_length(ad_title) <= 125),
  ad_copy TEXT NOT NULL CHECK (char_length(ad_copy) <= 125),
  image_urls TEXT[] NOT NULL,
  selected_image_url TEXT,

  -- Campaign
  facebook_campaign_id TEXT NOT NULL,
  facebook_campaign_name TEXT NOT NULL,
  facebook_ad_account_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitting', 'submitted', 'failed', 'cancelled')
  ),
  facebook_ad_id TEXT,
  facebook_adset_id TEXT,
  facebook_creative_id TEXT,

  -- Error handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);
```

---

### product_descriptions

AI-generated product descriptions for multi-platform use.

```sql
CREATE TABLE product_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Source
  shopify_product_id TEXT NOT NULL,
  shopify_product_title TEXT NOT NULL,
  shopify_product_handle TEXT,

  -- Generated Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,

  -- Usage tracking
  used_in_shopify BOOLEAN DEFAULT false,
  used_in_facebook_ads BOOLEAN DEFAULT false,
  facebook_ads_created INTEGER DEFAULT 0,

  status TEXT DEFAULT 'active',

  generation_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, shopify_product_id)
);
```

---

### facebook_notification_settings

Per-shop Facebook notification preferences.

```sql
CREATE TABLE facebook_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Alert thresholds
  spend_threshold DECIMAL(10,2) DEFAULT 100.00,
  roas_threshold DECIMAL(5,2) DEFAULT 2.0,
  ctr_threshold DECIMAL(5,4) DEFAULT 0.01,

  -- Notification preferences
  email_enabled BOOLEAN DEFAULT true,
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,

  -- Frequency
  alert_frequency TEXT DEFAULT 'daily',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);
```

---

## Seasonal Trends Engine

### themes

Global catalog of retail/seasonal concepts.

```sql
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,

  -- Seasonal bounds (MM-DD format)
  active_start TEXT,
  active_end TEXT,

  refresh_frequency TEXT NOT NULL DEFAULT 'weekly',

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example themes**: `game-day`, `black-friday`, `valentines`, `summer-sale`

---

### theme_keywords

Per-theme keyword mappings for trend providers.

```sql
CREATE TABLE theme_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'US',
  weight NUMERIC NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(theme_id, keyword, market)
);
```

---

### shop_themes

Which themes each shop tracks.

```sql
CREATE TABLE shop_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  market TEXT NOT NULL DEFAULT 'US',
  region TEXT,
  priority INT NOT NULL DEFAULT 5,
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  backfill_completed BOOLEAN NOT NULL DEFAULT false,
  backfill_start_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### trend_series

Raw time series data per shop+theme.

```sql
CREATE TABLE trend_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  market TEXT NOT NULL DEFAULT 'US',
  region TEXT,

  source TEXT NOT NULL DEFAULT 'google_trends',
  granularity TEXT NOT NULL DEFAULT 'weekly',

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Time series data
  points JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**points** format:

```json
[
  { "date": "2025-08-31", "value": 72 },
  { "date": "2025-09-07", "value": 85 }
]
```

---

### trend_signals

Computed summary metrics (latest window).

```sql
CREATE TABLE trend_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  market TEXT NOT NULL DEFAULT 'US',

  window_days INT NOT NULL DEFAULT 84,

  -- Core metrics
  momentum_pct NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Rising', 'Stable', 'Waning')),
  latest_value NUMERIC NOT NULL,

  -- Peak analysis
  last_peak_date DATE,
  peak_recency_days INT,

  computed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### seasonal_profiles

Normalized "typical year" curves per theme.

```sql
CREATE TABLE seasonal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  market TEXT NOT NULL DEFAULT 'US',

  method TEXT NOT NULL DEFAULT 'percentile-avg',

  -- 52-week normalized array (0-100)
  week_1_to_52 NUMERIC[] NOT NULL,

  years_included INT NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (array_length(week_1_to_52, 1) = 52)
);
```

---

## System Tables

### system_prompts

Master system prompts for AI generation.

```sql
CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  shop_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### category_templates

Category-specific generation templates.

```sql
CREATE TABLE category_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  shop_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### subscription_plans

Available subscription tiers.

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  included_generations INTEGER NOT NULL,
  overage_rate DECIMAL(10,4) NOT NULL,
  features JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Default Plans**:
| Plan | Price | Generations | Overage Rate |
|------|-------|-------------|--------------|
| Starter | $29 | 500 | $0.15 |
| Professional | $79 | 2,000 | $0.12 |
| Enterprise | $199 | 5,000 | $0.10 |
| Enterprise Plus | $499 | 15,000 | $0.08 |

---

### usage_metrics

Billing and usage tracking.

```sql
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  generations_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  period DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, period)
);
```

---

### user_sessions

Track user sessions for security and analytics.

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,

  session_type TEXT NOT NULL CHECK (
    session_type IN ('shopify_oauth', 'email_password')
  ),

  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT user_sessions_check CHECK (
    (shop_id IS NOT NULL AND coach_id IS NULL) OR
    (shop_id IS NULL AND coach_id IS NOT NULL)
  )
);
```

---

## Enums and Types

### Platform Types

```sql
-- Ad platforms
CHECK (platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest', 'all'))

-- OAuth providers
CHECK (provider IN ('facebook', 'meta', 'google', 'klaviyo'))
```

### Status Types

```sql
-- Interview status
CHECK (interview_status IN ('not_started', 'in_progress', 'completed', 'regenerating'))

-- Ad draft status
CHECK (status IN ('draft', 'submitting', 'submitted', 'failed', 'cancelled'))

-- Generation status
CHECK (status IN ('pending', 'processing', 'completed', 'error'))
```

### Campaign Goals

```sql
CHECK (goal IN ('awareness', 'engagement', 'conversion', 'traffic', 'app_installs'))
```

### Ad Variant Types

```sql
CHECK (variant_type IN ('emotional', 'benefit', 'ugc', 'storytelling', 'urgency', 'social_proof'))
```

### Content Types

```sql
CHECK (content_type IN (
  'blog', 'ad', 'store_copy', 'email',
  'social_facebook', 'social_instagram', 'social_tiktok',
  'product_description'
))
```

---

## Indexes

### Performance Indexes

```sql
-- shops
CREATE INDEX idx_shops_shop_domain ON shops(shop_domain);
CREATE INDEX idx_shops_is_active ON shops(is_active);
CREATE INDEX idx_shops_type ON shops(shop_type);
CREATE INDEX idx_shops_email ON shops(email) WHERE shop_type = 'standalone';

-- business_profiles
CREATE INDEX idx_business_profiles_store ON business_profiles(store_id);
CREATE INDEX idx_business_profiles_status ON business_profiles(store_id, interview_status);
CREATE UNIQUE INDEX idx_business_profiles_current ON business_profiles(store_id) WHERE is_current = true;

-- content_samples
CREATE INDEX idx_content_samples_store ON content_samples(store_id);
CREATE INDEX idx_content_samples_active ON content_samples(store_id, is_active);

-- brand_voice_profiles
CREATE INDEX idx_voice_profiles_store ON brand_voice_profiles(store_id);
CREATE UNIQUE INDEX idx_voice_profiles_one_current ON brand_voice_profiles(store_id) WHERE is_current = true;

-- generated_content
CREATE INDEX idx_generated_content_store ON generated_content(store_id);
CREATE INDEX idx_generated_content_type ON generated_content(store_id, content_type);
CREATE INDEX idx_generated_content_saved ON generated_content(store_id, is_saved) WHERE is_saved = true;

-- ads_library
CREATE INDEX idx_ads_library_shop_id ON ads_library(shop_id);
CREATE INDEX idx_ads_library_platform ON ads_library(platform);
CREATE INDEX idx_ads_library_created_at ON ads_library(created_at DESC);
```

### Vector Indexes (pgvector)

```sql
-- Best practices embedding search
CREATE INDEX idx_best_practices_embedding
  ON aie_best_practices
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Ad examples embedding search
CREATE INDEX idx_ad_examples_embedding
  ON aie_ad_examples
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:

### shops

```sql
CREATE POLICY "Service role can manage shops" ON shops
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### business_profiles

```sql
CREATE POLICY "Store owners view own profiles" ON business_profiles
  FOR SELECT
  USING (store_id IN (
    SELECT id FROM shops
    WHERE shop_domain = current_setting('request.headers.authorization', true)
  ));
```

### generated_content

```sql
CREATE POLICY "Users can view own content" ON generated_content
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content" ON generated_content
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### aie_best_practices

```sql
CREATE POLICY "Public read verified best practices" ON aie_best_practices
  FOR SELECT
  USING (verification_status = 'verified');
```

---

## Triggers and Functions

### Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to all major tables
CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Word Count Calculator

```sql
CREATE OR REPLACE FUNCTION count_words(p_text TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN array_length(regexp_split_to_array(trim(p_text), '\s+'), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Business Profile Progress

```sql
CREATE OR REPLACE FUNCTION update_interview_progress(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE business_profiles
  SET
    questions_completed = (
      SELECT COUNT(DISTINCT prompt_key)
      FROM business_profile_responses
      WHERE business_profile_id = p_profile_id AND is_current = true
    ),
    interview_status = CASE
      WHEN questions_completed >= total_questions THEN 'completed'
      WHEN questions_completed > 0 THEN 'in_progress'
      ELSE 'not_started'
    END,
    updated_at = NOW()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql;
```

### Theme Season Check

```sql
CREATE OR REPLACE FUNCTION is_theme_in_season(
  p_active_start TEXT,
  p_active_end TEXT,
  p_check_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_active_start IS NULL OR p_active_end IS NULL THEN
    RETURN true;
  END IF;

  -- Handle wrapping seasons (e.g., Nov 15 to Jan 31)
  IF p_active_start <= p_active_end THEN
    RETURN TO_CHAR(p_check_date, 'MM-DD') BETWEEN p_active_start AND p_active_end;
  ELSE
    RETURN TO_CHAR(p_check_date, 'MM-DD') >= p_active_start
        OR TO_CHAR(p_check_date, 'MM-DD') <= p_active_end;
  END IF;
END;
$$;
```

---

## Storage Buckets

Thunder Text uses Supabase Storage for file uploads:

| Bucket            | Purpose            | Max Size |
| ----------------- | ------------------ | -------- |
| `content-samples` | Writing samples    | 10MB     |
| `best-practices`  | AIE knowledge base | 50MB     |
| `product-images`  | Product media      | 5MB      |

---

## Migration History

| Date       | Migration                    | Description            |
| ---------- | ---------------------------- | ---------------------- |
| 2025-09-27 | 001_initial_schema           | Core tables            |
| 2025-09-27 | 003_create_shops_table       | Shopify OAuth          |
| 2025-10-14 | 018_facebook_ads_integration | Facebook Ads           |
| 2025-10-16 | content_creation_center      | Content Center tables  |
| 2025-10-28 | business_profile_interview   | Interview system       |
| 2025-11-03 | trends_tables                | Seasonal trends engine |
| 2025-01-24 | ads_library                  | Saved ads              |
| 2025-01-25 | multi_user_architecture      | Coaches & standalone   |

---

## Changelog

### v1.0.0 (2025-12-05)

- Initial comprehensive schema documentation
- 40+ tables documented
- RLS policies documented
- Index documentation
- Trigger and function documentation

---

_This documentation is maintained alongside the Thunder Text codebase and Supabase migrations._
