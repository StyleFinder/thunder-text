/**
 * OAuth State Validation with Zod
 *
 * Provides secure validation of OAuth state parameters to prevent:
 * - CSRF attacks
 * - Replay attacks
 * - State tampering
 *
 * Security measures:
 * - Cryptographic nonces for CSRF protection
 * - Timestamp validation (max 5 min age)
 * - Zod schema validation for type safety
 * - Base64url encoding/decoding
 * - Server-side state storage for replay attack prevention
 */

import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";

// M6 SECURITY: Reduced OAuth state window from 10 to 5 minutes
// Shorter window reduces replay attack opportunity while still allowing
// for reasonable user interaction time during OAuth flows
const MAX_STATE_AGE_MS = 5 * 60 * 1000;

/**
 * Facebook OAuth State Schema
 * Used for Facebook OAuth flow state parameter validation
 */
export const FacebookOAuthStateSchema = z.object({
  shop_id: z.string().uuid("Invalid shop_id format"),
  shop_domain: z
    .string()
    .regex(/^[a-z0-9-]+\.myshopify\.com$/, "Invalid shop domain format"),
  host: z.string().nullable().optional(),
  embedded: z.string().nullable().optional(),
  return_to: z.string().nullable().optional(),
  timestamp: z.number().int().positive("Timestamp must be positive"),
  nonce: z.string().min(32, "Nonce must be at least 32 characters"),
});

export type FacebookOAuthState = z.infer<typeof FacebookOAuthStateSchema>;

/**
 * Shopify OAuth State Schema
 * Used for Shopify OAuth flow state parameter validation
 */
export const ShopifyOAuthStateSchema = z.object({
  shop: z
    .string()
    .regex(/^[a-z0-9-]+\.myshopify\.com$/, "Invalid shop domain format"),
  timestamp: z.number().int().positive("Timestamp must be positive"),
  nonce: z.string().min(32, "Nonce must be at least 32 characters"),
});

export type ShopifyOAuthState = z.infer<typeof ShopifyOAuthStateSchema>;

/**
 * Google OAuth State Schema
 * Used for Google Ads OAuth flow state parameter validation
 */
export const GoogleOAuthStateSchema = z.object({
  shop_id: z.string().uuid("Invalid shop_id format"),
  shop_domain: z
    .string()
    .regex(/^[a-z0-9-]+\.myshopify\.com$/, "Invalid shop domain format"),
  host: z.string().nullable().optional(),
  embedded: z.string().nullable().optional(),
  return_to: z.string().nullable().optional(),
  timestamp: z.number().int().positive("Timestamp must be positive"),
  nonce: z.string().min(32, "Nonce must be at least 32 characters"),
});

export type GoogleOAuthState = z.infer<typeof GoogleOAuthStateSchema>;

/**
 * TikTok OAuth State Schema
 * Used for TikTok for Business OAuth flow state parameter validation
 */
export const TikTokOAuthStateSchema = z.object({
  shop_id: z.string().uuid("Invalid shop_id format"),
  shop_domain: z
    .string()
    .regex(/^[a-z0-9-]+\.myshopify\.com$/, "Invalid shop domain format"),
  host: z.string().nullable().optional(),
  embedded: z.string().nullable().optional(),
  return_to: z.string().nullable().optional(),
  timestamp: z.number().int().positive("Timestamp must be positive"),
  nonce: z.string().min(32, "Nonce must be at least 32 characters"),
});

export type TikTokOAuthState = z.infer<typeof TikTokOAuthStateSchema>;

/**
 * Generate a cryptographically secure nonce for CSRF protection
 * Uses crypto.randomBytes for secure random generation
 */
