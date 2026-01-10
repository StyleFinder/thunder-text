/**
 * Developer Dashboard Authentication
 *
 * SIMPLIFIED & RELIABLE:
 * - HMAC-signed cookie (no in-memory session storage)
 * - Survives hot reloads and server restarts
 * - Rate limiting on authentication attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const DEV_ADMIN_SECRET = process.env.DEV_ADMIN_SECRET;
const DEV_AUTH_COOKIE = 'dev_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

// Rate limiting for auth attempts
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_AUTH_ATTEMPTS = process.env.NODE_ENV === 'development' ? 100 : 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if dev auth is configured
 */
export function isDevAuthConfigured(): boolean {
  return !!DEV_ADMIN_SECRET && DEV_ADMIN_SECRET.length >= 16;
}

/**
 * Create a signed token that can be verified without server state
 * Format: expiry.signature
 */
function createSignedToken(): string {
  if (!DEV_ADMIN_SECRET) throw new Error('DEV_ADMIN_SECRET not configured');

  const expiry = Date.now() + (COOKIE_MAX_AGE * 1000);
  const hmac = createHmac('sha256', DEV_ADMIN_SECRET);
  hmac.update(`dev_auth:${expiry}`);
  const signature = hmac.digest('hex');

  return `${expiry}.${signature}`;
}

/**
 * Verify a signed token
 */
function verifySignedToken(token: string): boolean {
  if (!DEV_ADMIN_SECRET || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [expiryStr, providedSig] = parts;
  const expiry = parseInt(expiryStr, 10);

  // Check expiry
  if (isNaN(expiry) || expiry < Date.now()) {
    return false;
  }

  // Verify signature
  const hmac = createHmac('sha256', DEV_ADMIN_SECRET);
  hmac.update(`dev_auth:${expiry}`);
  const expectedSig = hmac.digest('hex');

  try {
    const providedBuffer = Buffer.from(providedSig, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Validate dev secret
 */
function validateDevSecret(providedSecret: string): boolean {
  if (!DEV_ADMIN_SECRET) return false;

  try {
    const providedBuffer = Buffer.from(providedSecret);
    const expectedBuffer = Buffer.from(DEV_ADMIN_SECRET);

    if (providedBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Check rate limit for IP address
 */
export function checkAuthRateLimit(ipAddress: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const attempt = authAttempts.get(ipAddress);

  if (!attempt || attempt.resetAt < now) {
    authAttempts.set(ipAddress, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return { allowed: true, remaining: MAX_AUTH_ATTEMPTS - 1, resetIn: AUTH_WINDOW_MS };
  }

  if (attempt.count >= MAX_AUTH_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetIn: attempt.resetAt - now };
  }

  attempt.count++;
  return { allowed: true, remaining: MAX_AUTH_ATTEMPTS - attempt.count, resetIn: attempt.resetAt - now };
}

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

/**
 * Authenticate with secret and create signed token
 */
export function authenticateWithSecret(secret: string): string | null {
  if (!validateDevSecret(secret)) {
    return null;
  }
  return createSignedToken();
}

/**
 * Check if request is authenticated for dev dashboard
 * Supports both X-Dev-Key header (preferred) and cookie-based auth
 */
export async function isDevAuthenticated(request: NextRequest): Promise<boolean> {
  // Check X-Dev-Key header first (preferred method - no cookies needed)
  const devKeyHeader = request.headers.get('X-Dev-Key');
  if (devKeyHeader && validateDevSecret(devKeyHeader)) {
    return true;
  }

  // Fallback to cookie
  const token = request.cookies.get(DEV_AUTH_COOKIE)?.value;
  if (token && verifySignedToken(token)) {
    return true;
  }

  return false;
}

/**
 * Set dev auth cookie
 */
export async function setDevAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEV_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear dev auth cookie
 */
export async function clearDevAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_AUTH_COOKIE);
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Valid dev session required. Use POST /api/dev/auth with Authorization header.',
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(resetIn: number): NextResponse {
  const resetInSeconds = Math.ceil(resetIn / 1000);
  return new NextResponse(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Too many authentication attempts. Try again in ${resetInSeconds} seconds.`,
      retryAfter: resetInSeconds,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': resetInSeconds.toString(),
      },
    }
  );
}

/**
 * Get session info for current request
 */
export function getSessionInfo(request: NextRequest): {
  authenticated: boolean;
  expiresAt?: number;
} {
  const token = request.cookies.get(DEV_AUTH_COOKIE)?.value;

  if (!token) {
    return { authenticated: false };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { authenticated: false };
  }

  const expiry = parseInt(parts[0], 10);
  if (isNaN(expiry) || expiry < Date.now()) {
    return { authenticated: false };
  }

  if (!verifySignedToken(token)) {
    return { authenticated: false };
  }

  return { authenticated: true, expiresAt: expiry };
}

/**
 * Middleware for dev routes
 */
export async function checkDevAuth(request: NextRequest): Promise<boolean> {
  return isDevAuthenticated(request);
}
