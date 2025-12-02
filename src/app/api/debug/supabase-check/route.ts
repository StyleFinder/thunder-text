import { NextResponse } from 'next/server'
import { guardDebugRoute } from '../_middleware-guard'

export async function GET() {
  const guardResponse = guardDebugRoute('/api/debug/supabase-check');
  if (guardResponse) return guardResponse;
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasCorrectProject: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('***REMOVED***'),
    currentProject: process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown',
    expectedProject: '***REMOVED***'
  })
}