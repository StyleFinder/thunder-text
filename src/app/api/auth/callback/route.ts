/**
 * Shopify OAuth Callback Handler (alternate URL)
 *
 * This route handles Shopify OAuth callbacks at /api/auth/callback.
 * It re-exports the handler from /api/auth/shopify/callback to ensure
 * both configured redirect URLs work correctly.
 *
 * Background:
 * - Shopify Partner Dashboard may have multiple redirect URLs configured
 * - The hosted OAuth flow (admin.shopify.com/oauth/install) uses the first URL by default
 * - This route ensures /api/auth/callback works alongside /api/auth/shopify/callback
 */
export { GET } from "@/app/api/auth/shopify/callback/route";
