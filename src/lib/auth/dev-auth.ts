/**
 * Developer Dashboard Authentication
 *
 * SECURITY HARDENED:
 * - Secrets accepted only via POST with Authorization header
 * - Opaque session tokens stored in cookies (not raw secrets)
 * - Rate limiting on authentication attempts
 * - HMAC-based token generation for session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const DEV_ADMIN_SECRET = process.env.DEV_ADMIN_SECRET;
const DEV_AUTH_COOKIE = 'dev_session_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

// Session token storage (in-memory for single instance)
// For production distributed deployments, use Redis
const activeSessions = new Map<string, { createdAt: number; expiresAt: number }>();

// Rate limiting for auth attempts
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_AUTH_ATTEMPTS = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Clean up expired sessions every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      activeSessions.delete(token);
    }
  }
  for (const [ip, attempt] of authAttempts.entries()) {
    if (attempt.resetAt < now) {
      authAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if dev auth is configured
 */
export function isDevAuthConfigured(): boolean {
  return !!DEV_ADMIN_SECRET && DEV_ADMIN_SECRET.length >= 16;
}

/**
 * Generate an opaque session token using HMAC
 * Token format: random_bytes.hmac_signature.timestamp
 */
function generateSessionToken(): string {
  if (!DEV_ADMIN_SECRET) throw new Error('DEV_ADMIN_SECRET not configured');

  const randomPart = randomBytes(32).toString('base64url');
  const timestamp = Date.now().toString();
  const dataToSign = `${randomPart}.${timestamp}`;

  const hmac = createHmac('sha256', DEV_ADMIN_SECRET);
  hmac.update(dataToSign);
  const signature = hmac.digest('base64url');

  return `${randomPart}.${signature}.${timestamp}`;
}

/**
 * Validate a session token
 */
function validateSessionToken(token: string): boolean {
  if (!DEV_ADMIN_SECRET || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [randomPart, providedSignature, timestamp] = parts;

  // Verify HMAC signature
  const dataToSign = `${randomPart}.${timestamp}`;
  const hmac = createHmac('sha256', DEV_ADMIN_SECRET);
  hmac.update(dataToSign);
  const expectedSignature = hmac.digest('base64url');

  // Timing-safe comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(providedSignature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (providedBuffer.length !== expectedBuffer.length) return false;
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) return false;
  } catch {
    return false;
  }

  // Check if session is still active
  const session = activeSessions.get(token);
  if (!session) return false;

  if (session.expiresAt < Date.now()) {
    activeSessions.delete(token);
    return false;
  }

  return true;
}

/**
 * SECURITY: Validate dev secret using timing-safe comparison
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
  resetIn: number
} {
  const now = Date.now();
  const attempt = authAttempts.get(ipAddress);

  if (!attempt || attempt.resetAt < now) {
    // Fresh window
    authAttempts.set(ipAddress, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return { allowed: true, remaining: MAX_AUTH_ATTEMPTS - 1, resetIn: AUTH_WINDOW_MS };
  }

  if (attempt.count >= MAX_AUTH_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: attempt.resetAt - now
    };
  }

  attempt.count++;
  return {
    allowed: true,
    remaining: MAX_AUTH_ATTEMPTS - attempt.count,
    resetIn: attempt.resetAt - now
  };
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
 * Authenticate with secret and create session
 * SECURITY: Only accepts secret via Authorization header
 *
 * @param secret - The dev admin secret from Authorization header
 * @returns Session token if valid, null if invalid
 */
export function authenticateWithSecret(secret: string): string | null {
  if (!validateDevSecret(secret)) {
    return null;
  }

  const sessionToken = generateSessionToken();
  const now = Date.now();

  activeSessions.set(sessionToken, {
    createdAt: now,
    expiresAt: now + (COOKIE_MAX_AGE * 1000),
  });

  return sessionToken;
}

/**
 * Check if request is authenticated for dev dashboard
 * SECURITY: Only checks session cookie (opaque token)
 * No longer accepts raw secrets in query params or cookies
 */
export async function isDevAuthenticated(request: NextRequest): Promise<boolean> {
  // Only check session cookie
  const sessionToken = request.cookies.get(DEV_AUTH_COOKIE)?.value;
  if (sessionToken && validateSessionToken(sessionToken)) {
    return true;
  }

  // Check Authorization header for session token (for API calls)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (validateSessionToken(token)) {
      return true;
    }
  }

  return false;
}

/**
 * Set dev auth cookie with session token
 */
export async function setDevAuthCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEV_AUTH_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/dev',
  });
}

/**
 * Clear dev auth cookie and invalidate session
 */
export async function clearDevAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(DEV_AUTH_COOKIE)?.value;

  if (sessionToken) {
    activeSessions.delete(sessionToken);
  }

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
  expiresAt?: number
} {
  const sessionToken = request.cookies.get(DEV_AUTH_COOKIE)?.value;

  if (!sessionToken) {
    return { authenticated: false };
  }

  const session = activeSessions.get(sessionToken);
  if (!session || session.expiresAt < Date.now()) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    expiresAt: session.expiresAt
  };
}

/**
 * Middleware for dev routes
 * Use in route handlers: if (!await checkDevAuth(request)) return unauthorized response
 */
export async function checkDevAuth(request: NextRequest): Promise<boolean> {
  return isDevAuthenticated(request);
}
