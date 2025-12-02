import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch coach's favorite stores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coachEmail = searchParams.get('coach_email');

    if (!coachEmail) {
      return NextResponse.json(
        { error: 'coach_email parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('coach_favorites')
      .select('shop_id')
      .eq('coach_email', coachEmail);

    if (error) {
      logger.error('Error fetching favorites:', error as Error, { component: 'favorites' });
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    const favoriteShopIds = data.map(f => f.shop_id);

    return NextResponse.json({
      success: true,
      favorites: favoriteShopIds,
    });
  } catch (error) {
    logger.error('Error in GET /api/coach/favorites:', error as Error, { component: 'favorites' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a store to favorites
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coach_email, shop_id } = body;

    if (!coach_email || !shop_id) {
      return NextResponse.json(
        { error: 'coach_email and shop_id are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('coach_favorites')
      .insert({
        coach_email,
        shop_id,
      });

    if (error) {
      // Check if it's a unique constraint violation (already favorited)
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Store is already in favorites',
        });
      }

      logger.error('Error adding favorite:', error as Error, { component: 'favorites' });
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Store added to favorites',
    });
  } catch (error) {
    logger.error('Error in POST /api/coach/favorites:', error as Error, { component: 'favorites' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a store from favorites
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coachEmail = searchParams.get('coach_email');
    const shopId = searchParams.get('shop_id');

    if (!coachEmail || !shopId) {
      return NextResponse.json(
        { error: 'coach_email and shop_id parameters are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('coach_favorites')
      .delete()
      .eq('coach_email', coachEmail)
      .eq('shop_id', shopId);

    if (error) {
      logger.error('Error removing favorite:', error as Error, { component: 'favorites' });
      return NextResponse.json(
        { error: 'Failed to remove favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Store removed from favorites',
    });
  } catch (error) {
    logger.error('Error in DELETE /api/coach/favorites:', error as Error, { component: 'favorites' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
