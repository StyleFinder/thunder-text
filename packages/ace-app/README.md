# ACE - Ad Copy Engine

AI-Powered Facebook Ad Generator for Shopify

## Overview

ACE (Ad Copy Engine) helps Shopify merchants create high-converting Facebook ad copy using AI. Generate multiple ad variants, analyze best practices, and integrate directly with Facebook Ads Manager.

## Features

- **AI Ad Generation**: Create Facebook ad copy from product data
- **Ad Intelligence Engine (AIE)**: Learn from best-performing ads
- **Multiple Variants**: Generate diverse ad angles and copy styles
- **Facebook Integration**: Direct integration with Facebook Ads Manager
- **Ad Library**: Manage and track your ad performance
- **Best Practices**: Access curated high-performing ad examples

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Supabase account
- Shopify Partner account
- OpenAI API key
- Facebook App (for ad integration)

### Installation

```bash
# From monorepo root
npm install

# Install ace-app dependencies
npm install --workspace=@thunder-text/ace-app
```

### Configuration

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Configure environment variables:

```bash
# App Configuration
APP_NAME=ace
APP_URL=http://localhost:3051
NEXTAUTH_URL=http://localhost:3051
NEXTAUTH_SECRET=generate-random-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# Shopify
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_SCOPES=read_products,read_content

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG_ID=your-openai-org-id

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

### Development

```bash
# Run ACE app only
npm run dev:ace
```

The app will be available at [http://localhost:3051](http://localhost:3051)

### Building

```bash
# Build ACE app
npm run build:ace
```

## Project Structure

```
packages/ace-app/
├── src/
│   ├── app/              # Next.js 15 App Router
│   │   ├── api/          # API routes
│   │   ├── aie/          # Ad Intelligence Engine pages
│   │   ├── facebook-ads/ # Facebook ad management
│   │   └── ...
│   ├── components/       # App-specific components
│   └── lib/              # App-specific utilities
├── public/               # Static assets
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

## Dependencies

### Shared Packages

- `@thunder-text/shared-backend` - Backend services and utilities
- `@thunder-text/shared-ui` - Shared UI components

### Key Dependencies

- Next.js 15.5.2
- React 19.1.0
- Shopify Polaris 13.9.5
- Shopify App Bridge
- Supabase
- OpenAI
- Recharts (analytics)
- Tailwind CSS 4

## API Routes

All ACE API routes are protected with `requireApp('ace')` middleware.

### Ad Generation

- `POST /api/aie/generate` - Generate ad copy
- `POST /api/aie/variants` - Generate ad variants
- `GET /api/aie/best-practices` - Get best practice ads
- `GET /api/aie/library` - Get user's ad library

### Facebook Integration

- `POST /api/facebook/auth` - Facebook OAuth
- `GET /api/facebook/campaigns` - List campaigns
- `POST /api/facebook/create-ad` - Create ad in Facebook
- `GET /api/facebook/insights` - Get ad performance data

### Analytics

- `GET /api/aie/analytics` - Get ad performance analytics
- `POST /api/aie/track` - Track ad performance

## Authentication

ACE uses JWT-based authentication with app-scoped access control:

```typescript
import { requireApp } from "@thunder-text/shared-backend";

export async function GET(request: NextRequest) {
  const result = await requireApp("ace")(request);

  if (result instanceof NextResponse) {
    return result; // 401 or 403 error
  }

  const claims = result; // User is authorized
  // Handle request...
}
```

## Database

ACE uses Supabase PostgreSQL with Row Level Security (RLS). All queries automatically filter by `app_name = 'ace'`.

### Key Tables

- `shops` - Shop information
- `facebook_ad_drafts` - Generated ad drafts
- `ad_library` - User's ad library
- `aie_ad_requests` - Ad generation requests
- `aie_ad_variants` - Generated ad variants
- `aie_ad_examples` - Best practice ad examples
- `integrations` - Facebook integration data

## Ad Intelligence Engine (AIE)

AIE analyzes thousands of high-performing Facebook ads to generate better copy:

### Features

- **Best Practice Analysis**: Learn from top-performing ads
- **Semantic Search**: Find relevant ad examples using vector embeddings
- **Multiple Variants**: Generate diverse ad angles
- **Performance Tracking**: Track ad performance metrics

### Ad Variant Types

- Emotional hooks
- Benefit-focused
- Social proof / UGC
- Problem-solution
- Feature highlights
- Curiosity-driven

## Facebook Integration

### Setup

1. Create Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add Marketing API permissions
3. Configure OAuth redirect URL
4. Add credentials to `.env.local`

### Permissions Required

- `ads_management`
- `ads_read`
- `business_management`
- `pages_read_engagement`

## Subscription

**Price**: $49/month

**Includes**:

- AI ad copy generation
- Ad Intelligence Engine
- Facebook Ads integration
- Multiple ad variants
- Performance analytics
- Best practice library

## License

UNLICENSED - Proprietary software

## Support

For support, contact support@aceadcopy.com
