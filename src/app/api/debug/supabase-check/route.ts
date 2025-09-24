import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasCorrectProject: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('***REMOVED***'),
    currentProject: process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown',
    expectedProject: '***REMOVED***'
  })
}