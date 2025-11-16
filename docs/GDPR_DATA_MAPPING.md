# GDPR Data Mapping - Thunder Text

## Overview

This document maps Thunder Text data to GDPR requirements and webhook handlers.

---

## Webhook Requirements

Shopify requires 3 mandatory GDPR webhooks:

1. **shop/redact** - Delete all shop data when merchant uninstalls or requests deletion
2. **customers/redact** - Delete customer data on GDPR request (if we store any)
3. **customers/data_request** - Export customer data on GDPR request (if we store any)

---

## Data Classification

### Shop-Level Data (Merchant Data)

**Trigger**: `shop/redact` webhook

All data tied to `store_id` (which references `shops.id`):

| Table                            | Data Type                      | Deletion Strategy                  |
| -------------------------------- | ------------------------------ | ---------------------------------- |
| `shops`                          | Auth tokens, shop domain       | CASCADE DELETE (primary)           |
| `business_profiles`              | Brand voice, business info     | CASCADE DELETE                     |
| `business_profile_responses`     | Interview answers              | CASCADE DELETE                     |
| `brand_voice_profiles`           | Voice settings                 | CASCADE DELETE                     |
| `content_samples`                | Brand content examples         | CASCADE DELETE                     |
| `system_prompts`                 | Custom prompts                 | CASCADE DELETE (if store-specific) |
| `category_templates`             | Custom templates               | CASCADE DELETE (if store-specific) |
| `seasonal_profiles`              | Seasonal content               | CASCADE DELETE                     |
| `generated_content`              | AI-generated descriptions      | CASCADE DELETE                     |
| `product_descriptions`           | Product content                | CASCADE DELETE                     |
| `generation_jobs`                | Background jobs                | CASCADE DELETE                     |
| `profile_generation_history`     | Generation logs                | CASCADE DELETE                     |
| `usage_metrics`                  | Usage analytics                | CASCADE DELETE                     |
| `usage_alerts`                   | Billing alerts                 | CASCADE DELETE                     |
| `integrations`                   | Facebook/external integrations | CASCADE DELETE                     |
| `facebook_ad_drafts`             | Facebook ad content            | CASCADE DELETE                     |
| `facebook_notification_settings` | Notification prefs             | CASCADE DELETE                     |
| `facebook_alert_history`         | Alert logs                     | CASCADE DELETE                     |
| `shopify_sessions`               | Session tokens                 | CASCADE DELETE                     |
| `shop_sizes`                     | Size chart data                | CASCADE DELETE                     |
| `shop_themes`                    | Theme preferences              | CASCADE DELETE                     |
| `aie_*` tables                   | AI engine data                 | CASCADE DELETE (if store-specific) |
| `ad_library`                     | Ad creative library            | CASCADE DELETE                     |

### Customer-Level Data (End User Data)

**Trigger**: `customers/redact` and `customers/data_request`

**Current State**: Thunder Text does NOT store end customer data.

- We only store merchant (shop owner) data
- Product descriptions are about products, not customers
- No customer PII, purchase history, or behavioral data

**Implementation**: Return empty/no-op response for customer webhooks.

### System-Wide Data (Not Subject to GDPR Deletion)

Data not tied to specific merchants:

- `system_prompts` with `is_default = true`
- `themes` (global retail themes)
- `theme_keywords` (global theme mappings)
- `trend_signals` (market trend data)
- `trend_series` (trend analytics)
- `trend_refresh_log` (system logs)
- `aie_best_practices` (global AI training data)

---

## shop/redact Implementation Strategy

### Database Schema Analysis

Looking at foreign key relationships:

```sql
-- All tables with store_id foreign key
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'store_id';
```

Expected tables with CASCADE DELETE:

- business_profiles
- business_profile_responses
- content_samples
- generated_content
- product_descriptions
- generation_jobs
- usage_metrics
- integrations
- etc.

### Deletion Sequence

```sql
BEGIN;

-- 1. Delete all dependent data (CASCADE should handle this)
DELETE FROM shops WHERE shop_domain = :shop_domain;

-- 2. Verify cascade worked
-- Check related tables are empty for this store_id

-- 3. Log the deletion for audit
INSERT INTO gdpr_deletion_log (shop_domain, deleted_at, webhook_payload)
VALUES (:shop_domain, NOW(), :payload);

COMMIT;
```

### Edge Cases to Handle

1. **Concurrent Deletion**: Shop being used while deletion occurs
   - Use transaction locks
   - Mark shop as `is_active = false` first

2. **Referenced Data**: Foreign key constraints
   - Ensure all FKs have ON DELETE CASCADE
   - Review migrations for missing CASCADE rules

3. **Async Jobs**: Background generation jobs running
   - Check generation_jobs table
   - Cancel/mark as obsolete

