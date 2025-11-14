# Route Mapping: Main App → ThunderText/ACE

**Purpose**: Document which routes belong to which app for Phase 3 migration

---

## ThunderText Routes (`@thunder-text/thundertext-app`)

### Core Features
- `/` - Dashboard/Home
- `/dashboard` - Main dashboard
- `/products` - Product listing
- `/create` - Create product description
- `/enhance` - Enhance existing descriptions
- `/content-center` - Content management
- `/trends` - Content trends and insights

### Coaching & Reports
- `/checklist` - Onboarding checklist
- `/onboarding` - User onboarding flow
- `/help` - Help and documentation

### Settings & Configuration
- `/settings` - User settings
- `/install` - App installation

### Authentication & Utilities
- `/embedded` - Shopify embedded app frame
- `/embed` - Embed utilities
- `/get-token` - Token retrieval
- `/store-token` - Token storage
- `/token-display` - Token display utilities
- `/redirect` - Authentication redirects

### API Routes (ThunderText)
- `/api/products` - Product CRUD operations
- `/api/generate` - AI description generation
- `/api/enhance` - Description enhancement
- `/api/business-profile` - Business profile management
- `/api/auth/*` - Authentication endpoints
- `/api/shopify/*` - Shopify integration endpoints

---

## ACE Routes (`@thunder-text/ace-app`)

### Core Features
- `/` - ACE Dashboard/Home
- `/dashboard` - ACE dashboard with ad metrics
- `/facebook-ads` - Facebook ad management
- `/aie` - Ad Intelligence Engine
- `/aie/dashboard` - AIE analytics dashboard
- `/aie/best-practices` - Best practice ads
- `/aie/library` - Ad library management
- `/test-campaigns` - Campaign testing
- `/test-create-ad` - Ad creation testing

### API Routes (ACE)
- `/api/aie/*` - Ad Intelligence Engine endpoints
- `/api/facebook/*` - Facebook API integration
- `/api/ad-library/*` - Ad library management
- `/api/campaigns/*` - Campaign management
- `/api/generate-ad` - AI ad generation

---

## Shared Routes (Both Apps)

### Authentication (via shared-backend)
- Authentication handled by `@thunder-text/shared-backend`
- JWT middleware enforces app-scoped access

### Shopify App Bridge
- Both apps use Shopify App Bridge
- Configured separately per app with different scopes

---

## Debug/Development Routes (Remove in Production)

### Development Only
- `/debug-appbridge` - App Bridge debugging
- `/debug-token` - Token debugging
- `/test-session` - Session testing
- `/api/debug/*` - Debug API endpoints

**Action**: These routes should be removed or disabled in production builds

---

## Static/Legal Routes

### Legal Pages
- `/privacy` - Privacy policy (shared content, separate hosting)

**Action**: Host privacy policy separately or duplicate for compliance

---

## Route Migration Strategy

### Phase 3A: ThunderText Routes
1. Copy ThunderText routes to `packages/thundertext-app/src/app/`
2. Update imports to use `@thunder-text/shared-backend` and `@thunder-text/shared-ui`
3. Add `requireApp('thundertext')` middleware to API routes
4. Test all ThunderText features

### Phase 3B: ACE Routes
1. Copy ACE routes to `packages/ace-app/src/app/`
2. Update imports to use shared packages
3. Add `requireApp('ace')` middleware to API routes
4. Test all ACE features

### Phase 3C: Shared Components
1. Extract common components to `@thunder-text/shared-ui`
2. Extract common hooks and utilities
3. Update both apps to use shared components

---

## Port Assignments

- **ThunderText**: `http://localhost:3050`
- **ACE**: `http://localhost:3051`
- **Shared Backend**: Imported as package (no separate server)

---

## Environment Variables

### ThunderText Specific
```bash
APP_NAME=thundertext
APP_URL=http://localhost:3050
SHOPIFY_SCOPES=read_products,write_products,read_content,write_content
```

### ACE Specific
```bash
APP_NAME=ace
APP_URL=http://localhost:3051
SHOPIFY_SCOPES=read_products,read_content
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

---

## Next Steps

1. ✅ Phase 3 Initial Structure - **COMPLETE**
2. ⏳ Migrate ThunderText routes to separate app
3. ⏳ Migrate ACE routes to separate app
4. ⏳ Extract shared components
5. ⏳ Test independent builds
6. ⏳ Update deployment configurations

---

## Notes

- **API Middleware**: All app-specific API routes must use `requireApp()` middleware
- **Database Access**: RLS policies automatically filter by `app_name` column
- **Authentication**: JWT tokens contain `apps` claim for access control
- **Shared Backend**: Both apps import from `@thunder-text/shared-backend` package
- **Shared UI**: Common components in `@thunder-text/shared-ui` package
