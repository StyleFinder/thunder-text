/**
 * Password Reset Token Management
 *
 * Provides secure password reset functionality:
 * - Cryptographically secure token generation
 * - Time-limited tokens (1 hour expiry)
 * - Single-use tokens
 * - Secure token storage (hashed)
 */

import { randomBytes, createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// Token expires after 1 hour
const TOKEN_EXPIRY_MS = 60 * 60 * 1000

/**
 * Generate a cryptographically secure reset token
 */
function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a token for secure storage
 * We store the hash, not the plaintext token
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface PasswordResetResult {
  success: boolean
  token?: string // Only returned on success (to send in email)
  error?: string
}

/**
 * Create a password reset token for a user
 *
 * @param email - The user's email address
 * @param userType - Type of user ('shop' | 'coach' | 'admin')
 * @returns The reset token (to be sent via email) or error
 */
export async function createPasswordResetToken(
  email: string,
  userType: 'shop' | 'coach' | 'admin' = 'shop'
): Promise<PasswordResetResult> {
  try {
    // Determine which table to check
    const table = userType === 'admin' ? 'super_admins' :
                  userType === 'coach' ? 'coaches' : 'shops'

    // Verify user exists (but don't reveal if they don't for security)
    const { data: user } = await supabaseAdmin
      .from(table)
      .select('id, email')
      .eq('email', email)
      .single()

    if (!user) {
      // Don't reveal whether email exists - return success anyway
      // This prevents email enumeration attacks
      logger.info('[Password Reset] Token requested for non-existent email', {
        component: 'password-reset',
        userType
      })
      return { success: true } // Pretend success
    }

    // Generate token
    const token = generateResetToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString()

    // Store hashed token in database
    // First, invalidate any existing tokens for this user
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('user_type', userType)

    // Create new token
    const { error } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        user_type: userType,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false
      })

    if (error) {
      logger.error('[Password Reset] Failed to store token', error as Error, {
        component: 'password-reset'
      })
      return { success: false, error: 'Failed to create reset token' }
    }

    logger.info('[Password Reset] Token created', {
      component: 'password-reset',
      userId: user.id,
      userType
    })

    return { success: true, token }
  } catch (error) {
    logger.error('[Password Reset] Unexpected error', error as Error, {
      component: 'password-reset'
    })
    return { success: false, error: 'Server error' }
  }
}

/**
 * Verify a password reset token
 *
 * @param token - The reset token from the URL
 * @returns User info if valid, null if invalid/expired
 */
export async function verifyPasswordResetToken(token: string): Promise<{
  userId: string
  userType: string
  email: string
} | null> {
  try {
    const tokenHash = hashToken(token)

    // Find the token
    const { data: resetToken, error } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .single()

    if (error || !resetToken) {
      logger.warn('[Password Reset] Invalid or used token', {
        component: 'password-reset'
      })
      return null
    }

    // Check expiry
    if (new Date(resetToken.expires_at) < new Date()) {
      logger.warn('[Password Reset] Expired token', {
        component: 'password-reset'
      })
      return null
    }

    // Get user email based on user type
    const table = resetToken.user_type === 'admin' ? 'super_admins' :
                  resetToken.user_type === 'coach' ? 'coaches' : 'shops'

    const { data: user } = await supabaseAdmin
      .from(table)
      .select('email')
      .eq('id', resetToken.user_id)
      .single()

    if (!user) {
      return null
    }

    return {
      userId: resetToken.user_id,
      userType: resetToken.user_type,
      email: user.email
    }
  } catch (error) {
    logger.error('[Password Reset] Token verification error', error as Error, {
      component: 'password-reset'
    })
    return null
  }
}

/**
 * Complete password reset - mark token as used
 *
 * @param token - The reset token
 * @param newPasswordHash - The bcrypt hash of the new password
 */
export async function completePasswordReset(
  token: string,
  newPasswordHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenHash = hashToken(token)

    // Get and validate token
    const { data: resetToken } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .single()

    if (!resetToken || new Date(resetToken.expires_at) < new Date()) {
      return { success: false, error: 'Invalid or expired token' }
    }

    // Update password in appropriate table
    const table = resetToken.user_type === 'admin' ? 'super_admins' :
                  resetToken.user_type === 'coach' ? 'coaches' : 'shops'

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', resetToken.user_id)

    if (updateError) {
      logger.error('[Password Reset] Failed to update password', updateError as Error, {
        component: 'password-reset'
      })
      return { success: false, error: 'Failed to update password' }
    }

    // Mark token as used
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id)

    logger.info('[Password Reset] Password successfully reset', {
      component: 'password-reset',
      userId: resetToken.user_id,
      userType: resetToken.user_type
    })

    return { success: true }
  } catch (error) {
    logger.error('[Password Reset] Complete reset error', error as Error, {
      component: 'password-reset'
    })
    return { success: false, error: 'Server error' }
  }
}
