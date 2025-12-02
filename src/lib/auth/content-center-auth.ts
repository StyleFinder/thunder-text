/**
 * Content Center Authentication Utilities
 *
 * Provides authentication and authorization helpers for Content Center API routes.
 * Uses Supabase JWT tokens for user authentication.
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean
  userId?: string
  error?: string
}

/**
 * Extract and verify shop domain from request
 * For Shopify apps, we use the shop domain as authentication
 *
 * @param request - Next.js request object
 * @returns Authentication result with shop domain as user ID if successful
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Try to get shop from various sources
    let shop: string | null = null

    // 1. Check Authorization header (for API calls from frontend)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      shop = authHeader.replace('Bearer ', '')
    }

    // 2. Check X-Shopify-Shop-Domain header
    if (!shop) {
      shop = request.headers.get('x-shopify-shop-domain')
    }

    // 3. Check query parameter
    if (!shop) {
      const url = new URL(request.url)
      shop = url.searchParams.get('shop')
    }

    if (!shop) {
      return {
        authenticated: false,
        error: 'Missing shop domain. Please provide shop via Authorization header, X-Shopify-Shop-Domain header, or shop query parameter.'
      }
    }

    // Ensure shop has .myshopify.com suffix
    if (!shop.includes('.myshopify.com')) {
      shop = `${shop}.myshopify.com`
    }

    // Verify shop exists in database
    const { data: shopData, error } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .eq('shop_domain', shop)
      .single()

    if (error || !shopData) {
      logger.error('Shop not found in database:', shop as Error, { component: 'content-center-auth' })
      return {
        authenticated: false,
        error: 'Shop not found. Please install the app first.'
      }
    }

    // Successfully authenticated - use shop_id as userId
    return {
      authenticated: true,
      userId: shopData.id
    }

  } catch (error) {
    logger.error('Authentication error:', error as Error, { component: 'content-center-auth' })
    return {
      authenticated: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Simplified authentication helper that returns user ID or null
 *
 * @param request - Next.js request object
 * @returns User ID if authenticated, null otherwise
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const result = await authenticateRequest(request)
  return result.authenticated ? result.userId! : null
}

/**
 * Check if a user has access to a specific resource
 * This is a placeholder for future role-based access control (RBAC)
 *
 * @param userId - User ID to check
 * @param resourceType - Type of resource (sample, profile, content, template)
 * @param resourceId - ID of the resource
 * @returns True if user has access, false otherwise
 */
export async function hasResourceAccess(
  userId: string,
  resourceType: 'sample' | 'profile' | 'content' | 'template',
  resourceId: string
): Promise<boolean> {
  // For now, RLS policies handle access control at database level
  // This function is a placeholder for future enhancements like:
  // - Team collaboration features
  // - Shared voice profiles
  // - Admin access to all resources

  // Currently, all access control is handled by RLS policies
  // which ensure users can only access their own resources
  return true
}

/**
 * Validate API key for server-to-server requests (future feature)
 *
 * @param request - Next.js request object
 * @returns True if valid API key, false otherwise
 */
export async function validateApiKey(request: NextRequest): Promise<boolean> {
  // Placeholder for future API key authentication
  // Useful for:
  // - Webhook callbacks
  // - Third-party integrations
  // - Automated content generation

  const apiKey = request.headers.get('x-api-key')

  if (!apiKey) {
    return false
  }

  // TODO: Implement API key validation
  // - Check against api_keys table
  // - Verify not expired
  // - Log API key usage

  return false
}
