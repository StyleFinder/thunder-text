# ThunderTex Developer Handoff Document

**Version**: 1.0
**Date**: December 4, 2025
**Status**: Production (Deployed on Render)

---

## Project Information

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| **App Name**       | ThunderText                                           |
| **Description**    | AI-Powered Product Description Generator & Ad Creator |
| **Repository**     | [Add GitHub URL]                                      |
| **Production URL** | https://thunder-text.onrender.com                     |
| **Hosting**        | Render                                                |
| **Database**       | Supabase (PostgreSQL)                                 |

---

## 1. What This App Does

ThunderText helps merchants generate high-quality product descriptions and ad copy for social media using AI. Key features:

1. **Brand Voice Profiles**: Merchants define their brand's tone, style, and messaging
2. **AI Description Generation**: GPT-4 generates SEO-optimized descriptions
3. **Content Library**: Store and manage generated content
4. **Business Profile Builder**: 21-question interview to understand the business
5. **Social Integrations**: Connect to Facebook, Google, and TikTok for ad campaigns

### User Roles

| Role      | Access                                       |
| --------- | -------------------------------------------- |
| **Admin** | Full access to all features, user management |
| **Coach** | Business profile guidance, content review    |
| **Shop**  | Standard merchant access                     |

---

## 2. Getting Started

### Prerequisites

- Node.js 18+
- npm
- Shopify Partner account
- Supabase account
- OpenAI API key

### Local Setup

```bash
# Clone repository
git clone [repository-url]
cd thunder-text

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env.local

# Fill in required environment variables (see section 3)

# Run development server
npm run dev

# App runs on http://localhost:3000
```

### Shopify Development

```bash
# Start with Shopify CLI
npm run shopify

# This connects to your Shopify Partner app for OAuth testing
```

---

## 3. Environment Variables

### Required Variables

```bash
# ===================
# SHOPIFY
# ===================
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret
SHOPIFY_SCOPES=read_products,write_products,read_content,write_content

# ===================
# SUPABASE
# ===================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===================
# AUTHENTICATION
# ===================
NEXTAUTH_SECRET=generate-32-byte-random-string
NEXTAUTH_URL=http://localhost:3000

# ===================
# AI
# ===================
OPENAI_API_KEY=sk-...

# ===================
# ENCRYPTION
# ===================
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=64-character-hex-string

# ===================
# OPTIONAL: SOCIAL OAUTH
# ===================
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
GOOGLE_OAUTH_ID=
GOOGLE_OAUTH_SECRET=
TIKTOK_CLIENT_ID=
TIKTOK_CLIENT_SECRET=
```

### Where to Get These

| Variable             | Source                                      |
| -------------------- | ------------------------------------------- |
| `SHOPIFY_API_KEY`    | Shopify Partner Dashboard → Apps → Your App |
| `SHOPIFY_API_SECRET` | Same location as API key                    |
| `SUPABASE_*`         | Supabase Dashboard → Settings → API         |
| `OPENAI_API_KEY`     | OpenAI Platform → API Keys                  |
| `NEXTAUTH_SECRET`    | Generate: `openssl rand -base64 32`         |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Shopify Admin                          │
│                    (Embedded App)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ App Bridge
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App (Render)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Pages     │  │    API      │  │    Middleware       │ │
│  │   (React)   │  │   Routes    │  │  (Auth, CORS, RLS)  │ │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘ │
└──────────────────────────┼──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐      ┌──────────┐
   │ Supabase │     │  OpenAI  │      │ Shopify  │
   │    DB    │     │   API    │      │   API    │
   └──────────┘     └──────────┘      └──────────┘
```

### Key Directories

| Directory              | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `src/app/`             | Next.js App Router (pages, API routes)        |
| `src/lib/`             | Core business logic, utilities                |
| `src/lib/auth/`        | Authentication (NextAuth)                     |
| `src/lib/security/`    | Security utilities (sanitization, validation) |
| `src/lib/middleware/`  | Custom middleware (rate limiting, webhooks)   |
| `src/lib/services/`    | Service layer (AI, Shopify, etc.)             |
| `src/components/`      | React components                              |
| `supabase/migrations/` | Database schema (51 migrations)               |

---

## 5. Database Schema

### Core Tables

```sql
-- Shops (Shopify stores)
shops (
  id UUID PRIMARY KEY,
  shop_domain TEXT UNIQUE,
  access_token TEXT,  -- encrypted
  scope TEXT,
  is_active BOOLEAN,
  installed_at TIMESTAMPTZ,
  uninstalled_at TIMESTAMPTZ
)

-- Business Profiles
business_profiles (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES shops(id),
  name TEXT,
  industry TEXT,
  target_audience TEXT,
  is_current BOOLEAN
)

-- Brand Voice Profiles
brand_voice_profiles (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES shops(id),
  name TEXT,
  tone TEXT,
  style TEXT,
  keywords TEXT[]
)

-- Generated Content
generated_content (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES shops(id),
  product_id TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
)

