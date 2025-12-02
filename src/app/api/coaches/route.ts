import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/coaches
 * Fetches all active coaches from the database
 * Returns: { success: boolean, coaches: Array<{ name: string, email: string }> }
 */
export async function GET() {
  try {

    // Fetch all coaches, ordered by name
    const { data: coaches, error } = await supabase
      .from('coaches')
      .select('name, email')
      .order('name');

    if (error) {
      logger.error('Error fetching coaches:', error as Error, { component: 'coaches' });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch coaches' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      coaches: coaches || [],
    });
  } catch (error) {
    logger.error('Error in GET /api/coaches:', error as Error, { component: 'coaches' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
