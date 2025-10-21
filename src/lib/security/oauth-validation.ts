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
 * - Timestamp validation (max 10 min age)
 * - Zod schema validation for type safety
 * - Base64url encoding/decoding
 */

import { z } from 'zod'
import { randomBytes } from 'crypto'

// Maximum age of state parameter (10 minutes)
const MAX_STATE_AGE_MS = 10 * 60 * 1000

/**
 * Facebook OAuth State Schema
 * Used for Facebook OAuth flow state parameter validation
 */
export const FacebookOAuthStateSchema = z.object({
  shop_id: z.string().uuid('Invalid shop_id format'),
  shop_domain: z.string().regex(
    /^[a-z0-9-]+\.myshopify\.com$/,
    'Invalid shop domain format'
  ),
  host: z.string().nullable().optional(),
  embedded: z.string().nullable().optional(),
  timestamp: z.number().int().positive('Timestamp must be positive'),
  nonce: z.string().min(32, 'Nonce must be at least 32 characters')
})

export type FacebookOAuthState = z.infer<typeof FacebookOAuthStateSchema>

/**
 * Shopify OAuth State Schema
 * Used for Shopify OAuth flow state parameter validation
 */
export const ShopifyOAuthStateSchema = z.object({
  shop: z.string().regex(
    /^[a-z0-9-]+\.myshopify\.com$/,
    'Invalid shop domain format'
  ),
  timestamp: z.number().int().positive('Timestamp must be positive'),
  nonce: z.string().min(32, 'Nonce must be at least 32 characters')
})

export type ShopifyOAuthState = z.infer<typeof ShopifyOAuthStateSchema>

/**
 * Generate a cryptographically secure nonce for CSRF protection
 * Uses crypto.randomBytes for secure random generation
 */
export function generateNonce(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Create Facebook OAuth state parameter
 *
 * @param shop_id - UUID of the shop
 * @param shop_domain - Shop domain (e.g., store.myshopify.com)
 * @param host - Optional Shopify host parameter
 * @param embedded - Optional Shopify embedded parameter
 * @returns Base64url encoded state string
 */
export function createFacebookOAuthState(params: {
  shop_id: string
  shop_domain: string
  host?: string | null
  embedded?: string | null
}): string {
  const state: FacebookOAuthState = {
    shop_id: params.shop_id,
    shop_domain: params.shop_domain,
    host: params.host || null,
    embedded: params.embedded || null,
    timestamp: Date.now(),
    nonce: generateNonce()
  }

  // Validate the state before encoding
  FacebookOAuthStateSchema.parse(state)

  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

/**
 * Validate and parse Facebook OAuth state parameter
 *
 * @param stateParam - Base64url encoded state string
 * @returns Parsed and validated state data
 * @throws ZodError if validation fails
 * @throws Error if state is expired or invalid
 */
export function validateFacebookOAuthState(stateParam: string): FacebookOAuthState {
  // Decode base64url
  let decoded: string
  try {
    decoded = Buffer.from(stateParam, 'base64url').toString('utf-8')
  } catch (error) {
    throw new Error('Invalid state encoding')
  }

  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(decoded)
  } catch (error) {
    throw new Error('Invalid state JSON')
  }

  // Validate with Zod schema
  const validated = FacebookOAuthStateSchema.parse(parsed)

  // Check timestamp to prevent replay attacks
  const stateAge = Date.now() - validated.timestamp
  if (stateAge > MAX_STATE_AGE_MS) {
    throw new Error(`State parameter expired (age: ${Math.round(stateAge / 1000)}s, max: ${MAX_STATE_AGE_MS / 1000}s)`)
  }

  if (stateAge < 0) {
    throw new Error('State parameter from the future - possible clock skew or tampering')
  }

  return validated
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
    nonce: generateNonce()
  }

  // Validate the state before encoding
  ShopifyOAuthStateSchema.parse(state)

  return Buffer.from(JSON.stringify(state)).toString('base64url')
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
  expectedShop: string
): ShopifyOAuthState {
  // Decode base64url
  let decoded: string
  try {
    decoded = Buffer.from(stateParam, 'base64url').toString('utf-8')
  } catch (error) {
    throw new Error('Invalid state encoding')
  }

  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(decoded)
  } catch (error) {
    throw new Error('Invalid state JSON')
  }

  // Validate with Zod schema
  const validated = ShopifyOAuthStateSchema.parse(parsed)

  // Verify shop matches expected value (prevent shop swapping)
  if (validated.shop !== expectedShop) {
    throw new Error(`Shop mismatch: expected ${expectedShop}, got ${validated.shop}`)
  }

  // Check timestamp to prevent replay attacks
  const stateAge = Date.now() - validated.timestamp
  if (stateAge > MAX_STATE_AGE_MS) {
    throw new Error(`State parameter expired (age: ${Math.round(stateAge / 1000)}s, max: ${MAX_STATE_AGE_MS / 1000}s)`)
  }

  if (stateAge < 0) {
    throw new Error('State parameter from the future - possible clock skew or tampering')
  }

  return validated
}
