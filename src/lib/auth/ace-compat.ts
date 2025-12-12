/**
 * ACE Compatibility Auth Wrapper
 *
 * Provides same interface as ACE's requireApp() for ThunderText
 * Uses NextAuth session-based authentication with Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { logger } from '@/lib/logger'

/**
 * Session role type from next-auth.d.ts
 */
type SessionRole = 'shop' | 'coach' | 'admin';

/**
 * Role parameter type - includes 'user' as legacy alias for 'shop'
 */
type RequiredRole = SessionRole | 'user';

/**
 * Extended request type with user context (ACE-compatible)
 */
export interface AuthenticatedRequest extends NextRequest {
  user: {
    userId: string;
    shop: string | undefined;
    role: SessionRole;
    email: string;
  };
}

/**
 * Route handler type - supports context parameter for dynamic routes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: AuthenticatedRequest, context?: any) => Promise<Response>;

/**
 * Normalize role: 'user' is legacy alias for 'shop'
 */
function normalizeRole(role: RequiredRole): SessionRole {
  return role === 'user' ? 'shop' : role;
}

/**
 * Require authentication with specific role
 *
 * Usage (similar to ACE's requireApp):
 * ```typescript
 * export const GET = requireAuth('user')(async (req) => {
 *   const { userId, shop, email } = req.user;
 *   // ... route logic
 * });
 * ```
 *
 * @param requiredRole - Required user role ('user'/'shop', 'coach', or 'admin')
 * @returns Wrapped route handler with auth enforcement
 */
export function requireAuth(requiredRole: RequiredRole = 'user') {
  const normalizedRole = normalizeRole(requiredRole);

  return function (handler: RouteHandler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (req: NextRequest, context?: any): Promise<Response> => {
      try {
        // Get NextAuth session
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Unauthorized - Please sign in' },
            { status: 401 }
          );
        }

        // Check role authorization
        const userRole = session.user.role;
        const roleHierarchy: Record<SessionRole, number> = { shop: 0, coach: 1, admin: 2 };

        if (roleHierarchy[userRole] < roleHierarchy[normalizedRole]) {
          return NextResponse.json(
            { error: 'Forbidden - Insufficient permissions' },
            { status: 403 }
          );
        }

        // Create authenticated request with user context
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = {
          userId: session.user.id,
          shop: session.user.shopDomain,
          role: userRole,
          email: session.user.email || '',
        };

        // Call the wrapped handler
        return await handler(authenticatedReq, context);
      } catch (error) {
        logger.error('Auth error:', error as Error, { component: 'ace-compat' });
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 }
        );
      }
    };
  };
}
