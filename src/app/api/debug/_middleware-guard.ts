/**
 * Debug Route Guard
 *
 * SECURITY: Protects all debug routes from production access.
 * Debug routes expose sensitive information (env vars, tokens, auth state)
 * and must NEVER be accessible in production environments.
 *
 * Import and use this in every debug route handler.
 */

import { NextResponse } from 'next/server';
import { isDebugEnabled, isProduction } from '@/lib/env-config';

export function guardDebugRoute(routeName: string) {
  // SECURITY: Double-check production environment
  if (isProduction) {
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
  return null; // Allow access
}
