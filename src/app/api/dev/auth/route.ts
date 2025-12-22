/**
 * Dev Dashboard Authentication API
 *
 * SECURITY HARDENED:
 * GET /api/dev/auth - Check authentication status (no secrets in URL)
 * POST /api/dev/auth - Authenticate with secret (in Authorization header only)
 * DELETE /api/dev/auth - Logout and clear session
 *
 * Authentication flow:
 * 1. POST with Authorization: Bearer <DEV_ADMIN_SECRET>
 * 2. Server validates and returns opaque session token in cookie
 * 3. Subsequent requests use session cookie (not raw secret)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  isDevAuthConfigured,
  isDevAuthenticated,
  createRateLimitResponse,
  authenticateWithSecret,
  clearDevAuthCookie,
  checkAuthRateLimit,
  getClientIp,
  getSessionInfo,
} from '@/lib/auth/dev-auth';
import { logger } from '@/lib/logger';

/**
 * GET - Check authentication status
 * Returns whether the user has a valid session
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check if dev auth is configured
  if (!isDevAuthConfigured()) {
    return new NextResponse(
      JSON.stringify({
        error: 'Not Configured',
        message: 'DEV_ADMIN_SECRET environment variable is not set or too short (min 16 chars)',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Check if user has valid session
  const isAuthenticated = await isDevAuthenticated(request);
  const sessionInfo = getSessionInfo(request);

  if (!isAuthenticated) {
    return NextResponse.json({
      authenticated: false,
      message: 'Not authenticated. Use POST /api/dev/auth with Authorization header.',
    });
  }

  return NextResponse.json({
    authenticated: true,
    message: 'Dev dashboard access granted',
    expiresAt: sessionInfo.expiresAt,
    expiresIn: sessionInfo.expiresAt
      ? Math.ceil((sessionInfo.expiresAt - Date.now()) / 1000)
      : undefined,
  });
}

/**
 * POST - Authenticate with secret
 * SECURITY: Secret must be provided in Authorization header, not URL or body
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check if dev auth is configured
  if (!isDevAuthConfigured()) {
    return new NextResponse(
      JSON.stringify({
        error: 'Not Configured',
        message: 'DEV_ADMIN_SECRET environment variable is not set or too short (min 16 chars)',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Rate limiting by IP
  const clientIp = getClientIp(request);
  const rateLimitResult = checkAuthRateLimit(clientIp);

  if (!rateLimitResult.allowed) {
    logger.warn('Dev auth rate limit exceeded', {
      component: 'dev-auth',
      clientIp,
      resetIn: rateLimitResult.resetIn,
    });
    return createRateLimitResponse(rateLimitResult.resetIn);
  }

  // Get secret from Authorization header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Dev auth attempt without Authorization header', {
      component: 'dev-auth',
      clientIp,
    });
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Authorization header required. Format: Authorization: Bearer <DEV_ADMIN_SECRET>',
        remainingAttempts: rateLimitResult.remaining,
      },
      { status: 400 }
    );
  }

  const providedSecret = authHeader.substring(7);

  // Authenticate and create session
  const sessionToken = authenticateWithSecret(providedSecret);

  if (!sessionToken) {
    logger.warn('Dev auth failed - invalid secret', {
      component: 'dev-auth',
      clientIp,
      remainingAttempts: rateLimitResult.remaining,
    });
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Invalid secret',
        remainingAttempts: rateLimitResult.remaining,
      },
      { status: 401 }
    );
  }

  // Success - set session cookie
  logger.info('Dev auth successful', {
    component: 'dev-auth',
    clientIp,
  });

  // Create response and set cookie
  const response = NextResponse.json({
    authenticated: true,
    message: 'Dev dashboard access granted',
    expiresIn: 86400, // 24 hours in seconds
  });

  // Set the session token cookie
  response.cookies.set('dev_session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return response;
}

/**
 * DELETE - Logout and clear session
 */
export async function DELETE(_request: NextRequest): Promise<NextResponse> {
  // Clear the session
  await clearDevAuthCookie();

  const response = NextResponse.json({
    authenticated: false,
    message: 'Logged out successfully',
  });

  // Clear the cookie
  response.cookies.delete('dev_session_token');

  return response;
}
