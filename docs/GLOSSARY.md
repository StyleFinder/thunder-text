# Thunder Text Glossary

This glossary maintains a single source of truth for all naming conventions, preventing variable/concept duplication like the `shops` vs `stores` confusion.

**Last Updated**: 2025-01-15

---

## Core Concepts

### shop (noun) - Table: `shops`
**Definition**: A Shopify store installation that has installed Thunder Text
**Database**: `shops` table (id, shop_domain, access_token, scope, plan, settings, usage_limits, current_usage)
**Code references**: `getShopById()`, `Shop` type, `shop_id` foreign keys
**TypeScript types**: `Shop`, `ShopData`, `ShopWithToken`, `ShopCredentials`
**Why this name**: Matches Shopify's terminology for merchant stores
**Related tables**: All tables reference `shops.id` via `store_id` foreign key
**DO NOT confuse with**: ~~`stores`~~ (DEPRECATED - consolidated into `shops` in migration 012)

**History**:
- Initially created as `shops` for OAuth credentials
- Duplicate `stores` table created later, causing confusion
- Consolidated back to `shops` in migration `012_consolidate_stores_into_shops.sql`
- **Always use "shop" for any Shopify store concept**

---

### system_prompt (noun) - Table: `system_prompts`
**Definition**: Master AI instructions defining ThunderText's behavior and writing guidelines
**Database**: `system_prompts` table (id, name, content, is_default, is_active, created_at, updated_at, store_id)
**Code references**: `getSystemPrompt()`, `SystemPrompt` type
**Foreign keys**: `store_id` → `shops.id`
**Why this name**: Distinguishes master AI instructions from category-specific templates
**Default content**: ThunderText Master AI Assistant (5,663 characters)
**DO NOT confuse with**: `category_templates` (category-specific guidance)

**Usage**:
- One default system prompt per shop
- Defines AI assistant role, responsibilities, writing principles
- Used in conjunction with category templates for product description generation

---

### category_template (noun) - Table: `category_templates`
**Definition**: Category-specific product description templates and structure guidance
**Database**: `category_templates` table (id, name, category, content, is_default, store_id)
**Code references**: `getCategoryTemplate()`, `CategoryTemplate` type
**Foreign keys**: `store_id` → `shops.id`
**Categories**: `womens_clothing`, `jewelry_accessories`, `general`
**Why this name**: Applies to specific product categories, provides structure
**Related to**: `system_prompts` (used together for AI generation)

**Usage**:
- Multiple templates per shop (one per category)
- Provides category-specific formatting and content structure
- Combined with system prompt for complete AI generation instructions

---

### product (noun) - Table: `products`
**Definition**: Shopify product synchronized to Thunder Text for description generation
**Database**: `products` table (id, shop_domain, shopify_product_id, title, description, images, variants, metadata)
**Code references**: `getProduct()`, `Product` type, `createProduct()`
**Foreign keys**: `shop_domain` → `shops.shop_domain` (string reference, not UUID)
**Why this name**: Directly maps to Shopify's product concept
**Sync**: Synchronized via Shopify webhooks and API polling

---

### generation_job (noun) - Table: `generation_jobs`
**Definition**: AI product description generation request and result tracking
**Database**: `generation_jobs` table (id, shop_domain, product_id, status, ai_description, created_at, completed_at)
**Code references**: `createGenerationJob()`, `GenerationJob` type
**Foreign keys**: `shop_domain` → `shops.shop_domain`
**Statuses**: `pending`, `processing`, `completed`, `failed`
**Why this name**: Represents asynchronous AI generation work

---

## Naming Conventions

### Database Tables
- ✅ **Singular nouns**: `shop`, `product`, `user`, `generation_job`
- ✅ **Snake case**: `system_prompt`, `category_template`, `generation_job`
- ✅ **One concept = one table**: Never create `shops` AND `stores` for same thing
- ❌ **Never plural**: Use `shop` not `shops` as table name

### TypeScript Types
- ✅ **PascalCase**: `Shop`, `Product`, `SystemPrompt`, `CategoryTemplate`
- ✅ **Match table names**: `Shop` type for `shops` table
- ✅ **Descriptive suffixes**: `ShopData`, `ShopWithToken`, `ShopCredentials`
- ❌ **Never create duplicates**: Don't create `StoreData` when `ShopData` exists

### Function Names
- ✅ **camelCase**: `getShop()`, `createShop()`, `updateShop()`
- ✅ **Consistent prefixes**: `get`, `create`, `update`, `delete`
- ✅ **Same root word**: All shop-related functions use "shop" not "store"
- ❌ **Never mix**: Don't use `getShop()` with `updateStore()`

### Foreign Keys
- ✅ **Pattern**: `{table_name}_id` (e.g., `shop_id`, `product_id`, `user_id`)
- ✅ **Exception**: `store_id` references `shops.id` (historical - DO NOT change)
- ✅ **Consistent across all tables**
- ❌ **Never mix**: Don't use `shop_id` in one table, `store_id` in another (except legacy `store_id` → `shops.id`)

**Note on `store_id`**: Due to historical reasons and the `shops` vs `stores` consolidation, foreign keys use `store_id` but reference `shops.id`. This is intentional and should NOT be changed without a comprehensive migration.

---

## Deprecated Concepts

### ~~stores~~ (DEPRECATED)
**Status**: REMOVED in migration `012_consolidate_stores_into_shops.sql`
**Original purpose**: Billing and subscription data (never used)
**Problem**: Created duplicate concept with `shops`, caused hours of debugging
**Resolution**: All columns consolidated into `shops` table
**Action**: Always use `shops` table and "shop" terminology

---

## Adding New Concepts

**BEFORE creating any new variable, type, table, or function:**

1. **🔍 SEARCH** for similar concepts:
   ```bash
   grep -r "concept_name" --include="*.ts" --include="*.tsx" --include="*.sql"
   ```

2. **❓ ASK** clarifying questions:
   - "Does a similar concept already exist?"
   - "Should I extend existing concept or create new one?"
   - "What's the fundamental difference?"

3. **📊 SHOW** comparison analysis:
   - Side-by-side comparison of existing vs proposed
   - Clear justification for why new concept is needed

4. **📝 UPDATE** this GLOSSARY.md:
   - Add complete entry with all fields
   - Document relationships and differences
   - Explain naming choice

5. **✅ VERIFY** consistency:
   - Follows naming conventions
   - No conflicts with existing concepts
   - Foreign keys follow patterns

---

## Glossary Update Log

| Date | Concept Added/Modified | Reason |
|------|------------------------|--------|
| 2025-01-15 | Initial glossary creation | Document current state after shops/stores consolidation |
| 2025-01-15 | Deprecated `stores` table | Consolidated into `shops` in migration 012 |

---

## Questions to Ask Before Adding New Concepts

1. Does this concept already exist under a different name?
2. Can I extend an existing table/type instead of creating new?
3. What makes this fundamentally different from similar concepts?
4. Will future developers confuse this with existing concepts?
5. Have I searched the entire codebase for related terminology?
6. Have I documented the comparison in this glossary?

**Remember**: The `shops` vs `stores` confusion cost hours of debugging. Prevention through documentation and verification is worth the extra 5 minutes upfront.
