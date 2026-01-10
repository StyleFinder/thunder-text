/**
 * Debug Route Guard
 *
 * SECURITY: Protects all debug routes from production and preview access.
 * Debug routes expose sensitive information (env vars, tokens, auth state)
 * and must NEVER be accessible in production or preview environments.
 *
 * Import and use this in every debug route handler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDebugEnabled, isProduction, isPreviewEnvironment, validateDebugSecret } from '@/lib/env-config';

/**
 * Guard debug route access
 *
 * @param routeName - Name of the route for logging
 * @param request - Optional request object to check for debug secret header
 * @returns NextResponse if blocked, null if allowed
 */
export function guardDebugRoute(routeName: string, request?: NextRequest) {
  // SECURITY: Double-check production environment
  if (isProduction) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  // SECURITY: Block preview/staging environments
  if (isPreviewEnvironment) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  if (!isDebugEnabled) {
    return NextResponse.json(
      {
        error: 'Debug routes are only available in development mode',
        route: routeName,
      },
      { status: 403 }
    );
  }

  // SECURITY: If debug secret is configured, require it in header
  if (request) {
    const providedSecret = request.headers.get('x-debug-secret');
    if (!validateDebugSecret(providedSecret)) {
      return NextResponse.json(
        { error: 'Invalid debug secret' },
        { status: 401 }
      );
    }
  }

  return null; // Allow access
}
