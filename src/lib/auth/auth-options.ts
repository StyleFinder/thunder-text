import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import {
  checkLockoutStatus,
  checkLockoutStatusFromDatabase,
  recordFailedAttempt,
  recordFailedAttemptWithPersistence,
  clearFailedAttempts,
  clearFailedAttemptsWithPersistence,
} from "@/lib/security/login-protection";
import {
  isTwoFactorEnabled,
  verifyTwoFactorCode,
} from "@/lib/security/two-factor-auth";
import { logger } from "@/lib/logger";

// Lazy import supabaseAdmin to avoid module load failures
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

/**
 * Token Expiration Configuration
 *
 * SECURITY: Shorter JWT expiration reduces window for token theft exploitation
 * - Access token: 15 minutes (short-lived)
 * - Session: 7 days (refresh via re-authentication or session extension)
 */
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        userType: { label: "User Type", type: "text" }, // 'shop' | 'coach' | 'admin'
        totpCode: { label: "TOTP Code", type: "text" }, // 2FA code for admins
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // SECURITY: Check if account is locked due to failed attempts
        // For shop users, check database first to persist across restarts
        let lockoutStatus = checkLockoutStatus(credentials.email);
        if (credentials.userType === "shop") {
          // Shop users have database-backed lockout for persistence
          lockoutStatus = await checkLockoutStatusFromDatabase(
            credentials.email,
          );
        }
        if (lockoutStatus.isLocked) {
          // Throw error with lockout info (caught by NextAuth error handler)
          throw new Error(
            `ACCOUNT_LOCKED:${lockoutStatus.lockoutRemainingSeconds}`,
          );
        }

        // Get supabase admin client
        const supabaseAdmin = await getSupabaseAdmin();

        // Check user type: admin, coach, or shop
        if (credentials.userType === "admin") {
          // Lookup in super_admins table
          const { data: admin, error } = await supabaseAdmin
            .from("super_admins")
            .select("*")
            .eq("email", credentials.email)
            .eq("is_active", true)
            .single();

          if (error || !admin) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            admin.password_hash,
          );
          if (!isValid) {
            // SECURITY: Record failed attempt
            recordFailedAttempt(credentials.email);
            return null;
          }

          // SECURITY: Check if 2FA is enabled for this admin
          const twoFactorEnabled = await isTwoFactorEnabled(admin.id);

          if (twoFactorEnabled) {
            // 2FA is enabled - require TOTP code
            if (!credentials.totpCode) {
              // Signal to frontend that 2FA code is required
              throw new Error("2FA_REQUIRED");
            }

            // Verify the TOTP code
            const isValidCode = await verifyTwoFactorCode(
              admin.id,
              credentials.totpCode,
            );

            if (!isValidCode) {
              // Record failed attempt for invalid 2FA code
              recordFailedAttempt(credentials.email);
              throw new Error("2FA_INVALID");
            }
          }

          // SECURITY: Clear failed attempts on successful login
          clearFailedAttempts(credentials.email);

          logger.info("[Auth] Admin login successful", {
            component: "auth",
            userId: admin.id,
            twoFactorUsed: twoFactorEnabled,
          });

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: "admin",
            twoFactorEnabled,
          };
        } else if (credentials.userType === "coach") {
          // Lookup in coaches table
          const { data: coach, error } = await supabaseAdmin
            .from("coaches")
            .select("*")
            .eq("email", credentials.email)
            .eq("is_active", true)
            .single();

          if (error || !coach || !coach.password_hash) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            coach.password_hash,
          );
          if (!isValid) {
            // SECURITY: Record failed attempt
            recordFailedAttempt(credentials.email);
            return null;
          }

          // SECURITY: Clear failed attempts on successful login
          clearFailedAttempts(credentials.email);
          return {
            id: coach.id,
            email: coach.email,
            name: coach.name,
            role: "coach",
          };
        } else if (credentials.userType === "shop") {
          // Shop users authenticate with email/password
          // Note: We don't filter by is_active here - users should be able to log in
          // even if their Shopify app was uninstalled. The dashboard will redirect
          // them to the disconnected page where they can reconnect.
          const { data: shop, error } = await supabaseAdmin
            .from("shops")
            .select("*")
            .eq("email", credentials.email.toLowerCase())
            .single();

          if (error || !shop || !shop.password_hash) {
            return null;
          }

          logger.info("[Auth] Attempting password verification", {
            component: "auth",
            email: credentials.email,
            hasPasswordHash: !!shop.password_hash,
            hashLength: shop.password_hash?.length,
          });

          const isValid = await bcrypt.compare(
            credentials.password,
            shop.password_hash,
          );

          logger.info("[Auth] Password verification result", {
            component: "auth",
            email: credentials.email,
            isValid,
          });

          if (!isValid) {
            // SECURITY: Record failed attempt with database persistence
            await recordFailedAttemptWithPersistence(credentials.email);
            return null;
          }

          // SECURITY: Clear failed attempts on successful login (with persistence)
          await clearFailedAttemptsWithPersistence(credentials.email);

          // Check if Shopify is connected (has access token and real domain)
          const hasShopifyLinked = !!(
            shop.shopify_access_token &&
            shop.shop_domain &&
            !shop.shop_domain.startsWith("pending-")
          );

          logger.info("[Auth] Shop user login successful", {
            component: "auth",
            userId: shop.id,
            hasShopifyLinked,
          });

          return {
            id: shop.id,
            email: shop.email,
            name: shop.store_name || shop.display_name || shop.email,
            role: "shop",
            // UUID-based routing: shopId is primary identifier
            shopId: shop.id,
            shopDomain: hasShopifyLinked ? shop.shop_domain : undefined,
            hasShopifyLinked,
          };
        } else {
          // Unknown user type
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // UUID-based routing: shopId is primary, shopDomain kept for compatibility
        token.shopId = user.shopId;
        token.shopDomain = user.shopDomain;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.hasShopifyLinked = user.hasShopifyLinked;
        token.staffRole = user.staffRole;
        // SECURITY: Track when token was issued for expiration checks
        token.accessTokenIssuedAt = Math.floor(Date.now() / 1000);
      }

      // SECURITY: Check if access token has expired (15 min)
      // If expired, the frontend should refresh the session or re-authenticate
      const now = Math.floor(Date.now() / 1000);
      const issuedAt = (token.accessTokenIssuedAt as number) || now;
      const tokenAge = now - issuedAt;

      if (tokenAge > ACCESS_TOKEN_MAX_AGE) {
        // Mark token as expired - client should refresh
        token.accessTokenExpired = true;

        // For admins, we could require re-authentication
        // For regular users, we can auto-refresh within session window
        if (trigger === "update" && token.role !== "admin") {
          // Refresh the access token for non-admin users
          token.accessTokenIssuedAt = now;
          token.accessTokenExpired = false;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        // UUID-based routing: shopId is primary, shopDomain kept for compatibility
        session.user.shopId = token.shopId;
        session.user.shopDomain = token.shopDomain;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
        session.user.hasShopifyLinked = token.hasShopifyLinked as boolean;
        session.user.staffRole =
          (token.staffRole as "owner" | "staff") || "owner";
        // SECURITY: Expose token status to client for refresh handling
        session.accessTokenExpired =
          (token.accessTokenExpired as boolean) || false;
      }
      return session;
    },
  },

  pages: {
    // All users can sign in with credentials, then connect Shopify
    signIn: "/auth/login",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    // SECURITY: Session window is 7 days, but access tokens expire in 15 min
    // This allows for session persistence while requiring frequent token refresh
    maxAge: SESSION_MAX_AGE,
    // Update session every 5 minutes to allow token refresh
    updateAge: 5 * 60,
  },

  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  // SECURITY: Event handlers for audit logging
  events: {
    async signIn({ user }) {
      logger.info("[Auth] User signed in", {
        component: "auth",
        userId: user.id,
        role: user.role,
      });
    },
    async signOut({ token }) {
      logger.info("[Auth] User signed out", {
        component: "auth",
        userId: token?.id as string,
      });
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
