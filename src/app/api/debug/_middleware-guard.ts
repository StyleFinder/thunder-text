/**
 * Debug Route Guard
 *
 * Protect all debug routes from production access.
 * Import and use this in every debug route handler.
 */

import { NextResponse } from 'next/server';
import { isDebugEnabled } from '@/lib/env-config';

export function guardDebugRoute(routeName: string) {
  if (!isDebugEnabled) {
    return NextResponse.json(
      {
        error: 'Debug routes are not available in production',
        route: routeName,
        hint: 'Set ENABLE_DEBUG_ROUTES=true in environment to enable (use with caution)'
      },
      { status: 403 }
    );
  }
  return null; // Allow access
}
