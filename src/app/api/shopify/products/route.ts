import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ShopifyAPI } from '@/lib/shopify'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get store information
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('shop_domain, access_token')
      .eq('id', session.user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const shopify = new ShopifyAPI(store.shop_domain, store.access_token)
    
    // Get URL parameters for pagination
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '10')

    const products = await shopify.getProducts(limit, cursor || undefined)

    return NextResponse.json({
      success: true,
      data: products,
    })

  } catch (error) {
    console.error('Shopify products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, generatedContent } = body

    if (!productId || !generatedContent) {
      return NextResponse.json(
        { error: 'Product ID and generated content are required' },
        { status: 400 }
      )
    }

    // Get store information
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('shop_domain, access_token')
      .eq('id', session.user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const shopify = new ShopifyAPI(store.shop_domain, store.access_token)

    // Update product with generated content
    const updateResult = await shopify.updateProduct(productId, {
      title: generatedContent.title,
      description: generatedContent.description,
    })

    if (updateResult.productUpdate.userErrors?.length > 0) {
      return NextResponse.json(
        { error: 'Failed to update product', details: updateResult.productUpdate.userErrors },
        { status: 400 }
      )
    }

    // Create metafields for SEO data
    const metafields = [
      {
        namespace: 'thunder_text',
        key: 'meta_description',
        value: generatedContent.metaDescription,
        type: 'single_line_text_field',
      },
      {
        namespace: 'thunder_text',
        key: 'keywords',
        value: JSON.stringify(generatedContent.keywords),
        type: 'json',
      },
      {
        namespace: 'thunder_text',
        key: 'bullet_points',
        value: JSON.stringify(generatedContent.bulletPoints),
        type: 'json',
      },
      {
        namespace: 'seo',
        key: 'meta_description',
        value: generatedContent.metaDescription,
        type: 'single_line_text_field',
      }
    ]

    // Create metafields
    const metafieldPromises = metafields.map(metafield =>
      shopify.createProductMetafield(productId, metafield)
    )

    await Promise.all(metafieldPromises)

    // Store the generated data in our database
    await supabaseAdmin
      .from('products')
      .upsert({
        store_id: session.user.id,
        shopify_product_id: productId,
        generated_data: generatedContent,
        status: 'completed',
      }, {
        onConflict: 'store_id,shopify_product_id',
      })

    return NextResponse.json({
      success: true,
      data: updateResult.productUpdate.product,
    })

  } catch (error) {
    console.error('Shopify product update API error:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}