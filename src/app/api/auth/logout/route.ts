import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/logout
 *
 * Securely log out the user by clearing all session cookies.
 * This ensures both NextAuth sessions and Shopify shop sessions are cleared.
 */
export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear NextAuth session cookie
    response.cookies.set('next-auth.session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // Expire immediately
    });

    // Clear NextAuth CSRF token
    response.cookies.set('next-auth.csrf-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    // Clear Shopify shop session cookie
    response.cookies.set('shopify_shop', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    // Clear any OAuth state cookies
    response.cookies.set('oauth_state_shopify', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    response.cookies.set('oauth_state_facebook', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    response.cookies.set('oauth_state_google', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    response.cookies.set('oauth_state_tiktok', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    logger.info('[Logout] User logged out successfully', {
      component: 'logout'
    });

    return response;
  } catch (error) {
    logger.error('[Logout] Error during logout:', error as Error, {
      component: 'logout'
    });
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/logout
 *
 * Redirect-based logout for simple logout links
 */
export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?logged_out=true`
  );

  // Clear all session cookies (same as POST)
  const cookiesToClear = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'shopify_shop',
    'oauth_state_shopify',
    'oauth_state_facebook',
    'oauth_state_google',
    'oauth_state_tiktok'
  ];

  for (const cookieName of cookiesToClear) {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });
  }

  logger.info('[Logout] User logged out via redirect', {
    component: 'logout'
  });

  return response;
}