4. **External Services**: Data outside Supabase
   - OpenAI API: No persistent storage needed
   - Render: Log rotation handles this
   - No action required

---

## customers/redact Implementation

**Current Assessment**: We don't store customer data.

### What is Customer Data?

According to Shopify:

- Customer name, email, address
- Purchase history
- Behavioral data (browsing, clicks)
- Customer-uploaded content

### What Thunder Text Stores:

- ❌ No customer names/emails
- ❌ No customer addresses
- ❌ No purchase history
- ❌ No customer behavior tracking
- ✅ Only: Product descriptions (about products, not customers)

### Implementation:

Return success immediately - no data to delete.

```typescript
// Acknowledge webhook, no action needed
return { success: true, message: "No customer data stored" };
```

---

## customers/data_request Implementation

**Current Assessment**: We don't store customer data.

### Implementation:

Return empty dataset.

```typescript
// Return empty export
return {
  success: true,
  customer_data: {
    customer_id: payload.customer.id,
    shop_domain: payload.shop_domain,
    data: {},
    message: "Thunder Text does not store customer-specific data",
  },
};
```

---

## Audit Trail

### GDPR Deletion Log Table

```sql
CREATE TABLE IF NOT EXISTS gdpr_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL, -- 'shop/redact', 'customers/redact'
  shop_domain TEXT NOT NULL,
  customer_id BIGINT, -- NULL for shop deletions
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  webhook_payload JSONB,
  deletion_status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gdpr_log_shop ON gdpr_deletion_log(shop_domain);
CREATE INDEX idx_gdpr_log_type ON gdpr_deletion_log(webhook_type);
```

### Retention Policy

- Keep GDPR logs for 2 years (compliance proof)
- After 2 years, archive or delete
- Separate table to avoid affecting performance

---

## Security Considerations

### Webhook Verification

All GDPR webhooks MUST verify Shopify signature:

```typescript
import crypto from "crypto";

function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string,
): boolean {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return hash === hmacHeader;
}
```

### Rate Limiting

- GDPR webhooks should not be rate-limited
- But validate to prevent abuse
- Max 1 deletion per shop per hour?

### Idempotency

- Multiple deletions for same shop should be safe
- Check if shop exists before deleting
- Log all attempts (successful and failed)

---

## Testing Strategy

### Development Testing

1. **Create test shop data**

   ```sql
   INSERT INTO shops (shop_domain, access_token)
   VALUES ('test-deletion.myshopify.com', 'test-token');
   ```

2. **Simulate shop/redact webhook**

   ```bash
   curl -X POST http://localhost:3050/api/webhooks/gdpr/shop-redact \
     -H "Content-Type: application/json" \
     -H "X-Shopify-Hmac-SHA256: <signature>" \
     -d '{"shop_domain": "test-deletion.myshopify.com", "shop_id": 123}'
   ```

3. **Verify deletion**
   ```sql
   SELECT COUNT(*) FROM shops WHERE shop_domain = 'test-deletion.myshopify.com';
   -- Should return 0
   ```

### Production Validation

- Test on development store before going live
- Monitor GDPR webhook logs
- Set up alerts for failed deletions

---

## Compliance Checklist

- [ ] shop/redact webhook implemented
- [ ] customers/redact webhook implemented (no-op)
- [ ] customers/data_request webhook implemented (empty export)
- [ ] All webhooks verify Shopify HMAC signature
- [ ] CASCADE DELETE configured on all foreign keys
- [ ] GDPR deletion log table created
- [ ] Audit trail maintained for 2 years
- [ ] Webhooks registered in Shopify Partner Dashboard
- [ ] End-to-end deletion tested on development store
- [ ] Privacy policy updated to reflect data handling
- [ ] 48-hour deletion window documented (if applicable)

---

## Timeline for Deletion

According to GDPR:

- **Within 30 days** is standard
- Shopify recommends **as soon as possible**
- Thunder Text approach: **Immediate deletion** (no retention needed)

---

## Privacy Policy Update Required

Must document:

1. What data we collect (shop domain, access tokens, product descriptions)
2. How we use it (AI generation, brand voice)
3. How long we keep it (until merchant uninstalls)
4. GDPR rights (deletion, export)
5. How to exercise rights (uninstall app or email support)

---

## Next Steps

1. Implement shop/redact webhook endpoint
2. Implement customers/redact webhook endpoint (no-op)
3. Implement customers/data_request webhook endpoint (empty response)
4. Create GDPR deletion log table migration
5. Verify all foreign keys have CASCADE DELETE
6. Test webhooks end-to-end
7. Register webhooks in Shopify Partner Dashboard
8. Update privacy policy with GDPR language
