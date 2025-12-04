# External Authentication Guide

## Overview

ThunderText now supports **dual authentication modes** for maximum flexibility:

1. **Embedded Mode**: Traditional Shopify App Bridge authentication (for iframe embedding)
2. **External Mode**: OAuth-based persistent authentication (for standalone external access)

This allows users to access ThunderText features both inside and outside the Shopify admin panel.

## How It Works

### Architecture

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │
         ├──► Embedded Access (Shopify Admin)
         │    └─► App Bridge Session Token (60s expiry)
         │
         └──► External Access (Direct URL)
              └─► OAuth Access Token (stored in database)
```

### Authentication Flow

#### Embedded Mode (Shopify Admin)

1. User accesses app through Shopify admin
2. App Bridge provides session token
3. Token included in API requests via `Authorization: Bearer <token>`
4. Token auto-refreshes every 60 seconds

#### External Mode (Standalone)

1. User completes OAuth during onboarding
2. Access token stored in `shops` table
3. Frontend calls `/api/auth/token?shop=<domain>` to retrieve token
4. Token included in API requests via `Authorization: Bearer <token>`
5. If 401 received, calls `/api/auth/refresh` to validate/refresh token

## Implementation Details

### Client-Side

**Updated `authenticatedFetch` function** ([api-client.ts:64](src/lib/shopify/api-client.ts#L64))

```typescript
// Automatically detects authentication mode
const response = await authenticatedFetch("/api/generate/create", {
  method: "POST",
  body: JSON.stringify(data),
});
// No need to pass shop - extracted from URL automatically
```

**How it works:**

1. Tries App Bridge session token first (embedded mode)
2. Falls back to OAuth token from `/api/auth/token` (external mode)
3. Automatically retries with refreshed token on 401 errors
4. Adds `X-Shop-Domain` header for backend validation

### Backend

**Token Retrieval** ([/api/auth/token](src/app/api/auth/token/route.ts))

- **GET** `/api/auth/token?shop=<domain>`
- Retrieves OAuth access token from database
- Returns token with expiry information
- Returns 401 if token expired or missing

**Token Refresh** ([/api/auth/refresh](src/app/api/auth/refresh/route.ts))

- **POST** `/api/auth/refresh?shop=<domain>`
- Validates existing OAuth token
- Updates timestamp in database
- Note: Shopify offline tokens don't expire, but endpoint supports future refresh logic

### Database Schema

The `shops` table stores persistent OAuth tokens:

```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY,
  shop_domain TEXT UNIQUE NOT NULL,
  access_token TEXT,              -- OAuth access token
  token_expires_at TIMESTAMPTZ,   -- Optional expiry tracking
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage Examples

### Accessing Create-PD Page Externally

**Current URL (requires embedded):**

```
https://app.shopify.com/admin/apps/thundertext/create-pd
```

**New external URL:**

```
https://thundertext-dev.ngrok.app/create-pd?shop=zunosai-staging-test-store.myshopify.com
```

The page will automatically:

1. Extract shop domain from URL
2. Fetch OAuth token from backend
3. Use token for all API requests
4. Handle token refresh if needed

### No Code Changes Required

Existing code using `authenticatedFetch` works in both modes:

```typescript
// This works in both embedded and external modes!
const response = await authenticatedFetch('/api/generate/create', {
  method: 'POST',
  body: JSON.stringify({ images, category, ... })
})
```

## Security Considerations

### Token Storage

- OAuth tokens stored server-side in Supabase (encrypted at rest)
- Never exposed to client except via secure API endpoints
- Shop domain validation on every token request

### Access Control

- Tokens scoped per shop domain
- `is_active` flag allows instant token revocation
- Backend validates `X-Shop-Domain` header matches token

### Token Lifecycle

- Shopify offline tokens don't expire (persistent access)
- Can implement expiry tracking with `token_expires_at` if needed
- Refresh endpoint ready for future online token support

## Migration Path

### Phase 1: Dual Mode Support ✅ (Current)

- Both embedded and external access work
- Automatic mode detection
- No breaking changes to existing code

### Phase 2: External-First (Future)

- Primary access through external URLs
- Embedded mode as fallback
- Enhanced token management

### Phase 3: Full External (Future)

- Remove App Bridge dependency
- Pure OAuth flow
- Enhanced security features

## Troubleshooting

### "Shop parameter is required" Error

**Cause**: Missing `shop` query parameter in URL
**Solution**: Add `?shop=your-store.myshopify.com` to URL

### "Shop not found or not authenticated" Error

**Cause**: Shop hasn't completed OAuth or token missing
**Solution**: Complete app installation/onboarding flow

### "No access token available" Error

**Cause**: OAuth token not stored in database
**Solution**: Reinstall app or complete OAuth flow

### 401 Errors Despite Valid Shop

**Cause**: Token refresh failed or shop deactivated
**Solution**: Check `is_active` status in database, verify OAuth flow

## API Reference

### GET `/api/auth/token`

Retrieves OAuth access token for a shop

**Query Parameters:**

- `shop` (required): Shop domain (e.g., `store.myshopify.com`)

**Response:**

```json
{
  "success": true,
  "token": "shpat_...",
  "expiresAt": null
}
```

### POST `/api/auth/refresh`

Validates and refreshes OAuth token

**Query Parameters:**

- `shop` (required): Shop domain

**Response:**

```json
{
  "success": true,
  "token": "shpat_...",
  "message": "Token validated successfully"
}
```

## Best Practices

1. **Always include shop parameter**: Add `?shop=<domain>` to external URLs
2. **Let authenticatedFetch handle auth**: Don't manually manage tokens
3. **Handle errors gracefully**: Show user-friendly messages for auth failures
4. **Test both modes**: Verify embedded and external access work
5. **Monitor token usage**: Track API calls and refresh patterns

## Future Enhancements

- [ ] Token expiry notifications
- [ ] Automatic token rotation
- [ ] Rate limiting per shop
- [ ] Enhanced security logging
- [ ] Token usage analytics
