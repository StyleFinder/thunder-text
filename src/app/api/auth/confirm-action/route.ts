import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  verifyActionConfirmation,
  markActionConfirmed
} from '@/lib/security/action-confirmation';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/auth/confirm-action?token=xxx
 *
 * Verify an action confirmation token is valid
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = await verifyActionConfirmation(token);

    if (!result.success || !result.action) {
      return NextResponse.json(
        { error: result.error || 'Invalid or expired confirmation link' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      actionType: result.action.actionType,
      actionId: result.action.id,
      metadata: result.action.metadata
    });
  } catch (error) {
    logger.error('[Confirm Action] Verify error:', error as Error, {
      component: 'confirm-action'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/confirm-action
 *
 * Execute the confirmed action
 */
export async function POST(req: NextRequest) {
  try {
    const { token, actionId } = await req.json();

    if (!token || !actionId) {
      return NextResponse.json(
        { error: 'Token and actionId are required' },
        { status: 400 }
      );
    }

    // Verify the token again
    const result = await verifyActionConfirmation(token);

    if (!result.success || !result.action) {
      return NextResponse.json(
        { error: result.error || 'Invalid or expired confirmation link' },
        { status: 400 }
      );
    }

    // Verify the action ID matches
    if (result.action.id !== actionId) {
      return NextResponse.json(
        { error: 'Action mismatch' },
        { status: 400 }
      );
    }

    const { actionType, userId, userType, metadata } = result.action;

    // Execute the action based on type
    switch (actionType) {
      case 'account_deletion':
        await handleAccountDeletion(userId, userType);
        break;

      case 'email_change':
        if (metadata?.newEmail) {
          await handleEmailChange(userId, userType, metadata.newEmail as string);
        }
        break;

      case 'password_change':
        // Password change is handled in a separate flow
        // This confirmation just validates the action
        break;

      case 'disconnect_integration':
        if (metadata?.integrationId) {
          await handleDisconnectIntegration(userId, metadata.integrationId as string);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown action type' },
          { status: 400 }
        );
    }

    // Mark the action as confirmed
    await markActionConfirmed(actionId);

    logger.info('[Confirm Action] Action confirmed and executed', {
      component: 'confirm-action',
      actionType,
      userId
    });

    return NextResponse.json({
      success: true,
      message: 'Action confirmed successfully'
    });
  } catch (error) {
    logger.error('[Confirm Action] Execution error:', error as Error, {
      component: 'confirm-action'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle account deletion
 */
async function handleAccountDeletion(userId: string, userType: string): Promise<void> {
  const table = userType === 'coach' ? 'coaches' : 'shops';

  // Soft delete - mark as inactive and anonymize data
  await supabaseAdmin
    .from(table)
    .update({
      is_active: false,
      email: `deleted_${userId}@deleted.local`,
      password_hash: null,
      // Clear other sensitive fields based on table
      ...(userType === 'shop' && {
        shop_domain: null,
        shopify_access_token: null,
        offline_token: null
      })
    })
    .eq('id', userId);

  logger.info('[Confirm Action] Account deleted', {
    component: 'confirm-action',
    userId,
    userType
  });
}

/**
 * Handle email change
 */
async function handleEmailChange(userId: string, userType: string, newEmail: string): Promise<void> {
  const table = userType === 'coach' ? 'coaches' : 'shops';

  await supabaseAdmin
    .from(table)
    .update({ email: newEmail })
    .eq('id', userId);

  logger.info('[Confirm Action] Email changed', {
    component: 'confirm-action',
    userId,
    userType
  });
}

/**
 * Handle integration disconnect
 */
async function handleDisconnectIntegration(userId: string, integrationId: string): Promise<void> {
  // Mark integration as inactive
  await supabaseAdmin
    .from('integrations')
    .update({
      is_active: false,
      encrypted_access_token: null,
      encrypted_refresh_token: null
    })
    .eq('id', integrationId)
    .eq('shop_id', userId);

  logger.info('[Confirm Action] Integration disconnected', {
    component: 'confirm-action',
    userId,
    integrationId
  });
}
