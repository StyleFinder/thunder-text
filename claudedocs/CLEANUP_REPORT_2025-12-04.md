# Thunder Text Cleanup Report
**Generated:** 2025-12-04
**Branch:** `feature/html-formatting-rich-editor`

---

## Executive Summary

The Thunder Text codebase has accumulated significant technical debt including:
- **58 markdown files** in project root (many are migration/status docs)
- **30+ claudedocs files** with analyses and reports
- **10 files** importing `@shopify/polaris` which is NOT installed
- **8 debug/test pages** that should be removed for production
- **Multiple backup files** (`.backup.tsx`, `page-old.tsx`)
- **Log files and temp scripts** in project root

---

## Critical Issues

### 1. Broken Polaris Imports (10 files)
Files importing `@shopify/polaris` but the package is NOT in dependencies:

| File | Status |
|------|--------|
| `src/app/settings/prompts/page-old.tsx` | Dead code - uses Polaris |
| `src/app/settings/prompts/page-v2-card-based.tsx` | Dead code - uses Polaris |
| `src/app/enhance/page.backup-full.tsx` | Backup file - should delete |
| `src/app/enhance/components/TokenExchangeHandler.tsx` | ⚠️ Broken import |
| `src/app/enhance/components/ComparisonView.tsx` | ⚠️ Broken import |
| `src/app/enhance/components/RichTextEditor.tsx` | ⚠️ Broken import |
| `src/app/enhance/components/EnhanceForm.tsx` | ⚠️ Broken import |
| `src/app/enhance/components/ProductContextPanel.tsx` | ⚠️ Broken import |
| `src/app/components/ProductDescriptionOverlay.tsx` | ⚠️ Broken import |
| `src/app/components/onboarding/AppIntroductionModal.tsx` | ⚠️ Broken import |

**Recommendation:** Either install `@shopify/polaris` or remove all Polaris imports and refactor to use your ACE/Radix UI components.

---

## Files to Delete

### Backup/Old Files (Safe to Delete)
```bash
# Backup files
rm src/app/enhance/page.backup.tsx
rm src/app/enhance/page.backup-full.tsx
rm src/app/settings/prompts/page-old.tsx
rm src/app/settings/prompts/page-v2-card-based.tsx
rm .env.local.bak
rm .claude/CLAUDE.md.backup
```

### Debug/Test Pages (Remove for Production)
```bash
# Debug pages that expose internal state
rm -rf src/app/debug-appbridge/
rm -rf src/app/debug-token/
rm -rf src/app/test-session/
rm -rf src/app/test-campaigns/
rm -rf src/app/test-create-ad/
rm -rf src/app/token-display/
rm -rf src/app/get-token/
rm -rf src/app/store-token/
```

### Log Files (Gitignored but should be cleaned)
```bash
rm ngrok.log
rm dev.log
rm dev-server.log
```

### Root-Level Scripts (Move to scripts/ or delete)
```bash
# One-time migration SQL files - likely obsolete
rm apply_migrations.sql
rm comprehensive_rls_fix.sql
rm custom_categories_migration.sql
rm development_rls_fix.sql
rm disable_rls_completely.sql
rm hierarchical_categories_migration.sql
rm incremental_migration.sql
rm manual_token_insert.sql
rm shopify_auth_migration.sql
rm store_token.sql
rm supabase_migration.sql

# Fix/utility scripts - consolidate or delete
rm fix-all-orphans.sh
rm fix-cors-all-endpoints.sh
rm fix-orphaned-code.js
rm fix-orphans.py

# Test scripts in root - move to scripts/
rm test-app-bridge.html
rm test-rls-puppeteer.js
rm test_anon_key.js
rm test_supabase_insert.js
rm verify-rls-cli.js
rm verify-rls-direct.js
rm verify-rls-working.js
```

---

## Documentation Cleanup

### Root MD Files (58 total)
Many are migration/status documents that belong in `docs/` or `claudedocs/`:

**Keep in Root:**
- `README.md` - Essential
- `CLAUDE.md` - Claude Code instructions
- `PRIVACY_POLICY.md` - Legal requirement

**Move to `docs/`:**
- `AUTHENTICATION_IMPROVEMENT_PLAN.md`
- `DEPLOYMENT_INSTRUCTIONS.md`
- `DEV_APP_SETUP_GUIDE.md`
- `DEVELOPMENT_WORKFLOW.md`
- `PRODUCTION_READY_GUIDELINES.md`
- `PRODUCT_TYPE_FIRST_WORKFLOW.md`
- `SHOPIFY_AUTH_SETUP.md`
- `SHOPIFY_TROUBLESHOOTING_GUIDE.md`

