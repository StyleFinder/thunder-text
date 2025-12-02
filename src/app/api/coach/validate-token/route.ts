import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Lookup coach by invite token
    const { data: coach, error } = await supabaseAdmin
      .from('coaches')
      .select('id, email, invite_expires_at, password_set_at')
      .eq('invite_token', token)
      .single();

    if (error || !coach) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    // Check if password already set
    if (coach.password_set_at) {
      return NextResponse.json({ error: 'Password already set for this account' }, { status: 400 });
    }

    // Check if token expired
    const expiresAt = new Date(coach.invite_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      email: coach.email
    });
  } catch (error) {
    logger.error('[Validate Token] Unexpected error:', error as Error, { component: 'validate-token' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
