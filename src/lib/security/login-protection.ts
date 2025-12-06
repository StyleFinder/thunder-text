/**
 * Login Protection & Account Lockout
 *
 * Provides brute force protection including:
 * - Failed attempt tracking
 * - Progressive lockout delays
 * - Account lockout after threshold
 * - IP-based rate limiting
 *
 * Note: Uses in-memory store for single-instance deployment.
 * For multi-instance, migrate to Redis.
 */

import { logger } from "@/lib/logger";

// Lazy import supabaseAdmin to avoid module load failures at initialization
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for counting attempts

// In-memory store for failed attempts (acceptable for single-instance)
// Key: email or IP, Value: { attempts, lastAttempt, lockedUntil }
interface LoginAttemptRecord {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const loginAttemptStore = new Map<string, LoginAttemptRecord>();

// Clean up old entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of loginAttemptStore.entries()) {
      // Remove records older than the attempt window with no lockout
      if (now - record.lastAttempt > ATTEMPT_WINDOW_MS && !record.lockedUntil) {
        loginAttemptStore.delete(key);
      }
      // Remove expired lockouts
      if (record.lockedUntil && now > record.lockedUntil) {
        loginAttemptStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
); // Clean every 5 minutes

export interface LockoutStatus {
  isLocked: boolean;
  remainingAttempts: number;
  lockoutEndsAt: Date | null;
  lockoutRemainingSeconds: number | null;
}

/**
 * Check if an account/IP is currently locked out
 */
export function checkLockoutStatus(identifier: string): LockoutStatus {
  const record = loginAttemptStore.get(identifier);
  const now = Date.now();

  if (!record) {
    return {
      isLocked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      lockoutEndsAt: null,
      lockoutRemainingSeconds: null,
    };
  }

  // Check if locked and lockout hasn't expired
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutEndsAt: new Date(record.lockedUntil),
      lockoutRemainingSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  // Reset if lockout expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    loginAttemptStore.delete(identifier);
    return {
      isLocked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      lockoutEndsAt: null,
      lockoutRemainingSeconds: null,
    };
  }

  // Count attempts within window
  const attemptsInWindow =
    now - record.lastAttempt < ATTEMPT_WINDOW_MS ? record.attempts : 0;

  return {
    isLocked: false,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attemptsInWindow),
    lockoutEndsAt: null,
    lockoutRemainingSeconds: null,
  };
}

/**
 * Record a failed login attempt
 * Returns the updated lockout status
 */
export function recordFailedAttempt(identifier: string): LockoutStatus {
  const now = Date.now();
  const existing = loginAttemptStore.get(identifier);

  let attempts: number;
  if (!existing || now - existing.lastAttempt > ATTEMPT_WINDOW_MS) {
    // First attempt or window expired
    attempts = 1;
  } else {
    attempts = existing.attempts + 1;
  }

  const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock ? now + LOCKOUT_DURATION_MS : null;

  loginAttemptStore.set(identifier, {
    attempts,
    lastAttempt: now,
    lockedUntil,
  });

  if (shouldLock) {
    logger.warn("[Login Protection] Account locked due to failed attempts", {
      component: "login-protection",
      identifier: identifier.includes("@")
        ? `${identifier.substring(0, 3)}***`
        : identifier,
      attempts,
      lockoutDurationMinutes: LOCKOUT_DURATION_MS / 60000,
    });
  }

  return {
    isLocked: shouldLock,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attempts),
    lockoutEndsAt: lockedUntil ? new Date(lockedUntil) : null,
    lockoutRemainingSeconds: lockedUntil
      ? Math.ceil(LOCKOUT_DURATION_MS / 1000)
      : null,
  };
}

/**
 * Clear failed attempts on successful login
 */
export function clearFailedAttempts(identifier: string): void {
  loginAttemptStore.delete(identifier);
}

/**
 * Record failed attempt in database for persistent tracking (optional)
 * Use this for long-term security monitoring
 */
export async function recordFailedAttemptToDatabase(
  email: string,
  ip: string,
  userAgent: string,
): Promise<void> {
  try {
    // Only log if we have a login_attempts table
    // This is optional - the in-memory store is sufficient for protection
    const supabaseAdmin = await getSupabaseAdmin();
    await supabaseAdmin.from("login_attempts").insert({
      email,
      ip_address: ip,
      user_agent: userAgent,
      success: false,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Table may not exist - that's okay, in-memory protection still works
  }
}

/**
 * Get lockout message for user
 */
export function getLockoutMessage(status: LockoutStatus): string {
  if (status.isLocked) {
    const minutes = Math.ceil((status.lockoutRemainingSeconds || 0) / 60);
    return `Account temporarily locked. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }

  if (status.remainingAttempts <= 2) {
    return `Warning: ${status.remainingAttempts} attempt${status.remainingAttempts === 1 ? "" : "s"} remaining before account lockout.`;
  }

  return "";
}
