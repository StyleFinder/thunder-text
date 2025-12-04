# Remaining Polaris Migration Files

**Status**: 57 files still using `@shopify/polaris`
**Critical Build Blockers**: ✅ FIXED (not-found.tsx, page.tsx)

## Migration Priority

### ✅ Fixed (Build-Critical)

- [x] src/app/not-found.tsx
- [x] src/app/page.tsx (home)
- [x] src/app/components/AppNavigation.tsx
- [x] src/app/components/AppLayout.tsx
- [x] src/app/components/PolarisProvider.tsx

### 🔴 High Priority (Main User Flows)

These pages are in primary user workflows and should be migrated next:

```
src/app/dashboard/page.tsx
src/app/create/page.tsx
src/app/enhance/
  ├─ UnifiedEnhancePage.tsx
  ├─ components/EnhanceForm.tsx
  ├─ components/ProductSelector.tsx
  ├─ components/ComparisonView.tsx
  └─ components/ProductContextPanel.tsx
```

### 🟡 Medium Priority (Feature Pages)

Important features but less frequently accessed:

```
src/app/aie/
  ├─ page.tsx
  └─ library/page.tsx

src/app/facebook-ads/page.tsx
src/components/facebook/
  ├─ FacebookSettingsCard.tsx
  ├─ CreateFacebookAdFlow.tsx
  ├─ CreateAdModal.tsx
  ├─ CampaignSelector.tsx
  ├─ CampaignMetricsCard.tsx
  └─ AdPreview.tsx

src/app/business-profile/page.tsx
src/app/brand-voice/
  ├─ page.tsx
  ├─ profile/page.tsx
  ├─ edit/page.tsx
  ├─ edit/quick-start/page.tsx
  └─ settings/page.tsx

src/app/best-practices/page.tsx
src/app/content-center/
  ├─ layout.tsx
  ├─ library/page.tsx
  ├─ samples/page.tsx
  └─ voice/page.tsx

src/app/trends/page.tsx
```

### 🟢 Low Priority (Settings, Auth, Test Pages)

Can be migrated last or as needed:

```
src/app/settings/
  ├─ page.tsx
  └─ prompts/
      ├─ page.tsx
      ├─ page-v2-card-based.tsx
      └─ page-old.tsx

src/app/auth/
  ├─ login/page.tsx
  ├─ signup/page.tsx
  └─ error/page.tsx

src/app/coach/login/page.tsx

Test/Debug Pages:
  ├─ src/app/test-campaigns/page.tsx
  ├─ src/app/test-create-ad/page.tsx
  ├─ src/app/test-session/page.tsx
  ├─ src/app/token-display/page.tsx
  └─ src/app/get-token/page.tsx
```

### 📦 Shared Components

Need to be updated as they're used across multiple pages:

```
src/app/components/
  ├─ ProductTypeSelector.tsx
  ├─ CategoryTemplateSelector.tsx
  ├─ ProductDescriptionOverlay.tsx
  ├─ trends/
  │   ├─ TrendThermometer.tsx
  │   ├─ ThemeSelector.tsx
  │   └─ TrendStatusBadge.tsx
  ├─ shared/
  │   ├─ AdditionalInfoForm.tsx
  │   ├─ ProductDetailsForm.tsx
  │   ├─ ProductImageUpload.tsx
  │   └─ EnhancedContentComparison.tsx
  └─ onboarding/
      ├─ AppIntroduction.tsx
      └─ AppIntroductionModal.tsx

src/components/
  ├─ ShopSizes.tsx
  └─ content-center/... (multiple files)
```

## Quick Migration Commands

### Find all Polaris imports

```bash
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "@shopify/polaris"
```

### Check specific file for Polaris usage

```bash
grep -n "@shopify/polaris" src/app/dashboard/page.tsx
```

### Count remaining files

```bash
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "@shopify/polaris" | wc -l
```

## Migration Strategy

### Recommended Approach

1. **One page at a time** - Migrate, test, commit
2. **Use the guide** - Reference [POLARIS_MIGRATION.md](docs/POLARIS_MIGRATION.md)
3. **Start simple** - Begin with pages that have fewer Polaris components
4. **Test navigation** - Ensure routing still works after each migration

### Bulk Migration (Advanced)

For experienced developers who want to migrate multiple files:

```bash
# Create a branch for bulk migration
git checkout -b feature/polaris-bulk-migration

# Use find-and-replace for common patterns:
# Page → <div className="container mx-auto p-6">
# Card → import { Card } from '@/components/ui/card'
# Button → import { Button } from '@/components/ui/button'

# Run tests after each batch
npm run type-check
```

## What Won't Break

Even though 57 files still use Polaris, the app will:

- ✅ Build successfully (no build-time imports)
- ✅ Load the home page
- ✅ Show navigation
- ✅ Display 404 page
- ❌ Error when navigating to un-migrated pages

## Next Actions

1. Pick one page from "High Priority"
2. Open [POLARIS_MIGRATION.md](docs/POLARIS_MIGRATION.md)
3. Replace Polaris components with modern equivalents
4. Test the page
5. Commit and move to next page

**Estimated Time**: 15-20 minutes per simple page, 45-60 minutes per complex page
