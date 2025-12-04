import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createPasswordResetToken } from '@/lib/security/password-reset';

/**
 * POST /api/auth/forgot-password
 *
 * Request a password reset email.
 * Always returns success to prevent email enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, userType = 'shop' } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create reset token
    const result = await createPasswordResetToken(email, userType);

    if (result.success && result.token) {
      // TODO: Send email with reset link
      // For now, log the token (remove in production)
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${result.token}`;

      logger.info('[Forgot Password] Reset link generated', {
        component: 'forgot-password',
        // Don't log the actual token in production
        resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : '[REDACTED]'
      });

      // In production, send email here:
      // await sendPasswordResetEmail(email, resetUrl);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset link will be sent.'
    });
  } catch (error) {
    logger.error('[Forgot Password] Error:', error as Error, {
      component: 'forgot-password'
    });
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
