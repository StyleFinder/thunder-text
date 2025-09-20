import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shopify-Shop-Domain, X-Shopify-Access-Token',
  };

  try {
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain');
    
    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Missing shop domain' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get store ID from shop domain
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get templates for this store (both custom and default)
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('category_templates')
      .select(`
        id,
        name,
        category,
        content,
        is_default,
        created_at
      `)
      .or(`store_id.eq.${store.id},is_default.eq.true`)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (templatesError) {
      console.error('Templates query error:', templatesError);
      throw templatesError;
    }

    // Format templates for extension use
    const formattedTemplates = templates?.map(template => ({
      id: template.id,
      name: template.name,
      category: template.category,
      isDefault: template.is_default,
      content: template.content,
    })) || [];

    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Extension templates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shopify-Shop-Domain, X-Shopify-Access-Token',
    },
  });
}