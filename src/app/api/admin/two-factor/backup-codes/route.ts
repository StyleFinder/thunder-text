import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { logger } from '@/lib/logger';
import {
  regenerateBackupCodes,
  isTwoFactorEnabled
} from '@/lib/security/two-factor-auth';

/**
 * POST /api/admin/two-factor/backup-codes
 *
 * Regenerate backup codes for 2FA recovery
 * Requires current TOTP code for verification
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    const enabled = await isTwoFactorEnabled(session.user.id);
    if (!enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    const { totpCode } = await req.json();

    if (!totpCode || typeof totpCode !== 'string') {
      return NextResponse.json(
        { error: 'TOTP code is required' },
        { status: 400 }
      );
    }

    // Verify TOTP code first
    const { verifyTwoFactorCode } = await import('@/lib/security/two-factor-auth');
    const verifyResult = await verifyTwoFactorCode(session.user.id, totpCode);
    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error || 'Invalid TOTP code' },
        { status: 400 }
      );
    }

    // Regenerate backup codes
    const result = await regenerateBackupCodes(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to regenerate backup codes' },
        { status: 400 }
      );
    }

    logger.info('[2FA API] Backup codes regenerated', {
      component: 'two-factor-api',
      userId: session.user.id
    });

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message: 'New backup codes generated. Save them securely - previous codes are now invalid.'
    });
  } catch (error) {
    logger.error('[2FA API] Backup codes error:', error as Error, {
      component: 'two-factor-api'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
