import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const state = searchParams.get('state');
  const hmac = searchParams.get('hmac');

  console.log('[Shopify Callback] Received:', { shop, code: code?.substring(0, 10), state, hmac: hmac?.substring(0, 10) });

  if (!code || !shop) {
    console.error('[Shopify Callback] Missing code or shop parameter');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=oauth_failed`);
  }

  // Verify HMAC (Shopify security check)
  if (hmac) {
    const params = new URLSearchParams(searchParams);
    params.delete('hmac');
    params.delete('signature');
    const message = params.toString();

    const generatedHash = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(message)
      .digest('hex');

    if (generatedHash !== hmac) {
      console.error('[Shopify Callback] HMAC verification failed');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=invalid_hmac`);
    }
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const { access_token, scope } = await tokenResponse.json();

    console.log('[Shopify Callback] Got access token for shop:', shop);

    // Create or update shop in database (Identity only)
    let shopId: string;

    const { data: existingShop } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shop)
      .single();

    if (existingShop) {
      shopId = existingShop.id;
      // Update existing shop metadata
      await supabaseAdmin
        .from('shops')
        .update({
          shop_type: 'shopify',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', shopId);

      console.log('[Shopify Callback] Updated existing shop identity:', shopId);
    } else {
      // Create new shop
      const { data: newShop, error: insertError } = await supabaseAdmin
        .from('shops')
        .insert({
          shop_domain: shop,
          shop_type: 'shopify',
          is_active: true
        })
        .select('id')
        .single();

      if (insertError || !newShop) {
        console.error('[Shopify Callback] Error creating shop:', insertError);
        throw insertError;
      }

      shopId = newShop.id;
      console.log('[Shopify Callback] Created new shop identity:', shopId);

      // Grant Default Trial Subscription (14 Days)
      // This ensures the "Gatekeeper" allows access immediately
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          shop_id: shopId,
          product: 'bundle_all', // Grant access to everything during trial
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString()
        });

      if (subError) {
        console.error('[Shopify Callback] Failed to create default subscription:', subError);
        // We don't throw here, as we want to complete the token save. 
        // The user just won't have access until we fix it or they pay.
      } else {
        console.log('[Shopify Callback] Granted 14-day trial subscription');
      }
    }

    // Note: Shopify is not stored in integrations table (only marketing platforms)
    // Shopify connection is tracked via the shops table is_active flag
    console.log('[Shopify Callback] Shopify connection established');

    // Set session cookie and redirect to welcome (social step)
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/welcome?step=social&shop=${shop}`);
    response.cookies.set('shopify_shop', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    console.log('[Shopify Callback] Set cookie and redirecting to /welcome?step=social&shop=' + shop);

    return response;
  } catch (error) {
    console.error('[Shopify Callback] Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=server_error`);
  }
}
