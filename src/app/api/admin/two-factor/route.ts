import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { logger } from '@/lib/logger';
import {
  initializeTwoFactorSetup,
  completeTwoFactorSetup,
  disableTwoFactor,
  verifyTwoFactorCode,
  isTwoFactorEnabled
} from '@/lib/security/two-factor-auth';

/**
 * GET /api/admin/two-factor
 *
 * Get 2FA status for the current admin user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const enabled = await isTwoFactorEnabled(session.user.id);

    return NextResponse.json({
      enabled,
      userId: session.user.id
    });
  } catch (error) {
    logger.error('[2FA API] Status check error:', error as Error, {
      component: 'two-factor-api'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/two-factor
 *
 * Initialize 2FA setup - returns QR code and backup codes
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if already enabled
    const alreadyEnabled = await isTwoFactorEnabled(session.user.id);
    if (alreadyEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    // Initialize setup
    const setup = await initializeTwoFactorSetup(
      session.user.id,
      session.user.email
    );

    if (!setup.success) {
      return NextResponse.json(
        { error: setup.error || 'Failed to initialize 2FA' },
        { status: 500 }
      );
    }

    logger.info('[2FA API] Setup initialized', {
      component: 'two-factor-api',
      userId: session.user.id
    });

    return NextResponse.json({
      qrCode: setup.qrCodeDataUrl,
      backupCodes: setup.backupCodes,
      secret: setup.secret // For manual entry
    });
  } catch (error) {
    logger.error('[2FA API] Setup initialization error:', error as Error, {
      component: 'two-factor-api'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/two-factor
 *
 * Complete 2FA setup by verifying a TOTP code
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { totpCode } = await req.json();

    if (!totpCode || typeof totpCode !== 'string') {
      return NextResponse.json(
        { error: 'TOTP code is required' },
        { status: 400 }
      );
    }

    // Complete setup
    const result = await completeTwoFactorSetup(
      session.user.id,
      totpCode
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to verify code' },
        { status: 400 }
      );
    }

    logger.info('[2FA API] Setup completed', {
      component: 'two-factor-api',
      userId: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been enabled successfully'
    });
  } catch (error) {
    logger.error('[2FA API] Setup completion error:', error as Error, {
      component: 'two-factor-api'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/two-factor
 *
 * Disable 2FA for the current admin
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { totpCode } = await req.json();

    if (!totpCode || typeof totpCode !== 'string') {
      return NextResponse.json(
        { error: 'TOTP code is required to disable 2FA' },
        { status: 400 }
      );
    }

    // Disable 2FA - verify TOTP first, then disable
    const verifyResult = await verifyTwoFactorCode(session.user.id, totpCode);
    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error || 'Invalid TOTP code' },
        { status: 400 }
      );
    }

    const result = await disableTwoFactor(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to disable 2FA' },
        { status: 400 }
      );
    }

    logger.info('[2FA API] 2FA disabled', {
      component: 'two-factor-api',
      userId: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled'
    });
  } catch (error) {
    logger.error('[2FA API] Disable error:', error as Error, {
      component: 'two-factor-api'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
