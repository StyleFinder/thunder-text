import { NextRequest, NextResponse } from 'next/server'
import { generateGoogleProductMetafields, generateGoogleVariantMetafields, validateGoogleMetafields } from '@/lib/google-metafields'

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
    const { ShopifyOfficialAPI } = await import('@/lib/shopify-official')
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
      // Use the configured test store and token for development
      const testStore = process.env.SHOPIFY_TEST_STORE || 'zunosai-staging-test-store'
      storeData = {
        shop_domain: `${testStore}.myshopify.com`,
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

    console.log('🔍 DEBUG: Request body productData:', JSON.stringify(productData, null, 2))
    console.log('🔍 DEBUG: productData?.sizing:', productData?.sizing)
    console.log('🔍 DEBUG: Sizing check result:', !!productData?.sizing)

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
    
    const shopify = new ShopifyOfficialAPI(store.shop_domain, store.access_token)

    // Infer category from generated content if not provided
    let finalCategory = productData?.category || 'Fashion & Apparel'
    
    // If no category provided, try to infer from AI-generated content
    if (!productData?.category || productData.category === 'Fashion & Apparel') {
      const { inferProductCategory } = await import('@/lib/category-inference')
      const inference = inferProductCategory(
        generatedContent.title,
        generatedContent.description,
        generatedContent.keywords,
        productData?.category
      )
      
      if (inference.confidence >= 0.6) {
        finalCategory = inference.category
        console.log('🎯 Category auto-assigned:', finalCategory, 'confidence:', inference.confidence.toFixed(2))
      } else {
        console.log('⚠️ Category confidence too low:', inference.confidence.toFixed(2), 'keeping default')
      }
    }

    // Map category to Shopify's standardized categories
    const { mapToShopifyCategory } = await import('@/lib/shopify-categories')
    console.log('🎯 About to map category:', finalCategory)
    const shopifyCategoryId = mapToShopifyCategory(finalCategory)
    
    // Extract sub-category from the full category path for Shopify productType
    let shopifyProductType = 'General'
    if (finalCategory) {
      // If category contains " > ", extract the part after it (sub-category)
      // Example: "Clothing > Tops" becomes "Tops"
      if (finalCategory.includes(' > ')) {
        shopifyProductType = finalCategory.split(' > ')[1]
      } else {
        // If no parent separator, use the category as-is
        shopifyProductType = finalCategory === 'Fashion & Apparel' ? 'General' : finalCategory
      }
    }
    
    console.log('🎯 Category mapping results:', {
      inferredCategory: finalCategory,
      shopifyCategoryId,
      shopifyProductType,
      willAddCategoryField: !!shopifyCategoryId
    })

    // Parse sizing data to get available sizes (for explicit variant creation)
    let sizeVariants = []
    if (productData?.sizing) {
      console.log('🔍 DEBUG: Processing sizing for explicit variants:', productData.sizing)
      
      if (productData.sizing.includes(' - ')) {
        console.log('🔍 DEBUG: Using range format')
        const [startSize, endSize] = productData.sizing.split(' - ')
        const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        const startIndex = allSizes.indexOf(startSize.toUpperCase())
        const endIndex = allSizes.indexOf(endSize.toUpperCase())
        
        if (startIndex !== -1 && endIndex !== -1) {
          sizeVariants = allSizes.slice(startIndex, endIndex + 1)
          console.log('🔍 DEBUG: Generated size range for variants:', sizeVariants)
        }
      } else if (productData.sizing.includes(',')) {
        console.log('🔍 DEBUG: Using comma-separated format')
        sizeVariants = productData.sizing.split(',').map(size => size.trim().toUpperCase())
        console.log('🔍 DEBUG: Generated sizes from comma format:', sizeVariants)
      } else {
        console.log('🔍 DEBUG: Using single size format')
        sizeVariants = [productData.sizing.toUpperCase()]
        console.log('🔍 DEBUG: Generated single size:', sizeVariants)
      }
    }

    // Prepare product data for Shopify (2025-01 API format) - Try productOptions with simple string format  
    const productInput = {
      title: generatedContent.title,
      descriptionHtml: generatedContent.description, 
      status: 'DRAFT',
      productType: shopifyProductType,
      vendor: store.shop_domain.split('.')[0],
      tags: generatedContent.keywords ? generatedContent.keywords : [],
      // Add category assignment for Shopify Admin interface using correct 2025-01 API field
      ...(shopifyCategoryId ? { category: shopifyCategoryId } : {}),
      // Use correct productOptions format with proper key-value objects
      ...(sizeVariants.length > 0 ? {
        productOptions: [{
          name: 'Size',
          values: sizeVariants.map(size => ({ name: size })) // Correct object format
        }]
      } : {})
    }

    // TODO: Handle image uploads to Shopify
    // For now, we'll create the product without images
    // In production, you'd want to upload the images to Shopify first

    console.log('Creating product with input:', JSON.stringify(productInput, null, 2))

    // Create product in Shopify
    const createResult = await shopify.createProduct(productInput)

    // Handle authentication and API errors
    if (createResult.errors) {
      console.error('Shopify API error:', createResult.errors)
      return NextResponse.json(
        { 
          error: 'Shopify API authentication failed', 
          details: createResult.errors.message || 'Invalid credentials or permissions'
        },
        { status: 401 }
      )
    }

    if (createResult.data?.productCreate?.userErrors?.length > 0) {
      console.error('Shopify product creation errors:', createResult.data.productCreate.userErrors)
      return NextResponse.json(
        { 
          error: 'Failed to create product in Shopify', 
          details: createResult.data.productCreate.userErrors 
        },
        { status: 400 }
      )
    }

    const createdProduct = createResult.data?.productCreate?.product
    
    if (!createdProduct) {
      console.error('No product returned from Shopify API')
      return NextResponse.json(
        { 
          error: 'Product creation failed', 
          details: 'No product data returned from Shopify'
        },
        { status: 500 }
      )
    }

    // Create metafields for additional data
    const thunderTextMetafields = [
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

    // Generate Google Shopping metafields
    console.log('🔍 Generating Google Shopping metafields for:', finalCategory)
    console.log('🧵 Fabric material from frontend:', productData.fabricMaterial)
    console.log('🧵 Description for material inference:', generatedContent.description?.substring(0, 200) + '...')
    
    const googleMetafields = generateGoogleProductMetafields(
      finalCategory,
      productInput.productType,
      generatedContent.description,
      {
        product_highlights: generatedContent.bulletPoints || generatedContent.keywords,
        color: productData.color,
        material: productData.fabricMaterial
      }
    )

    // Validate Google metafields
    const validation = validateGoogleMetafields(googleMetafields)
    if (validation.warnings.length > 0) {
      console.log('⚠️ Google metafields warnings:', validation.warnings)
    }
    if (!validation.isValid) {
      console.error('❌ Google metafields validation failed:', validation.errors)
    }

    // Combine all metafields
    const metafields = [...thunderTextMetafields, ...googleMetafields]
    console.log('📊 Total metafields to create:', metafields.length)

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

    // Create explicit variants for each size (since productOptions alone don't create variants in 2025-01 API)
    if (sizeVariants.length > 0) {
      console.log('🔍 DEBUG: Creating explicit variants for sizes:', sizeVariants)
      
      try {
        // Skip the first variant since Shopify auto-creates it from productOptions
        const additionalVariants = sizeVariants.slice(1).map((size: string) => ({
          optionValues: [
            {
              optionName: 'Size',
              name: size
            }
          ],
          price: '0.00', // Default price - can be updated later in Shopify admin
          inventoryPolicy: 'DENY'
        }))

        console.log('🔍 DEBUG: Additional variant input data:', JSON.stringify(additionalVariants, null, 2))
        
        let variantResult = null
        if (additionalVariants.length > 0) {
          variantResult = await shopify.createProductVariants(createdProduct.id, additionalVariants)
        
          if (variantResult.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
            console.error('⚠️ Variant creation had errors:', variantResult.data.productVariantsBulkCreate.userErrors)
            // Continue anyway, product was created successfully
          } else {
            console.log('✅ Additional size variants created successfully:', additionalVariants.length, 'variants')
            
            // Create Google metafields for variants
            try {
              console.log('🔍 Creating Google metafields for variants...')
              const createdVariants = variantResult.data?.productVariantsBulkCreate?.productVariants || []
              
              for (const variant of createdVariants) {
                if (variant?.id) {
                  const variantTitle = variant.title || ''
                  const googleVariantMetafields = generateGoogleVariantMetafields(
                    variantTitle,
                    productData.color, // Use product color as default
                    undefined, // Let function extract size from title
                    undefined  // Material will be inherited from product
                  )
                  
                  if (googleVariantMetafields.length > 0) {
                    const variantMetafieldPromises = googleVariantMetafields.map(metafield =>
                      shopify.createProductVariantMetafield(variant.id, metafield)
                    )
                    await Promise.all(variantMetafieldPromises)
                    console.log(`✅ Google metafields created for variant: ${variantTitle}`)
                  }
                }
              }
            } catch (variantMetafieldError) {
              console.error('⚠️ Error creating variant metafields:', variantMetafieldError)
              // Continue anyway, variants were created successfully
            }
          }
        } else {
          console.log('🔍 DEBUG: No additional variants to create (only one size)')
        }
      } catch (variantError) {
        console.error('⚠️ Error creating size variants (product still created):', variantError)
        // Continue anyway, product was created successfully
      }
    }

    // Upload images using the corrected GraphQL media upload approach
    if (uploadedImages && uploadedImages.length > 0) {
      console.log(`📤 Starting image upload process for ${uploadedImages.length} image(s)...`)
      
      try {
        for (const [index, imageData] of uploadedImages.entries()) {
          console.log(`🔄 Uploading image ${index + 1}/${uploadedImages.length}...`)
          
          const altText = `${generatedContent.title} - Image ${index + 1}`
          const uploadResult = await shopify.createProductImage(
            createdProduct.id,
            imageData,
            altText
          )
          
          if (uploadResult.success) {
            console.log(`✅ Image ${index + 1} uploaded successfully`)
          } else {
            console.error(`❌ Failed to upload image ${index + 1}:`, uploadResult)
          }
        }
        
        console.log('🎉 Image upload process completed!')
        
      } catch (imageError) {
        console.error('⚠️ Error during image upload process:', imageError)
        console.log('Product created successfully, but images failed to upload. Images can be uploaded manually in Shopify admin.')
        // Continue anyway, the product was created successfully
      }
    } else {
      console.log('ℹ️ No images to upload')
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