-- Content Samples
content_samples (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES shops(id),
  sample_type TEXT,
  content TEXT,
  word_count INTEGER
)
```

### Row Level Security

All tables have RLS policies ensuring:

- Users can only access their own data (`store_id = auth.uid()`)
- Service role has full access for admin operations

---

## 6. Key Workflows

### OAuth Installation Flow

```
1. Merchant clicks Install
2. → /api/auth/shopify?shop=xxx
3. Validate shop domain
4. Generate OAuth state (shop + timestamp + nonce)
5. → Redirect to Shopify OAuth
6. User grants permissions
7. → /api/auth/shopify/callback
8. Validate state, exchange code for token
9. Store token in Supabase
10. → /app (dashboard)
```

### Content Generation Flow

```
1. Merchant selects product
2. → /api/generate
3. Fetch product data from Shopify
4. Load brand voice profile
5. Build prompt with context
6. Call OpenAI GPT-4
7. Return generated content
8. Merchant edits/approves
9. → /api/save-content
10. Store in content library
```

---

## 7. API Endpoints

### Authentication

| Endpoint                     | Method | Description       |
| ---------------------------- | ------ | ----------------- |
| `/api/auth/shopify`          | GET    | Start OAuth flow  |
| `/api/auth/shopify/callback` | GET    | OAuth callback    |
| `/api/auth/[...nextauth]`    | ALL    | NextAuth handlers |

### Business Profile

| Endpoint                         | Method | Description             |
| -------------------------------- | ------ | ----------------------- |
| `/api/business-profile`          | GET    | Get current profile     |
| `/api/business-profile/answer`   | POST   | Submit interview answer |
| `/api/business-profile/generate` | POST   | Generate from answers   |

### Content

| Endpoint                       | Method | Description      |
| ------------------------------ | ------ | ---------------- |
| `/api/content-center`          | GET    | List content     |
| `/api/content-center/generate` | POST   | Generate content |
| `/api/content-center/save`     | POST   | Save content     |

### Webhooks

| Endpoint                        | Method | Description         |
| ------------------------------- | ------ | ------------------- |
| `/api/webhooks/app-uninstalled` | POST   | Handle uninstall    |
| `/api/webhooks/shop-update`     | POST   | Handle shop changes |

---

## 8. Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Security tests only
npm test -- --testPathPattern=security

# E2E tests
npm run test:e2e
```

### Key Test Files

| File                                             | What It Tests  |
| ------------------------------------------------ | -------------- |
| `src/__tests__/security/rls-integration.test.ts` | RLS policies   |
| `src/__tests__/auth/shopify-auth.test.ts`        | OAuth flow     |
| `src/__tests__/auth/token-manager.test.ts`       | Token handling |

---

## 9. Deployment

### Current Setup

- **Platform**: Render
- **Build Command**: `npm run build:render`
- **Start Command**: `npm start`

### Deploy Process

1. Push to main branch
2. Render automatically builds
3. Build runs security checks (`check-auth-bypass.js`)
4. Next.js builds
5. Deploy to production

### Environment Variables (Render)

Set all variables from section 3 in Render dashboard.

---

## 10. Known Issues & Limitations

### Current Limitations

1. **Rate Limiting**: Uses in-memory store, resets on restart
2. **Single Instance**: Not horizontally scalable without Redis
3. **Debug Endpoints**: Need authentication (see Security Audit)

### Technical Debt

| Item                           | Priority | Notes                |
| ------------------------------ | -------- | -------------------- |
| CSP frame-ancestors wildcard   | Critical | Security issue       |
| SSL verification disabled      | Critical | Security issue       |
| Debug endpoints open           | Critical | Security issue       |
| In-memory rate limiting        | High     | Needs Redis          |
| OAuth state not session-stored | High     | Security improvement |

---

## 11. Security Notes

### Important Files

- `docs/SECURITY_AUDIT_REPORT.md` - Full security audit
- `docs/CODE_REVIEW_PREPARATION.md` - Review checklist

### Critical Security Features

1. **RLS**: All database queries filtered by tenant
2. **Webhook Validation**: HMAC-SHA256 on all webhooks
3. **Input Sanitization**: XSS protection on all inputs
4. **Rate Limiting**: Per-user request limits

### Before Making Changes

1. Run `npm run security:lint`
2. Run `npm test -- --testPathPattern=security`
3. Verify RLS policies still work
4. Check webhook signatures still validate

---

## 12. Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run shopify          # Start with Shopify CLI

# Building
npm run build            # Production build
npm run build:render     # Build for Render

# Testing
npm test                 # Run tests
npm run test:coverage    # With coverage

# Linting
npm run lint             # ESLint
npm run security:lint    # Security rules

# Database
npm run db:migrate       # Run migrations
npm run db:reset         # Reset database
```

---

## 13. Troubleshooting

### Common Issues

**OAuth fails with "Invalid state"**

- State expired (10 min limit)
- Cookie not set properly
- Check NEXTAUTH_URL matches deployment URL

**Database queries return empty**

- Check RLS policies
- Verify `store_id` matches authenticated user
- Check Supabase dashboard for errors

**Webhooks not received**

- Verify SHOPIFY_WEBHOOK_SECRET
- Check Shopify Partner dashboard for delivery logs
- Ensure endpoint is publicly accessible

**Build fails**

- Run `npm audit fix`
- Check for TypeScript errors: `npx tsc --noEmit`
- Clear `.next/` and rebuild

---

## 14. Contact

For questions during handoff:

- **Primary Contact**: [Your Name]
- **Email**: [Your Email]
- **Availability**: [Your timezone]

### Documentation

- `README.md` - Quick start
- `docs/SECURITY_AUDIT_REPORT.md` - Security findings
- `docs/CODE_REVIEW_PREPARATION.md` - Review checklist
- `PRIVACY_POLICY.md` - Privacy policy

---

_This document was prepared for external code review and developer handoff._
