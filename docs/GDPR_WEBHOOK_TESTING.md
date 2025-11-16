# GDPR Webhook Testing Guide

## Overview

This guide explains how to test the three mandatory GDPR webhooks required by Shopify.

---

## Prerequisites

1. **Environment Variables Required**

   ```bash
   SHOPIFY_API_SECRET=your_secret_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   ```

2. **Local Server Running**

   ```bash
   npm run dev
   # Server should be running on http://localhost:3050
   ```

3. **Test Data in Database**
   ```sql
   -- Create a test shop
   INSERT INTO shops (shop_domain, access_token, scope)
   VALUES (
     'test-gdpr-deletion.myshopify.com',
     'test-token-12345',
     'read_products,write_products'
   )
   RETURNING id, shop_domain;
   ```

---

## Webhook Endpoints

| Webhook                | URL                                         | Purpose                      |
| ---------------------- | ------------------------------------------- | ---------------------------- |
| shop/redact            | `/api/webhooks/gdpr/shop-redact`            | Delete all shop data         |
| customers/redact       | `/api/webhooks/gdpr/customers-redact`       | Delete customer data (no-op) |
| customers/data_request | `/api/webhooks/gdpr/customers-data-request` | Export customer data (empty) |

---

## Testing Approach

### Method 1: Using cURL (Manual Testing)

#### 1. Generate HMAC Signature

```bash
# Helper script to generate HMAC
node scripts/generate-webhook-hmac.js
```

Or manually:

```javascript
const crypto = require("crypto");

const payload = JSON.stringify({
  shop_domain: "test-gdpr-deletion.myshopify.com",
  shop_id: 123456789,
});

const secret = process.env.SHOPIFY_API_SECRET;
const hmac = crypto
  .createHmac("sha256", secret)
  .update(payload, "utf8")
  .digest("base64");

console.log("HMAC:", hmac);
```

#### 2. Test shop/redact

```bash
curl -X POST http://localhost:3050/api/webhooks/gdpr/shop-redact \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-SHA256: YOUR_GENERATED_HMAC_HERE" \
  -d '{
    "shop_id": 123456789,
    "shop_domain": "test-gdpr-deletion.myshopify.com"
  }'
```

Expected Response:

```json
{
  "success": true,
  "message": "Shop data deleted successfully",
  "shop_domain": "test-gdpr-deletion.myshopify.com",
  "records_deleted": 1,
  "status": "completed"
}
```

#### 3. Verify Deletion

```sql
-- Should return 0 rows
SELECT * FROM shops
WHERE shop_domain = 'test-gdpr-deletion.myshopify.com';

-- Should show the deletion log
SELECT * FROM gdpr_deletion_log
WHERE shop_domain = 'test-gdpr-deletion.myshopify.com';
```

#### 4. Test customers/redact

```bash
curl -X POST http://localhost:3050/api/webhooks/gdpr/customers-redact \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-SHA256: YOUR_GENERATED_HMAC_HERE" \
  -d '{
    "shop_id": 123456789,
    "shop_domain": "test-shop.myshopify.com",
    "customer": {
      "id": 987654321,
      "email": "customer@example.com"
    },
    "orders_to_redact": []
  }'
```

Expected Response:

```json
{
  "success": true,
  "message": "Thunder Text does not store customer-specific data",
  "customer_id": 987654321,
  "shop_domain": "test-shop.myshopify.com",
  "records_deleted": 0
}
```

#### 5. Test customers/data_request

```bash
curl -X POST http://localhost:3050/api/webhooks/gdpr/customers-data-request \
  -H "Content-Type": application/json" \
  -H "X-Shopify-Hmac-SHA256: YOUR_GENERATED_HMAC_HERE" \
  -d '{
    "shop_id": 123456789,
    "shop_domain": "test-shop.myshopify.com",
    "customer": {
      "id": 987654321,
      "email": "customer@example.com"
    },
    "orders_requested": []
  }'
```

Expected Response:

```json
{
  "success": true,
  "message": "Customer data export completed",
  "customer_data": {
    "customer_id": 987654321,
    "explanation": "Thunder Text does not store customer-specific data...",
    "data_summary": {
      "personal_information": {},
      "purchase_history": {},
      "behavioral_data": {}
    }
  }
}
```

---

### Method 2: Using Postman/Insomnia

1. **Import Collection**
   - Create new request for each webhook
   - Set method to POST
   - Set URL to webhook endpoint
   - Add headers (Content-Type, X-Shopify-Hmac-SHA256)
   - Add JSON body

2. **Pre-request Script** (Postman)

   ```javascript
   const crypto = require("crypto-js");
   const secret = pm.environment.get("SHOPIFY_API_SECRET");
   const body = pm.request.body.raw;

   const hmac = crypto.HmacSHA256(body, secret).toString(crypto.enc.Base64);
   pm.request.headers.add({
     key: "X-Shopify-Hmac-SHA256",
     value: hmac,
   });
   ```

