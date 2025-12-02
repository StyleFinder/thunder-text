import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import bcrypt from 'bcrypt';
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Lookup coach by invite token
    const { data: coach, error: fetchError } = await supabaseAdmin
      .from('coaches')
      .select('*')
      .eq('invite_token', token)
      .single();

    if (fetchError || !coach) {
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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update coach with password and activate account
    const { error: updateError } = await supabaseAdmin
      .from('coaches')
      .update({
        password_hash: passwordHash,
        password_set_at: new Date().toISOString(),
        is_active: true,
        invite_token: null // Clear the token
      })
      .eq('id', coach.id);

    if (updateError) {
      logger.error('[Set Password] Error updating coach:', updateError as Error, { component: 'set-password' });
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }


    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Set Password] Unexpected error:', error as Error, { component: 'set-password' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
