import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email } = await req.json();

    // Validation
    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
    }

    // Check if coach already exists
    const { data: existing } = await supabaseAdmin
      .from('coaches')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Coach with this email already exists' }, { status: 409 });
    }

    // Generate invite token (secure random string)
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create coach invitation
    const { data: coach, error } = await supabaseAdmin
      .from('coaches')
      .insert({
        name,
        email,
        invite_token: inviteToken,
        invite_expires_at: expiresAt.toISOString(),
        invited_by: session.user.id,
        invited_at: new Date().toISOString(),
        is_active: false // Inactive until password is set
      })
      .select()
      .single();

    if (error) {
      logger.error('[Invite Coach] Error creating coach:', error as Error, { component: 'invite-coach' });
      return NextResponse.json({ error: 'Failed to create coach invitation' }, { status: 500 });
    }

    // TODO: Send email with invitation link
    // For now, we'll just return the invitation URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/coach/set-password?token=${inviteToken}`;


    return NextResponse.json({
      success: true,
      coach: {
        id: coach.id,
        email: coach.email,
        name: coach.name
      },
      inviteUrl // Return this for now, remove when email is implemented
    });
  } catch (error) {
    logger.error('[Invite Coach] Unexpected error:', error as Error, { component: 'invite-coach' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
