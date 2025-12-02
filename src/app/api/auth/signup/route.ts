import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import bcrypt from 'bcrypt';
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const { email, password, shopName } = await req.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create shop
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .insert({
        shop_domain: email, // Use email as domain for standalone users
        shop_type: 'standalone',
        email,
        password_hash: passwordHash,
        display_name: shopName || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      logger.error('[Signup] Error creating shop:', error as Error, { component: 'signup' });
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }


    return NextResponse.json({ success: true, shop: { id: shop.id, email: shop.email } });
  } catch (error) {
    logger.error('[Signup] Unexpected error:', error as Error, { component: 'signup' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
