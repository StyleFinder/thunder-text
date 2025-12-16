/**
 * Login Protection & Account Lockout
 *
 * Provides brute force protection including:
 * - Failed attempt tracking
 * - Progressive lockout delays
 * - Account lockout after threshold
 * - IP-based rate limiting
 *
 * ARCHITECTURE:
 * - Uses in-memory store as fast cache for immediate protection
 * - Persists to database (shops.failed_login_attempts, shops.locked_until)
 *   for durability across restarts and multi-instance deployments
 * - Database is source of truth; memory is sync'd on read
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

// In-memory store for failed attempts (fast cache)
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
 * Uses in-memory cache first, falls back to database for persistence
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
 * Check lockout status from database (async version)
 * Use this to sync memory state with database on login attempts
 */
export async function checkLockoutStatusFromDatabase(
  email: string,
): Promise<LockoutStatus> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("failed_login_attempts, locked_until, last_failed_login_at")
      .eq("email", email.toLowerCase())
      .single();

    if (!shop) {
      return {
        isLocked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
        lockoutEndsAt: null,
        lockoutRemainingSeconds: null,
      };
    }

    const now = Date.now();
    const lockedUntil = shop.locked_until
      ? new Date(shop.locked_until).getTime()
      : null;

    // Check if locked
    if (lockedUntil && now < lockedUntil) {
      // Sync to memory cache
      loginAttemptStore.set(email.toLowerCase(), {
        attempts: shop.failed_login_attempts || MAX_FAILED_ATTEMPTS,
        lastAttempt: shop.last_failed_login_at
          ? new Date(shop.last_failed_login_at).getTime()
          : now,
        lockedUntil,
      });

      return {
        isLocked: true,
        remainingAttempts: 0,
        lockoutEndsAt: new Date(lockedUntil),
        lockoutRemainingSeconds: Math.ceil((lockedUntil - now) / 1000),
      };
    }

    // Lockout expired or never set
    const attempts = shop.failed_login_attempts || 0;
    const lastAttempt = shop.last_failed_login_at
      ? new Date(shop.last_failed_login_at).getTime()
      : 0;

    // Check if attempts are within window
    const attemptsInWindow =
      now - lastAttempt < ATTEMPT_WINDOW_MS ? attempts : 0;

    // Sync to memory cache
    if (attemptsInWindow > 0) {
      loginAttemptStore.set(email.toLowerCase(), {
        attempts: attemptsInWindow,
        lastAttempt,
        lockedUntil: null,
      });
    }

    return {
      isLocked: false,
      remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attemptsInWindow),
      lockoutEndsAt: null,
      lockoutRemainingSeconds: null,
    };
  } catch (error) {
    logger.error("[Login Protection] Failed to check database lockout", {
      component: "login-protection",
      error,
    });
    // Fall back to memory-only check
    return checkLockoutStatus(email);
  }
}

/**
 * Record a failed login attempt (in-memory only, synchronous)
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
 * Record a failed login attempt and persist to database
 * Use this for shop user logins to ensure lockout persists across restarts
 */
export async function recordFailedAttemptWithPersistence(
  email: string,
): Promise<LockoutStatus> {
  // First, update in-memory store
  const status = recordFailedAttempt(email.toLowerCase());

  // Then persist to database
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const now = new Date().toISOString();

    // Get current state from database
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("failed_login_attempts, last_failed_login_at")
      .eq("email", email.toLowerCase())
      .single();

    if (shop) {
      const lastAttempt = shop.last_failed_login_at
        ? new Date(shop.last_failed_login_at).getTime()
        : 0;
      const nowMs = Date.now();

      // Check if we should reset the counter (window expired)
      let newAttempts: number;
      if (nowMs - lastAttempt > ATTEMPT_WINDOW_MS) {
        newAttempts = 1;
      } else {
        newAttempts = (shop.failed_login_attempts || 0) + 1;
      }

      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(nowMs + LOCKOUT_DURATION_MS).toISOString()
        : null;

      await supabaseAdmin
        .from("shops")
        .update({
          failed_login_attempts: newAttempts,
          last_failed_login_at: now,
          locked_until: lockedUntil,
        })
        .eq("email", email.toLowerCase());

      logger.info("[Login Protection] Failed attempt persisted to database", {
        component: "login-protection",
        email: `${email.substring(0, 3)}***`,
        attempts: newAttempts,
        isLocked: shouldLock,
      });
    }
  } catch (error) {
    logger.error("[Login Protection] Failed to persist to database", {
      component: "login-protection",
      error,
    });
    // Memory store still has the data, so protection still works
  }

  return status;
}

/**
 * Clear failed attempts on successful login (in-memory only)
 */
export function clearFailedAttempts(identifier: string): void {
  loginAttemptStore.delete(identifier);
}

/**
 * Clear failed attempts and reset database columns
 * Use this for shop user logins to ensure clean state persists
 */
export async function clearFailedAttemptsWithPersistence(
  email: string,
): Promise<void> {
  // Clear in-memory store
  clearFailedAttempts(email.toLowerCase());

  // Clear database columns
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    await supabaseAdmin
      .from("shops")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_failed_login_at: null,
      })
      .eq("email", email.toLowerCase());

    logger.info("[Login Protection] Cleared failed attempts in database", {
      component: "login-protection",
      email: `${email.substring(0, 3)}***`,
    });
  } catch (error) {
    logger.error("[Login Protection] Failed to clear database lockout", {
      component: "login-protection",
      error,
    });
  }
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
