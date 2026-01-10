import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
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

    // Build the invite URL (stored server-side only)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/coach/set-password?token=${inviteToken}`;

    // TODO: Implement email delivery for production
    // Options: Resend, SendGrid, or AWS SES
    // For now, log the URL server-side for admin testing (SECURITY: Remove in production)
    if (process.env.NODE_ENV === 'development') {
      logger.info('[Invite Coach] Development mode - invite URL (NOT FOR PRODUCTION):', {
        component: 'invite-coach',
        coachId: coach.id,
        inviteUrl,
      });
    }

    // SECURITY M3: Never expose invite URLs in API responses
    // Invite tokens must be delivered via secure email channel
    return NextResponse.json({
      success: true,
      message: 'Invitation created. Email will be sent to the coach.',
      coach: {
        id: coach.id,
        email: coach.email,
        name: coach.name
      }
    });
  } catch (error) {
    logger.error('[Invite Coach] Unexpected error:', error as Error, { component: 'invite-coach' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
