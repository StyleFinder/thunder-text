import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    // Dynamic imports to avoid loading during build
    const { auth } = await import('@/lib/auth')
    const { ShopifyAPI } = await import('@/lib/shopify')
    const { supabaseAdmin } = await import('@/lib/supabase')
    
    // Check for development bypass or proper session
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'
    
    let session = null
    let storeData = null
    
    if (authBypass && shop) {
      // Development mode bypass
      console.log('Using auth bypass for development')
      storeData = {
        shop_domain: shop,
        access_token: process.env.SHOPIFY_ACCESS_TOKEN || 'dev-token'
      }
    } else {
      // Production authentication
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { generatedContent, productData, uploadedImages } = body

    if (!generatedContent) {
      return NextResponse.json(
        { error: 'Generated content is required' },
        { status: 400 }
      )
    }

    // Get store information
    let store = storeData
    if (!store && session?.user?.id) {
      const { data: dbStore, error: storeError } = await supabaseAdmin
        .from('stores')
        .select('shop_domain, access_token')
        .eq('id', session.user.id)
        .single()

      if (storeError || !dbStore) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }
      store = dbStore
    }

    if (!store) {
      return NextResponse.json(
        { error: 'Store configuration not found' },
        { status: 404 }
      )
    }

    console.log('Store config:', { 
      shop_domain: store.shop_domain, 
      access_token: store.access_token?.substring(0, 10) + '...' 
    })
    
    const shopify = new ShopifyAPI(store.shop_domain, store.access_token)

    // Prepare product data for Shopify
    const productInput = {
      title: generatedContent.title,
      description: generatedContent.description,
      status: 'DRAFT', // Create as draft first
      productType: productData?.category || 'General',
      vendor: store.shop_domain.split('.')[0], // Use shop name as vendor
      tags: generatedContent.keywords ? generatedContent.keywords.join(', ') : '',
      variants: [
        {
          price: generatedContent.suggestedPrice || "0.00",
          inventoryItem: {
            requiresShipping: true,
            tracked: false,
          },
        }
      ],
    }

    // TODO: Handle image uploads to Shopify
    // For now, we'll create the product without images
    // In production, you'd want to upload the images to Shopify first

    console.log('Creating product with input:', productInput)

    // Create product in Shopify
    const createResult = await shopify.createProduct(productInput)

    if (createResult.productCreate.userErrors?.length > 0) {
      console.error('Shopify product creation errors:', createResult.productCreate.userErrors)
      return NextResponse.json(
        { 
          error: 'Failed to create product in Shopify', 
          details: createResult.productCreate.userErrors 
        },
        { status: 400 }
      )
    }

    const createdProduct = createResult.productCreate.product
    console.log('Product created successfully:', createdProduct)

    // Create metafields for additional data
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
        value: JSON.stringify(generatedContent.keywords || []),
        type: 'json',
      },
      {
        namespace: 'thunder_text',
        key: 'bullet_points',
        value: JSON.stringify(generatedContent.bulletPoints || []),
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
    try {
      const metafieldPromises = metafields.map(metafield =>
        shopify.createProductMetafield(createdProduct.id, metafield)
      )
      await Promise.all(metafieldPromises)
      console.log('Metafields created successfully')
    } catch (metafieldError) {
      console.error('Error creating metafields:', metafieldError)
      // Continue anyway, metafields are not critical
    }

    // Upload images if provided
    if (uploadedImages && uploadedImages.length > 0) {
      try {
        console.log(`Uploading ${uploadedImages.length} image(s) to Shopify...`)
        for (const image of uploadedImages) {
          if (image.dataUrl) {
            const result = await shopify.createProductImage(
              createdProduct.id, 
              image.dataUrl,
              generatedContent.title
            )
            
            if (result.productCreateMedia.mediaUserErrors?.length > 0) {
              console.error('Shopify image upload errors:', result.productCreateMedia.mediaUserErrors)
            } else {
              console.log('Product image uploaded successfully')
            }
          }
        }
      } catch (imageError) {
        console.error('Error uploading product images:', imageError)
        // Continue anyway, images are not critical for product creation
      }
    } else {
      console.log('No images provided for upload')
    }

    // Store the generated data in our database (skip in development bypass mode)
    if (session?.user?.id) {
      try {
        await supabaseAdmin
          .from('products')
          .insert({
            store_id: session.user.id,
            shopify_product_id: createdProduct.id,
            generated_data: generatedContent,
            product_data: productData,
            status: 'completed',
          })
      } catch (dbError) {
        console.error('Error storing product in database:', dbError)
        // Continue anyway, the product was created in Shopify
      }
    } else {
      console.log('Skipping database storage in development mode')
    }

    return NextResponse.json({
      success: true,
      data: {
        product: createdProduct,
        shopifyUrl: `https://${store.shop_domain}/admin/products/${createdProduct.id.split('/').pop()}`,
        productId: createdProduct.id
      },
    })

  } catch (error) {
    console.error('Shopify product creation API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}