import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    // Check if user is a coach
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized - Coach access only' }, { status: 401 });
    }

    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const storeFilter = searchParams.get('store');
    const platformFilter = searchParams.get('platform');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const searchTerm = searchParams.get('search');

    // Build query
    let query = supabaseAdmin
      .from('aie_ad_variants')
      .select(`
        *,
        ad_request:aie_ad_requests!inner(
          shop_id,
          platform,
          goal,
          created_at,
          shop:shops!inner(
            shop_domain,
            display_name,
            store_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (storeFilter) {
      query = query.eq('ad_request.shop_id', storeFilter);
    }

    if (platformFilter) {
      query = query.eq('ad_request.platform', platformFilter);
    }

    if (minScore) {
      query = query.gte('predicted_score', parseFloat(minScore));
    }

    if (maxScore) {
      query = query.lte('predicted_score', parseFloat(maxScore));
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: variants, error } = await query;

    if (error) {
      logger.error('[Ad Vault] Error fetching ad variants:', error as Error, { component: 'ad-vault' });
      return NextResponse.json({ error: 'Failed to fetch ad variants' }, { status: 500 });
    }

    // Apply text search filter (client-side for now)
    let filteredVariants = variants || [];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredVariants = filteredVariants.filter((v: any) =>
        v.headline?.toLowerCase().includes(term) ||
        v.primary_text?.toLowerCase().includes(term) ||
        v.description?.toLowerCase().includes(term)
      );
    }

    return NextResponse.json({ variants: filteredVariants });
  } catch (error) {
    logger.error('[Ad Vault] Unexpected error:', error as Error, { component: 'ad-vault' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
