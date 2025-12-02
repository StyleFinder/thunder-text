import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/coach/favorites/all
 * Fetches all coaches' favorites grouped by shop_id
 * Returns: { success: boolean, favorites: Array<{ shop_id: string, coach_emails: string[] }> }
 */
export async function GET() {
  try {

    // Fetch all coach favorites
    const { data: allFavorites, error } = await supabase
      .from('coach_favorites')
      .select('shop_id, coach_email');

    if (error) {
      logger.error('Error fetching all favorites:', error as Error, { component: 'all' });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    // Group by shop_id
    const groupedFavorites = new Map<string, string[]>();

    allFavorites?.forEach((fav) => {
      if (!groupedFavorites.has(fav.shop_id)) {
        groupedFavorites.set(fav.shop_id, []);
      }
      groupedFavorites.get(fav.shop_id)!.push(fav.coach_email);
    });

    // Convert Map to array format
    const favoritesArray = Array.from(groupedFavorites.entries()).map(
      ([shop_id, coach_emails]) => ({
        shop_id,
        coach_emails,
      })
    );

    return NextResponse.json({
      success: true,
      favorites: favoritesArray,
    });
  } catch (error) {
    logger.error('Error in GET /api/coach/favorites/all:', error as Error, { component: 'all' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
