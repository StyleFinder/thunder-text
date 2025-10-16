# Facebook OAuth Debugging Session - 2025-10-16

## Critical Findings

### Issue 1: Wrong Supabase Database (ROOT CAUSE)
**Problem**: Supabase MCP was pointing to Zeus Dashboard project instead of Thunder Text
- **MCP was using**: `odsompikqjxektpiiysy.supabase.co` (Zeus)
- **Thunder Text uses**: `upkmmwvbspgeanotzknk.supabase.co` (Thunder Text)

**Fix Applied**: Changed `claude_desktop_config.json` to use `"supabase"` key pointing to Thunder Text
- File: `/Users/bigdaddy/.config/Claude/claude_desktop_config.json`
- Changed from: `supabase-shopify` → `supabase`
- **Requires Claude Desktop restart to take effect**

### Issue 2: Schema Cache Error
**Problem**: Database query failing with error code 42703
```
error: 'column integrations.facebook_page_id does not exist'
```

**Fix Applied**: Commit `20deb76` - Query `additional_metadata` instead of direct column
- Changed submit endpoint to read from `additional_metadata` JSON
- This matches how OAuth callback stores the page_id

### Issue 3: Wrong shop_id in OAuth State
**Problem**: OAuth state parameter contains outdated shop_id
- **Logs showed**: `38b6c917-c23d-4fa6-9fa3-165f7ca959d2`
- **Actual shop_id**: `5d4b264b-70ed-48c7-a17f-28be041427f2` (in Thunder Text DB)

**Solution**: User must initiate fresh OAuth connection to generate new state with correct shop_id

## Commits Made

1. **`2d2cbad`** - Changed `supabase` → `supabaseAdmin` in submit endpoint
   - Fixed 7 database queries to use service role client

2. **`5b1b5cd`** - Added comprehensive debug logging
   - Logs shop lookup, integration query, token decryption

3. **`20deb76`** - Fixed schema cache error
   - Query `additional_metadata` instead of `facebook_page_id` column

## Next Steps (After Claude Desktop Restart)

1. **Verify Supabase MCP Connection**
   ```sql
   SELECT id, shop_id, provider, is_active
   FROM integrations
   WHERE provider = 'facebook';
   ```

2. **Fresh OAuth Connection Required**
   - Hard refresh Facebook Ads page
   - Click "Connect Facebook Account"
   - Complete OAuth flow
   - This generates new state with correct shop_id

3. **Test Ad Submission**
   - Select product
   - Create ad draft
   - Submit to Facebook
   - Check debug logs in Render

## Key Files Modified

- `/Users/bigdaddy/prod_desc/thunder-text/src/app/api/facebook/ad-drafts/submit/route.ts`
- `/Users/bigdaddy/.config/Claude/claude_desktop_config.json`

## Environment Details

- **Thunder Text Supabase**: `https://upkmmwvbspgeanotzknk.supabase.co`
- **Render Service**: `srv-d3jgbii4d50c73f6biog`
- **Active Branch**: `feature/facebook-ads-integration`
- **Latest Commit**: `20deb76`
- **Shop Domain**: `zunosai-staging-test-store.myshopify.com`
- **Shop ID** (Thunder Text DB): `5d4b264b-70ed-48c7-a17f-28be041427f2`

## Debug Logs Location

Render logs show detailed debug output with `[SUBMIT DEBUG]` markers:
- Shop lookup results
- Integration query results (including errors)
- Token decryption status

Use Render MCP to view: `mcp__render__list_logs` with service `srv-d3jgbii4d50c73f6biog`
