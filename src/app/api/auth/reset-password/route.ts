import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { logger } from '@/lib/logger';
import { validatePassword } from '@/lib/security/password-validation';
import {
  verifyPasswordResetToken,
  completePasswordReset
} from '@/lib/security/password-reset';

/**
 * GET /api/auth/reset-password?token=xxx
 *
 * Verify a password reset token is valid (for showing the reset form)
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

    const tokenData = await verifyPasswordResetToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Return minimal info (don't expose full email)
    const maskedEmail = tokenData.email.replace(
      /(.{2})(.*)(@.*)/,
      '$1***$3'
    );

    return NextResponse.json({
      valid: true,
      email: maskedEmail
    });
  } catch (error) {
    logger.error('[Reset Password] Verify error:', error as Error, {
      component: 'reset-password'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/reset-password
 *
 * Complete the password reset with new password
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate the token first
    const tokenData = await verifyPasswordResetToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      }, { status: 400 });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Complete the reset
    const result = await completePasswordReset(token, passwordHash);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset password' },
        { status: 400 }
      );
    }

    logger.info('[Reset Password] Password successfully reset', {
      component: 'reset-password',
      userType: tokenData.userType
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (error) {
    logger.error('[Reset Password] Reset error:', error as Error, {
      component: 'reset-password'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