**Move to `claudedocs/` or Delete (Status/Migration Reports):**
- `ACE_DESIGN_SYSTEM.md`
- `ACE_INTEGRATION_COMPLETE.md`
- `ACE_UI_MIGRATION_COMPLETE.md`
- `AUTH_MIGRATION_CHECKLIST.md`
- `AUTH_MIGRATION_STRATEGY.md`
- `BUILD_FIX_COMPLETE.md`
- `CORS_SECURITY_FIX.md`
- `DATABASE_VERIFICATION.md`
- `DEPLOYMENT_STATUS.md`
- `DESIGN_SYSTEM.md`
- `DESIGN_SYSTEM_STATUS.md`
- `EMBEDDED_AUTH_FIX.md`
- `EXTERNAL_AUTH_GUIDE.md`
- `LAYOUT_ANALYSIS.md`
- `LAYOUT_FIX_SUMMARY.md`
- `MIGRATION_STATUS.md`
- `MIGRATION_TO_RENDER.md`
- `OAUTH_INSTALLATION.md`
- `PACKAGES_REVIEW.md`
- `PHASE1_COMPLETE.md`
- `PHASE1_PROGRESS.md`
- `PHASE2_PROGRESS.md`
- `PHASE3_SUMMARY.md`
- `POLARIS_REMOVAL_SUMMARY.md`
- `PR_SUMMARY.md`
- `QUICK_COMMANDS.md`
- `QUICK_FIX_TOKEN_EXCHANGE.md`
- `REMAINING_POLARIS_FILES.md`
- `RENDER_ENV_FIX.md`
- `RENDER_ENV_REQUIRED.md`
- `RLS_COMPLETION_SUMMARY.md`
- `SECURITY_PROGRESS.md`
- `SOLUTION_IMPLEMENTED.md`
- `TOKEN_EXCHANGE_SETUP.md`
- `TYPESCRIPT_FIXES_SUMMARY.md`
- `UI_MIGRATION_COMPLETE.md`
- `X_FRAME_OPTIONS_FIX.md`

---

## Recommended Cleanup Commands

### Phase 1: Safe Deletions (Immediate)
```bash
cd /Users/bigdaddy/projects/thunder-text

# Remove log files
rm -f ngrok.log dev.log dev-server.log

# Remove backup files
rm -f src/app/enhance/page.backup.tsx
rm -f src/app/enhance/page.backup-full.tsx
rm -f src/app/settings/prompts/page-old.tsx
rm -f src/app/settings/prompts/page-v2-card-based.tsx
rm -f .env.local.bak

# Remove debug pages
rm -rf src/app/debug-appbridge/
rm -rf src/app/debug-token/
rm -rf src/app/test-session/
rm -rf src/app/test-campaigns/
rm -rf src/app/test-create-ad/
rm -rf src/app/token-display/
rm -rf src/app/get-token/
rm -rf src/app/store-token/
```

### Phase 2: Migration SQL Files
```bash
# Archive old SQL migrations
mkdir -p archive/migrations
mv *.sql archive/migrations/ 2>/dev/null || true
```

### Phase 3: Documentation Consolidation
```bash
# Move status reports to claudedocs
mv *_COMPLETE.md claudedocs/ 2>/dev/null || true
mv *_FIX*.md claudedocs/ 2>/dev/null || true
mv *_STATUS.md claudedocs/ 2>/dev/null || true
mv *_PROGRESS.md claudedocs/ 2>/dev/null || true
mv *_SUMMARY.md claudedocs/ 2>/dev/null || true
```

### Phase 4: Fix Polaris Imports
Either:
1. **Install Polaris:** `npm install @shopify/polaris` (if still needed)
2. **Remove Polaris imports:** Refactor the 10 files to use ACE/Radix components

---

## Disk Space Estimates

| Category | Files | Est. Size |
|----------|-------|-----------|
| Backup/Old files | 6 | ~80KB |
| Debug pages | 8 dirs | ~40KB |
| Root SQL files | 11 | ~100KB |
| Log files | 3 | ~60KB |
| Excess MD files | 40+ | ~400KB |
| **Total Cleanup** | ~70 items | **~680KB** |

---

## Post-Cleanup Verification

After cleanup, run:
```bash
# Verify build still works
npm run build

# Check for broken imports
npm run type-check

# Run tests
npm test
```

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Broken Polaris imports | 10 files | Fix or remove |
| Backup files | 6 files | Delete |
| Debug/test pages | 8 dirs | Delete |
| Root SQL files | 11 files | Archive |
| Log files | 3 files | Delete |
| Root MD files | 55 excess | Consolidate |
| Total items to address | ~93 | |

**Priority:**
1. 🔴 Fix broken Polaris imports (blocks build if files are used)
2. 🟡 Remove debug pages (security concern in production)
3. 🟢 Clean up documentation (improves maintainability)
