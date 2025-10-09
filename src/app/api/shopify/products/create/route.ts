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
    const { ShopifyOfficialAPI } = await import('@/lib/shopify-official')
    const { getShopToken } = await import('@/lib/shopify/token-manager')

    // Get shop from query parameters
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')

    console.log('🛒 [PRODUCT-CREATE] Starting product creation request:', {
      shop,
      hasShop: !!shop,
      requestUrl: request.url,
      timestamp: new Date().toISOString()
    })

    if (!shop) {
      console.error('❌ [PRODUCT-CREATE] Missing shop parameter')
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Get access token from database (obtained via Token Exchange)
    console.log('🔑 [PRODUCT-CREATE] Retrieving access token from database for shop:', shop)
    const tokenResult = await getShopToken(shop)

    console.log('🔑 [PRODUCT-CREATE] Token retrieval result:', {
      success: tokenResult.success,
      hasAccessToken: !!tokenResult.accessToken,
      accessTokenLength: tokenResult.accessToken?.length,
      error: tokenResult.error,
      shop,
      fullShopDomain: shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`,
      timestamp: new Date().toISOString()
    })

    if (!tokenResult.success || !tokenResult.accessToken) {
      console.error('❌ [PRODUCT-CREATE] No access token found for shop:', {
        shop,
        fullShopDomain: shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`,
        tokenResultSuccess: tokenResult.success,
        tokenResultError: tokenResult.error,
        hasAccessToken: !!tokenResult.accessToken,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: `Please ensure the app is properly installed through Shopify. Token retrieval error: ${tokenResult.error || 'No token found'}`,
          debugInfo: {
            shop,
            tokenError: tokenResult.error
          }
        },
        { status: 401 }
      )
    }

    const accessToken = tokenResult.accessToken
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

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

    console.log('✅ Using access token for shop:', shopDomain)
    console.log('🔑 Token preview:', accessToken.substring(0, 15) + '...')

    const shopify = new ShopifyOfficialAPI(shopDomain, accessToken)

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

    // Parse color variants from detected colors
    let colorVariants = []
    if (productData?.colorVariants && productData.colorVariants.length > 0) {
      colorVariants = productData.colorVariants.map(variant => 
        variant.userOverride || variant.standardizedColor
      )
      console.log('🎨 DEBUG: Processing color variants:', colorVariants)
    }

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

    // Prepare product data for Shopify (2025-01 API format) - Handle both color and size variants
    const productOptions = []
    
    // Add color option if we have color variants
    if (colorVariants.length > 0) {
      productOptions.push({
        name: 'Color',
        values: colorVariants.map(color => ({ name: color }))
      })
    }
    
    // Add size option if we have size variants
    if (sizeVariants.length > 0) {
      productOptions.push({
        name: 'Size',
        values: sizeVariants.map(size => ({ name: size }))
      })
    }
    
    const productInput = {
      title: generatedContent.title,
      descriptionHtml: generatedContent.description,
      status: 'DRAFT',
      productType: shopifyProductType,
      vendor: shopDomain.split('.')[0],
      tags: generatedContent.keywords ? generatedContent.keywords : [],
      // Add category assignment for Shopify Admin interface using correct 2025-01 API field
      ...(shopifyCategoryId ? { category: shopifyCategoryId } : {}),
      // Include productOptions if we have any variants
      ...(productOptions.length > 0 ? { productOptions } : {})
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

    // Create explicit variants for color/size combinations (since productOptions alone don't create variants in 2025-01 API)
    if (colorVariants.length > 0 || sizeVariants.length > 0) {
      console.log('🔍 DEBUG: Creating explicit variants for colors:', colorVariants, 'sizes:', sizeVariants)
      
      try {
        // Generate all combinations of colors and sizes
        const allVariantCombinations = []
        
        if (colorVariants.length > 0 && sizeVariants.length > 0) {
          // Both colors and sizes - create all combinations
          console.log('🔍 DEBUG: Creating color + size combinations')
          for (const color of colorVariants) {
            for (const size of sizeVariants) {
              allVariantCombinations.push({
                optionValues: [
                  { optionName: 'Color', name: color },
                  { optionName: 'Size', name: size }
                ],
                price: '0.00',
                inventoryPolicy: 'DENY'
              })
            }
          }
        } else if (colorVariants.length > 0) {
          // Only colors
          console.log('🔍 DEBUG: Creating color-only variants')
          for (const color of colorVariants) {
            allVariantCombinations.push({
              optionValues: [
                { optionName: 'Color', name: color }
              ],
              price: '0.00',
              inventoryPolicy: 'DENY'
            })
          }
        } else if (sizeVariants.length > 0) {
          // Only sizes
          console.log('🔍 DEBUG: Creating size-only variants')
          for (const size of sizeVariants) {
            allVariantCombinations.push({
              optionValues: [
                { optionName: 'Size', name: size }
              ],
              price: '0.00',
              inventoryPolicy: 'DENY'
            })
          }
        }

        // Skip the first variant since Shopify auto-creates it from productOptions
        const additionalVariants = allVariantCombinations.slice(1)

        console.log('🔍 DEBUG: Additional variant input data:', JSON.stringify(additionalVariants, null, 2))
        
        let variantResult = null
        if (additionalVariants.length > 0) {
          variantResult = await shopify.createProductVariants(createdProduct.id, additionalVariants)
        
          if (variantResult.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
            console.error('⚠️ Variant creation had errors:', variantResult.data.productVariantsBulkCreate.userErrors)
            // Continue anyway, product was created successfully
          } else {
            console.log('✅ Additional variants created successfully:', additionalVariants.length, 'variants')
            
            // Create Google metafields for variants
            try {
              console.log('🔍 Creating Google metafields for variants...')
              const createdVariants = variantResult.data?.productVariantsBulkCreate?.productVariants || []
              
              for (const variant of createdVariants) {
                if (variant?.id) {
                  const variantTitle = variant.title || ''
                  
                  // Extract color and size from variant option values
                  const colorOption = variant.selectedOptions?.find((opt: any) => opt.name === 'Color')
                  const sizeOption = variant.selectedOptions?.find((opt: any) => opt.name === 'Size')
                  
                  const googleVariantMetafields = generateGoogleVariantMetafields(
                    variantTitle,
                    colorOption?.value || productData.color, // Use variant color or fallback to product color
                    sizeOption?.value, // Use variant size
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
          console.log('🔍 DEBUG: No additional variants to create (only default variant needed)')
        }
      } catch (variantError) {
        console.error('⚠️ Error creating variants (product still created):', variantError)
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

    // Store the generated data in our database
    // Note: This feature is optional - product creation in Shopify is the primary goal
    console.log('ℹ️ Skipping database storage (not implemented in this version)')

    return NextResponse.json({
      success: true,
      data: {
        product: createdProduct,
        shopifyUrl: `https://${shopDomain}/admin/products/${createdProduct.id.split('/').pop()}`,
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