---

### Method 3: Automated Testing (Recommended)

Create Jest tests:

```typescript
// __tests__/webhooks/gdpr/shop-redact.test.ts

import { POST } from "@/app/api/webhooks/gdpr/shop-redact/route";
import crypto from "crypto";

describe("GDPR shop/redact webhook", () => {
  it("should delete shop data with valid signature", async () => {
    const payload = {
      shop_id: 123,
      shop_domain: "test.myshopify.com",
    };

    const body = JSON.stringify(payload);
    const hmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
      .update(body)
      .digest("base64");

    const request = new Request(
      "http://localhost:3050/api/webhooks/gdpr/shop-redact",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-SHA256": hmac,
        },
        body,
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should reject invalid signature", async () => {
    const request = new Request(
      "http://localhost:3050/api/webhooks/gdpr/shop-redact",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-SHA256": "invalid-signature",
        },
        body: JSON.stringify({ shop_domain: "test.myshopify.com" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
```

---

## Production Testing (Shopify Development Store)

### 1. Register Webhooks in Partner Dashboard

Go to: Shopify Partner Dashboard → Apps → Thunder Text → API Webhooks

Add webhooks:

```
shop/redact: https://thunder-text.onrender.com/api/webhooks/gdpr/shop-redact
customers/redact: https://thunder-text.onrender.com/api/webhooks/gdpr/customers-redact
customers/data_request: https://thunder-text.onrender.com/api/webhooks/gdpr/customers-data-request
```

### 2. Test on Development Store

**shop/redact**: Uninstall the app

- Install Thunder Text on development store
- Uninstall the app
- Shopify will send shop/redact webhook
- Check logs: `RENDER_API_KEY=xxx npx -y @render/mcp-server logs --service-id=srv-xxx`
- Verify database: shop data should be deleted

**customers/redact**: Cannot test directly (requires customer GDPR request)

- Test manually with cURL to production endpoint
- Verify response format

**customers/data_request**: Cannot test directly

- Test manually with cURL to production endpoint
- Verify export format

---

## Validation Checklist

### Before Deployment

- [ ] All three webhooks implemented
- [ ] HMAC signature verification working
- [ ] GDPR deletion log table created
- [ ] CASCADE DELETE configured on all foreign keys
- [ ] Environment variables set (SHOPIFY_API_SECRET, SUPABASE_SERVICE_KEY)
- [ ] Local tests passing
- [ ] Error handling tested (invalid signature, missing data)

### After Deployment

- [ ] Webhooks registered in Shopify Partner Dashboard
- [ ] Health check endpoints working (GET requests)
- [ ] Test shop/redact on development store
- [ ] Monitor logs for any errors
- [ ] Verify GDPR deletion log entries

---

## Troubleshooting

### Issue: "Invalid webhook signature"

**Cause**: HMAC mismatch
**Fix**:

- Verify SHOPIFY_API_SECRET is correct
- Ensure raw body is used for HMAC (not parsed JSON)
- Check header name is exactly "X-Shopify-Hmac-SHA256"

### Issue: "Shop not found"

**Cause**: Shop doesn't exist in database
**Fix**: This is expected for already-deleted shops. Webhook logs as "no_data" status.

### Issue: "Failed to delete shop"

**Cause**: Database constraint violation or connection issue
**Fix**:

- Check Supabase connection
- Verify CASCADE DELETE is configured
- Check for foreign key references

### Issue: "Failed to log deletion"

**Cause**: GDPR log table doesn't exist or permissions issue
**Fix**:

- Run migration: `20251116_create_gdpr_deletion_log.sql`
- Verify service role has INSERT permission

---

## Monitoring in Production

### Metrics to Track

- Webhook success rate
- Average deletion time
- Failed deletions (investigate immediately)
- GDPR log entries per day

### Alerts to Set Up

- Failed shop/redact webhooks (critical)
- Repeated failures for same shop
- Webhook response time >5s

### Audit Requirements

- Keep GDPR logs for 2 years minimum
- Review logs quarterly for compliance
- Document any failed deletions and resolution

---

## Next Steps After Testing

1. **Deploy to Production**

   ```bash
   git add .
   git commit -m "Add GDPR webhook endpoints"
   git push
   ```

2. **Register Webhooks in Shopify Partner Dashboard**
   - Navigate to Apps → Thunder Text → API Webhooks
   - Add all three webhook URLs
   - Save changes

3. **Test on Development Store**
   - Install app
   - Uninstall app
   - Verify deletion in database

4. **Document in Privacy Policy**
   - Update privacy policy with data deletion process
   - Mention 48-hour deletion window (Shopify standard)
   - List customer rights under GDPR

5. **Submit for Shopify Review**
   - Webhooks are critical requirement
   - Shopify will test these during review
   - Be ready to demonstrate deletion works
