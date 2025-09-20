import { NextRequest, NextResponse } from 'next/server';
import { generateProductDescription } from '@/lib/openai-extension';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// Request validation schema
const ExtensionGenerationRequestSchema = z.object({
  productData: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    images: z.array(z.object({
      url: z.string().url(),
      altText: z.string().optional(),
    })),
    variants: z.array(z.object({
      title: z.string(),
      price: z.string(),
    })),
    tags: z.array(z.string()),
    productType: z.string(),
    vendor: z.string(),
  }),
  templateId: z.string(),
  customization: z.object({
    fabricMaterial: z.string().optional(),
    occasionUse: z.string().optional(),
    targetAudience: z.string().optional(),
    keyFeatures: z.string().optional(),
    additionalNotes: z.string().optional(),
  }),
  images: z.array(z.string().url()).optional(),
  productTitle: z.string(),
  productType: z.string(),
  tags: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ExtensionGenerationRequestSchema.parse(body);

    // Get store information
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id, current_usage, usage_limits, plan')
      .eq('shop_domain', shopDomain)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check usage limits
    if (store.current_usage >= store.usage_limits) {
      return NextResponse.json(
        { error: 'Usage limit exceeded for your current plan' },
        { status: 429, headers: corsHeaders }
      );
    }

    // Get template content
    const { data: template, error: templateError } = await supabaseAdmin
      .from('category_templates')
      .select('content, name, category')
      .eq('id', validatedData.templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Prepare generation request
    const generationRequest = {
      images: validatedData.images || validatedData.productData.images.map(img => img.url),
      productTitle: validatedData.productTitle,
      productType: validatedData.productType,
      tags: validatedData.tags,
      fabricMaterial: validatedData.customization.fabricMaterial || '',
      occasionUse: validatedData.customization.occasionUse || '',
      targetAudience: validatedData.customization.targetAudience || '',
      keyFeatures: validatedData.customization.keyFeatures || '',
      additionalNotes: validatedData.customization.additionalNotes || '',
      template: template.content,
      category: template.category,
      storeId: store.id,
      productData: validatedData.productData,
    };

    // Generate description using OpenAI
    const result = await generateProductDescription(generationRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Generation failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update usage tracking
    const { error: usageUpdateError } = await supabaseAdmin
      .from('stores')
      .update({ 
        current_usage: store.current_usage + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id);

    if (usageUpdateError) {
      console.error('Failed to update usage:', usageUpdateError);
    }

    // Track generation history
    const { error: historyError } = await supabaseAdmin
      .from('generation_history')
      .insert({
        store_id: store.id,
        product_id: validatedData.productData.id,
        template_id: validatedData.templateId,
        input_data: generationRequest,
        output_data: result.data,
        ai_tokens_used: result.data.tokenUsage?.total || 0,
        ai_cost: result.data.cost || 0,
        source: 'admin_extension',
      });

    if (historyError) {
      console.error('Failed to track generation history:', historyError);
    }

    return NextResponse.json({
      success: true,
      data: {
        description: result.data.description,
        tokenUsage: result.data.tokenUsage,
        cost: result.data.cost,
      },
      usage: {
        current: store.current_usage + 1,
        limit: store.usage_limits,
        remaining: store.usage_limits - (store.current_usage + 1),
      },
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Extension generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400, headers: corsHeaders }
      );
    }

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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shopify-Shop-Domain, X-Shopify-Access-Token',
    },
  });
}