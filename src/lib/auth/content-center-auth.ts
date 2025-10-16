/**
 * Content Center Authentication Utilities
 *
 * Provides authentication and authorization helpers for Content Center API routes.
 * Uses Supabase JWT tokens for user authentication.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

/**
 * Create a Supabase admin client for server-side operations
 */
export function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean
  userId?: string
  error?: string
}

/**
 * Extract and verify JWT token from Authorization header
 *
 * @param request - Next.js request object
 * @returns Authentication result with user ID if successful
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return {
        authenticated: false,
        error: 'Missing Authorization header'
      }
    }

    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        error: 'Invalid Authorization header format. Expected: Bearer <token>'
      }
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '')

    if (!token || token.trim() === '') {
      return {
        authenticated: false,
        error: 'Empty token provided'
      }
    }

    // Verify token with Supabase
    const supabase = getSupabaseAdmin()
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error) {
      console.error('Token verification failed:', error.message)
      return {
        authenticated: false,
        error: 'Invalid or expired token'
      }
    }

    if (!user) {
      return {
        authenticated: false,
        error: 'User not found'
      }
    }

    // Successfully authenticated
    return {
      authenticated: true,
      userId: user.id
    }

  } catch (error) {
    console.error('Authentication error:', error)
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
