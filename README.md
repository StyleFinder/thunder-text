# Thunder Text - AI Product Description Generator

Thunder Text is an AI-powered Shopify application that generates compelling, SEO-optimized product descriptions from images using advanced GPT-4 Vision technology.

## Features

### MVP Features ✅
- **AI-Powered Generation**: Generate product descriptions from images using GPT-4 Vision API
- **Shopify Integration**: Native OAuth authentication and product management
- **SEO Optimization**: Automatically generate SEO-friendly content and meta tags
- **Usage Tracking**: Centralized API key management with usage monitoring
- **Polaris UI**: Native Shopify admin experience with responsive design
- **Secure Backend**: Supabase with Row Level Security for multi-tenant isolation

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Shopify Partner Dashboard                │
├─────────────────────────────────────────────────────────────┤
│           Thunder Text Embedded Application                 │
├─────────────────────────────────────────────────────────────┤
│  Dashboard  │  Product Entry  │  Bulk Process  │  Settings  │
├─────────────────────────────────────────────────────────────┤
│                    Supabase Backend Services               │
├─────────────────────────────────────────────────────────────┤
│ Edge Functions │ PostgreSQL │ Auth │ Storage │ Real-time   │
├─────────────────────────────────────────────────────────────┤
│                    External Services Layer                  │
├─────────────────────────────────────────────────────────────┤
│ OpenAI API (Master Key) │ Shopify API │ Google APIs        │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **UI Framework**: Shopify Polaris for native admin experience
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Authentication**: NextAuth.js with Shopify OAuth
- **AI Integration**: OpenAI GPT-4 Vision API with master key management
- **Testing**: Jest + React Testing Library
- **Deployment**: Render (Full-stack) + Supabase (Backend)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Shopify Partner account
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd thunder-text
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables:
   - **Shopify**: Create a new app in Shopify Partners
   - **Supabase**: Create new project and get URL/keys
   - **OpenAI**: Get API key from OpenAI dashboard

5. Run database migrations:
```bash
# Apply Supabase migrations
npx supabase db push
```

6. Start the development server:
```bash
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SHOPIFY_API_KEY` | Shopify app API key | ✅ |
| `SHOPIFY_API_SECRET` | Shopify app API secret | ✅ |
| `SHOPIFY_SCOPES` | Required OAuth scopes | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `OPENAI_API_KEY` | OpenAI API key (master) | ✅ |
| `NEXTAUTH_SECRET` | NextAuth.js secret | ✅ |

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run CI tests
npm run test:ci
```

### Code Quality

```bash
# Lint code
npm run lint

# Type checking
npm run type-check

# Build for production
npm run build
```

### Database Schema

The application uses Supabase PostgreSQL with the following core tables:

- `stores` - Shopify store information and settings
- `products` - Product generation history and metadata
- `images` - Image analysis results and processing data
- `templates` - Custom generation templates
- `generation_jobs` - Batch processing jobs
- `usage_metrics` - Billing and usage tracking

## API Endpoints

### Generation API
- `POST /api/generate` - Generate product descriptions from images
- `GET /api/shopify/products` - Fetch Shopify products
- `POST /api/shopify/products` - Update Shopify products with generated content

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js endpoints
- `GET /api/shopify/auth/callback` - Shopify OAuth callback

## Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Configure environment variables in Render dashboard:
   ```bash
   # Build Command
   npm install && npm run build
   
   # Start Command  
   npm start
   
   # Environment Variables
   NODE_ENV=production
   SHOPIFY_API_KEY=your_production_key
   SHOPIFY_API_SECRET=your_production_secret
   NEXT_PUBLIC_SUPABASE_URL=your_production_url
   SUPABASE_SERVICE_KEY=your_production_service_key
   OPENAI_API_KEY=your_openai_master_key
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=https://thunder-text-nine.vercel.app
   ```
3. Deploy automatically on push to main branch
4. Configure custom domain (optional)

### Development Store Setup

**Test Store**: `zunosai-staging-test-store.myshopify.com`
- Use this development store for testing OAuth flows
- Test product generation and publishing
- Validate metafield creation and SEO data
- Test user workflows and edge cases

### Shopify App Store Submission

1. Complete Partner Dashboard app configuration
2. Add required app URLs and webhooks:
   ```
   App URL: https://thunder-text-nine.vercel.app
   Allowed redirection URLs: https://thunder-text-nine.vercel.app/api/auth/callback/shopify
   ```
3. Submit for review following Shopify guidelines

## Usage Limits & Pricing

### Subscription Tiers

| Plan | Price | Generations | Features |
|------|-------|-------------|----------|
| Starter | $29/month | 500 | Basic templates, Standard support |
| Professional | $79/month | 2,000 | Advanced templates, Priority support, Bulk processing |
| Enterprise | $199/month | 5,000 | Multi-store, API access, Team collaboration |

### Cost Management

- Centralized OpenAI API key management
- Real-time usage tracking and alerts
- Automatic overage protection
- Transparent cost attribution per store

## Security

- Row Level Security (RLS) for multi-tenant data isolation
- Secure session management with NextAuth.js
- Environment-based configuration
- API rate limiting and validation
- GDPR compliance features

## Performance

- Target metrics:
  - AI processing: <30 seconds per product
  - Page load times: <2 seconds
  - System uptime: 99.9%
  - Test coverage: >90%

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new functionality
- Use Shopify Polaris components
- Follow security guidelines
- Maintain 90%+ test coverage

## Troubleshooting

### Common Issues

1. **OAuth Issues**: Verify Shopify app URLs and redirect URIs
2. **Database Connection**: Check Supabase connection strings and RLS policies
3. **AI Generation Errors**: Validate OpenAI API key and usage limits
4. **Build Errors**: Clear `.next` cache and reinstall dependencies

### Support

- GitHub Issues: [Report bugs and feature requests]
- Documentation: [Additional guides and tutorials]
- Community: [Discord/Slack for developer discussions]

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

### Phase 2 (Months 5-8)
- Bulk processing for 100+ products
- Advanced template system
- Multi-language support
- Analytics dashboard

### Phase 3 (Months 9-12)
- Multi-store management
- API and webhook system
- Team collaboration features
- Advanced AI training

### Phase 4 (Year 2)
- Video and 3D image analysis
- Multi-platform expansion
- Predictive analytics
- Global market features

---

Built with ❤️ for the Shopify ecosystem
