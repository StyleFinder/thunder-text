# ThunderText App

AI-Powered Product Description Generator for Shopify

## Overview

ThunderText helps Shopify merchants create compelling product descriptions using AI. Generate, enhance, and manage product content with intelligent coaching and content trends analysis.

## Features

- **AI Description Generation**: Create product descriptions from product data
- **Content Enhancement**: Improve existing descriptions with AI suggestions
- **Content Center**: Manage all your product content in one place
- **Trends Analysis**: Discover content trends and insights
- **Writing Coach**: Get personalized writing guidance

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Supabase account
- Shopify Partner account
- OpenAI API key

### Installation

```bash
# From monorepo root
npm install

# Install thundertext-app dependencies
npm install --workspace=@thunder-text/thundertext-app
```

### Configuration

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Configure environment variables:

```bash
# App Configuration
APP_NAME=thundertext
APP_URL=http://localhost:3050
NEXTAUTH_URL=http://localhost:3050
NEXTAUTH_SECRET=generate-random-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# Shopify
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_SCOPES=read_products,write_products,read_content,write_content

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG_ID=your-openai-org-id
```

### Development

```bash
# Run ThunderText app only
npm run dev:thundertext

# Or from monorepo root
npm run dev
```

The app will be available at [http://localhost:3050](http://localhost:3050)

### Building

```bash
# Build ThunderText app
npm run build:thundertext
```

## Project Structure

```
packages/thundertext-app/
├── src/
│   ├── app/              # Next.js 15 App Router
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── products/     # Product management
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
- Tailwind CSS 4

## API Routes

All ThunderText API routes are protected with `requireApp('thundertext')` middleware.

### Product Management

- `POST /api/products/generate` - Generate product description
- `POST /api/products/enhance` - Enhance existing description
- `GET /api/products` - List products
- `PUT /api/products/:id` - Update product

### Content Analysis

- `GET /api/trends` - Get content trends
- `GET /api/insights` - Get writing insights

## Authentication

ThunderText uses JWT-based authentication with app-scoped access control:

```typescript
import { requireApp } from "@thunder-text/shared-backend";

export async function GET(request: NextRequest) {
  const result = await requireApp("thundertext")(request);

  if (result instanceof NextResponse) {
    return result; // 401 or 403 error
  }

  const claims = result; // User is authorized
  // Handle request...
}
```

## Database

ThunderText uses Supabase PostgreSQL with Row Level Security (RLS). All queries automatically filter by `app_name = 'thundertext'`.

### Key Tables

- `shops` - Shop information
- `product_descriptions` - Generated descriptions
- `business_profiles` - Business profile data
- `coach_assignments` - Writing coach data
- `writing_reports` - Content analysis reports

## Subscription

**Price**: $29/month

**Includes**:

- AI product description generation
- Content enhancement
- Writing coach
- Trends analysis
- Unlimited products

## License

UNLICENSED - Proprietary software

## Support

For support, contact support@thundertext.com
