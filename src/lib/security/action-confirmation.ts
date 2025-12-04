/**
 * Sensitive Action Confirmation
 *
 * Provides email-based confirmation for sensitive actions:
 * - Account deletion
 * - Email change
 * - Password change (when logged in)
 * - Critical settings changes
 *
 * Uses time-limited, single-use confirmation tokens.
 */

import { randomBytes, createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// Token expires after 30 minutes for sensitive actions
const TOKEN_EXPIRY_MS = 30 * 60 * 1000

// Types of sensitive actions
export type SensitiveActionType =
  | 'account_deletion'
  | 'email_change'
  | 'password_change'
  | 'disconnect_integration'

interface PendingAction {
  actionType: SensitiveActionType
  userId: string
  userType: string
  metadata?: Record<string, unknown>
}

/**
 * Generate a cryptographically secure confirmation token
 */
function generateConfirmationToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a token for secure storage
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Create a confirmation token for a sensitive action
 *
 * @param action - The action details
 * @returns The confirmation token (to send via email)
 */
export async function createActionConfirmation(
  action: PendingAction
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const token = generateConfirmationToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString()

    // Delete any existing pending confirmations for this action
    await supabaseAdmin
      .from('action_confirmations')
      .delete()
      .eq('user_id', action.userId)
      .eq('action_type', action.actionType)

    // Create new confirmation
    const { error } = await supabaseAdmin
      .from('action_confirmations')
      .insert({
        user_id: action.userId,
        user_type: action.userType,
        action_type: action.actionType,
        token_hash: tokenHash,
        metadata: action.metadata || {},
        expires_at: expiresAt,
        confirmed: false
      })

    if (error) {
      logger.error('[Action Confirmation] Failed to create confirmation', error as Error, {
        component: 'action-confirmation',
        actionType: action.actionType
      })
      return { success: false, error: 'Failed to create confirmation' }
    }

    logger.info('[Action Confirmation] Confirmation created', {
      component: 'action-confirmation',
      actionType: action.actionType,
      userId: action.userId
    })

    return { success: true, token }
  } catch (error) {
    logger.error('[Action Confirmation] Unexpected error', error as Error, {
      component: 'action-confirmation'
    })
    return { success: false, error: 'Server error' }
  }
}

/**
 * Verify and execute a confirmed action
 *
 * @param token - The confirmation token from the email link
 * @returns The action details if valid
 */
export async function verifyActionConfirmation(token: string): Promise<{
  success: boolean
  action?: PendingAction & { id: string }
  error?: string
}> {
  try {
    const tokenHash = hashToken(token)

    // Find the confirmation
    const { data: confirmation, error } = await supabaseAdmin
      .from('action_confirmations')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('confirmed', false)
      .single()

    if (error || !confirmation) {
      return { success: false, error: 'Invalid or already used confirmation link' }
    }

    // Check expiry
    if (new Date(confirmation.expires_at) < new Date()) {
      return { success: false, error: 'Confirmation link has expired' }
    }

    return {
      success: true,
      action: {
        id: confirmation.id,
        actionType: confirmation.action_type,
        userId: confirmation.user_id,
        userType: confirmation.user_type,
        metadata: confirmation.metadata
      }
    }
  } catch (error) {
    logger.error('[Action Confirmation] Verification error', error as Error, {
      component: 'action-confirmation'
    })
    return { success: false, error: 'Server error' }
  }
}

/**
 * Mark an action as confirmed (after executing it)
 */
export async function markActionConfirmed(confirmationId: string): Promise<void> {
  await supabaseAdmin
    .from('action_confirmations')
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq('id', confirmationId)
}

/**
 * Get confirmation URL for an action
 */
export function getConfirmationUrl(token: string, actionType: SensitiveActionType): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm-action?token=${token}&action=${actionType}`
}

/**
 * Get human-readable action description
 */
export function getActionDescription(actionType: SensitiveActionType): string {
  switch (actionType) {
    case 'account_deletion':
      return 'permanently delete your account'
    case 'email_change':
      return 'change your email address'
    case 'password_change':
      return 'change your password'
    case 'disconnect_integration':
      return 'disconnect an integration'
    default:
      return 'complete this action'
  }
}