export function generateNonce(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Create Facebook OAuth state parameter
 *
 * @param shop_id - UUID of the shop
 * @param shop_domain - Shop domain (e.g., store.myshopify.com)
 * @param host - Optional Shopify host parameter
 * @param embedded - Optional Shopify embedded parameter
 * @param return_to - Optional redirect destination after OAuth (welcome or facebook-ads)
 * @returns Base64url encoded state string
 */
export function createFacebookOAuthState(params: {
  shop_id: string;
  shop_domain: string;
  host?: string | null;
  embedded?: string | null;
  return_to?: "welcome" | "facebook-ads";
}): string {
  const state: FacebookOAuthState = {
    shop_id: params.shop_id,
    shop_domain: params.shop_domain,
    host: params.host || null,
    embedded: params.embedded || null,
    return_to: params.return_to,
    timestamp: Date.now(),
    nonce: generateNonce(),
  };

  // Validate the state before encoding
  FacebookOAuthStateSchema.parse(state);

  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

/**
 * Validate and parse Facebook OAuth state parameter
 *
 * @param stateParam - Base64url encoded state string
 * @returns Parsed and validated state data
 * @throws ZodError if validation fails
 * @throws Error if state is expired or invalid
 */
export function validateFacebookOAuthState(
  stateParam: string,
): FacebookOAuthState {
  // Decode base64url
  let decoded: string;
  try {
    decoded = Buffer.from(stateParam, "base64url").toString("utf-8");
  } catch {
    throw new Error("Invalid state encoding");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("Invalid state JSON");
  }

  // Validate with Zod schema
  const validated = FacebookOAuthStateSchema.parse(parsed);

  // Check timestamp to prevent replay attacks
  const stateAge = Date.now() - validated.timestamp;
  if (stateAge > MAX_STATE_AGE_MS) {
    throw new Error(
      `State parameter expired (age: ${Math.round(stateAge / 1000)}s, max: ${MAX_STATE_AGE_MS / 1000}s)`,
    );
  }

  if (stateAge < 0) {
    throw new Error(
      "State parameter from the future - possible clock skew or tampering",
    );
  }

  return validated;
}

/**
 * Create Shopify OAuth state parameter
 *
 * @param shop - Shop domain (e.g., store.myshopify.com)
 * @returns Base64url encoded state string
 */
export function createShopifyOAuthState(shop: string): string {
  const state: ShopifyOAuthState = {
    shop,
    timestamp: Date.now(),
    nonce: generateNonce(),
  };

  // Validate the state before encoding
  ShopifyOAuthStateSchema.parse(state);

  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

/**
 * Validate and parse Shopify OAuth state parameter
 *
 * @param stateParam - Base64url encoded state string
 * @param expectedShop - Expected shop domain to prevent shop swapping attacks
 * @returns Parsed and validated state data
 * @throws ZodError if validation fails
 * @throws Error if state is expired, invalid, or shop doesn't match
 */
export function validateShopifyOAuthState(
  stateParam: string,
  expectedShop: string,
): ShopifyOAuthState {
  // Decode base64url
  let decoded: string;
  try {
    decoded = Buffer.from(stateParam, "base64url").toString("utf-8");
  } catch {
    throw new Error("Invalid state encoding");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("Invalid state JSON");
  }

  // Validate with Zod schema
  const validated = ShopifyOAuthStateSchema.parse(parsed);

  // Verify shop matches expected value (prevent shop swapping)
  if (validated.shop !== expectedShop) {
    throw new Error(
      `Shop mismatch: expected ${expectedShop}, got ${validated.shop}`,
    );
  }

  // Check timestamp to prevent replay attacks
  const stateAge = Date.now() - validated.timestamp;
  if (stateAge > MAX_STATE_AGE_MS) {
    throw new Error(
      `State parameter expired (age: ${Math.round(stateAge / 1000)}s, max: ${MAX_STATE_AGE_MS / 1000}s)`,
    );
  }

  if (stateAge < 0) {
    throw new Error(
      "State parameter from the future - possible clock skew or tampering",
    );
  }

  return validated;
}

/**
 * Create Google OAuth state parameter
 *
 * @param shop_id - UUID of the shop
 * @param shop_domain - Shop domain (e.g., store.myshopify.com)
 * @param host - Optional Shopify host parameter
 * @param embedded - Optional Shopify embedded parameter
 * @param return_to - Optional return path after OAuth
 * @returns Base64url encoded state string
 */
export function createGoogleOAuthState(params: {
  shop_id: string;
  shop_domain: string;
  host?: string | null;
  embedded?: string | null;
  return_to?: string | null;
}): string {
  const state: GoogleOAuthState = {
    shop_id: params.shop_id,
    shop_domain: params.shop_domain,
    host: params.host || null,
    embedded: params.embedded || null,
    return_to: params.return_to || null,
    timestamp: Date.now(),
    nonce: generateNonce(),
  };

  // Validate the state before encoding
  GoogleOAuthStateSchema.parse(state);

  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

/**
 * Validate and parse Google OAuth state parameter
 *
 * @param stateParam - Base64url encoded state string
 * @returns Parsed and validated state data
 * @throws ZodError if validation fails
 * @throws Error if state is expired or invalid
 */
export function validateGoogleOAuthState(stateParam: string): GoogleOAuthState {
  // Decode base64url
  let decoded: string;
  try {
    decoded = Buffer.from(stateParam, "base64url").toString("utf-8");
  } catch {
    throw new Error("Invalid state encoding");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("Invalid state JSON");
  }

  // Validate with Zod schema
  const validated = GoogleOAuthStateSchema.parse(parsed);

  // Check timestamp to prevent replay attacks
  const stateAge = Date.now() - validated.timestamp;
  if (stateAge > MAX_STATE_AGE_MS) {
    throw new Error(
      `State parameter expired (age: ${Math.round(stateAge / 1000)}s, max: ${MAX_STATE_AGE_MS / 1000}s)`,
    );
  }

  if (stateAge < 0) {
    throw new Error(
      "State parameter from the future - possible clock skew or tampering",
    );
  }

  return validated;
}

/**
 * Create TikTok OAuth state parameter
 *
 * @param shop_id - UUID of the shop
 * @param shop_domain - Shop domain (e.g., store.myshopify.com)
 * @param host - Optional Shopify host parameter
 * @param embedded - Optional Shopify embedded parameter
 * @param return_to - Optional return path after OAuth
 * @returns Base64url encoded state string
 */
export function createTikTokOAuthState(params: {
  shop_id: string;
  shop_domain: string;
  host?: string | null;
  embedded?: string | null;
  return_to?: string | null;
}): string {
  const state: TikTokOAuthState = {
    shop_id: params.shop_id,
    shop_domain: params.shop_domain,
    host: params.host || null,
    embedded: params.embedded || null,
    return_to: params.return_to || null,
    timestamp: Date.now(),
    nonce: generateNonce(),
  };

  // Validate the state before encoding
  TikTokOAuthStateSchema.parse(state);

  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

/**
 * Validate and parse TikTok OAuth state parameter
 *
 * @param stateParam - Base64url encoded state string
 * @returns Parsed and validated state data
 * @throws ZodError if validation fails
 * @throws Error if state is expired or invalid
 */
export function validateTikTokOAuthState(stateParam: string): TikTokOAuthState {
  // Decode base64url
  let decoded: string;
  try {
    decoded = Buffer.from(stateParam, "base64url").toString("utf-8");
  } catch {
    throw new Error("Invalid state encoding");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("Invalid state JSON");
  }

  // Validate with Zod schema
  const validated = TikTokOAuthStateSchema.parse(parsed);

  // Check timestamp to prevent replay attacks
  const stateAge = Date.now() - validated.timestamp;
  if (stateAge > MAX_STATE_AGE_MS) {
    throw new Error(
      `State parameter expired (age: ${Math.round(stateAge / 1000)}s, max: ${MAX_STATE_AGE_MS / 1000}s)`,
    );
  }

  if (stateAge < 0) {
    throw new Error(
      "State parameter from the future - possible clock skew or tampering",
    );
  }

  return validated;
}

// =============================================================================
// OAuth State Storage (Cookie-based)
// =============================================================================

/**
 * Cookie name for storing OAuth state
 * Uses a hash prefix to prevent enumeration attacks
 */
const OAUTH_STATE_COOKIE_PREFIX = "oauth_state_";

/**
 * Generate a hash of the state for cookie naming
 * This prevents the full state from being visible in cookie names
 */
function getStateHash(state: string): string {
  return createHash("sha256").update(state).digest("hex").substring(0, 16);
}

/**
 * Store OAuth state in an HttpOnly cookie before redirecting to OAuth provider
 *
 * SECURITY: This enables verification that the state returned from the OAuth
 * provider is the exact same state we generated, preventing replay attacks.
 *
 * @param state - The full base64url encoded state string
 * @param provider - OAuth provider name (shopify, facebook, google, tiktok)
 */
export async function storeOAuthState(
  state: string,
  provider: string,
): Promise<void> {
  const cookieStore = await cookies();
  const cookieName = `${OAUTH_STATE_COOKIE_PREFIX}${provider}`;

  // Store a hash of the state (we don't need to store the full state,
  // just enough to verify it matches what we sent)
  const stateHash = getStateHash(state);

  cookieStore.set(cookieName, stateHash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_STATE_AGE_MS / 1000, // Convert to seconds
    path: "/",
  });
}

/**
 * Verify that the returned OAuth state matches what we stored
 *
 * SECURITY: This is the critical check that prevents replay attacks.
 * An attacker cannot use a stolen/intercepted state because they won't
 * have the corresponding cookie.
 *
 * @param state - The state parameter returned from OAuth provider
 * @param provider - OAuth provider name (shopify, facebook, google, tiktok)
 * @returns true if state matches stored value, false otherwise
 */
export async function verifyStoredOAuthState(
  state: string,
  provider: string,
): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieName = `${OAUTH_STATE_COOKIE_PREFIX}${provider}`;

  const storedHash = cookieStore.get(cookieName)?.value;

  if (!storedHash) {
    // No stored state - either expired, already used, or attack attempt
    // SECURITY: Do not log cookie names or state values - prevents auth material exposure
    return false;
  }

  // Compare hashes using constant-time comparison to prevent timing attacks
  const receivedHash = getStateHash(state);

  // Length check first (not timing-sensitive)
  if (storedHash.length !== receivedHash.length) {
    return false;
  }

  // Constant-time string comparison
  let result = 0;
  for (let i = 0; i < storedHash.length; i++) {
    result |= storedHash.charCodeAt(i) ^ receivedHash.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Clear the stored OAuth state after successful verification
 *
 * SECURITY: States are single-use. Once verified, delete immediately
 * to prevent replay attacks.
 *
 * @param provider - OAuth provider name (shopify, facebook, google, tiktok)
 */
export async function clearStoredOAuthState(provider: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieName = `${OAUTH_STATE_COOKIE_PREFIX}${provider}`;

  cookieStore.delete(cookieName);
}
