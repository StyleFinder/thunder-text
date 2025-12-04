import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all coaches
    const { data: coaches, error } = await supabaseAdmin
      .from('coaches')
      .select('id, name, email, is_active, invited_at, password_set_at')
      .order('invited_at', { ascending: false });

    if (error) {
      logger.error('[Admin] Error fetching coaches:', error as Error, { component: 'coaches' });
      return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 });
    }

    return NextResponse.json({ coaches: coaches || [] });
  } catch (error) {
    logger.error('[Admin] Unexpected error:', error as Error, { component: 'coaches' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
