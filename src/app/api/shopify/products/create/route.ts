import { NextRequest, NextResponse } from 'next/server'
import { generateGoogleProductMetafields, generateGoogleVariantMetafields, validateGoogleMetafields } from '@/lib/google-metafields'
import { logger } from '@/lib/logger'

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

    if (!shop) {
      logger.error('Missing shop parameter', undefined, { component: 'product-create', operation: 'POST' })
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Get access token from database (obtained via Token Exchange)
    const tokenResult = await getShopToken(shop)

    if (!tokenResult.success || !tokenResult.accessToken) {
      logger.error('No access token found for shop', undefined, {
        shop,
        fullShopDomain: shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`,
        tokenResultSuccess: tokenResult.success,
        tokenResultError: tokenResult.error,
        hasAccessToken: !!tokenResult.accessToken,
        component: 'product-create',
        operation: 'get-token'
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


    if (!generatedContent) {
      return NextResponse.json(
        { error: 'Generated content is required' },
        { status: 400 }
      )
    }


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
      } else {
      }
    }

    // Map category to Shopify's standardized categories
    const { mapToShopifyCategory } = await import('@/lib/shopify-categories')
    const shopifyCategoryId = mapToShopifyCategory(finalCategory)
    
    // Use productType from productData if provided, otherwise extract from category
    let shopifyProductType = productData?.productType || 'General'

    // If no productType provided, extract sub-category from the full category path
    if (!productData?.productType && finalCategory) {
      // If category contains " > ", extract the part after it (sub-category)
      // Example: "Clothing > Tops" becomes "Tops"
      if (finalCategory.includes(' > ')) {
        shopifyProductType = finalCategory.split(' > ')[1]
      } else {
        // If no parent separator, use the category as-is
        shopifyProductType = finalCategory === 'Fashion & Apparel' ? 'General' : finalCategory
      }
    }

    // Parse color variants from detected colors
    let colorVariants: string[] = []
    if (productData?.colorVariants && productData.colorVariants.length > 0) {
      colorVariants = productData.colorVariants.map((variant: { userOverride?: string; standardizedColor: string }) =>
        variant.userOverride || variant.standardizedColor
      )
    }

    // Parse sizing data to get available sizes (for explicit variant creation)
    let sizeVariants: string[] = []
    if (productData?.sizing) {

      if (productData.sizing.includes(' - ')) {
        const [startSize, endSize] = productData.sizing.split(' - ')
        const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        const startIndex = allSizes.indexOf(startSize.toUpperCase())
        const endIndex = allSizes.indexOf(endSize.toUpperCase())

        if (startIndex !== -1 && endIndex !== -1) {
          sizeVariants = allSizes.slice(startIndex, endIndex + 1)
        }
      } else if (productData.sizing.includes(',')) {
        sizeVariants = productData.sizing.split(',').map((size: string) => size.trim().toUpperCase())
      } else {
        sizeVariants = [productData.sizing.toUpperCase()]
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


    interface ProductCreateResult {
      data?: {
        productCreate?: {
          product?: {
            id: string
            [key: string]: unknown
          }
          userErrors?: Array<{ field: string[]; message: string }>
        }
      }
      errors?: Array<{ message: string }>
    }

    // Create product in Shopify
    const createResult = await shopify.createProduct(productInput) as ProductCreateResult

    // Handle authentication and API errors
    if (createResult.errors && createResult.errors.length > 0) {
      logger.error('Shopify API error', new Error(createResult.errors[0].message), { errors: createResult.errors, component: 'product-create', operation: 'create-product' })
      return NextResponse.json(
        {
          error: 'Shopify API authentication failed',
          details: createResult.errors[0].message || 'Invalid credentials or permissions'
        },
        { status: 401 }
      )
    }

    if (createResult.data?.productCreate?.userErrors && createResult.data.productCreate.userErrors.length > 0) {
      logger.error('Shopify product creation errors', undefined, { userErrors: createResult.data.productCreate.userErrors, component: 'product-create', operation: 'create-product' })
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
      logger.error('No product returned from Shopify API', undefined, { component: 'product-create', operation: 'create-product' })
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
    }
    if (!validation.isValid) {
      logger.error('❌ Google metafields validation failed:', validation.errors, undefined, { component: 'create' })
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
      logger.error('Error creating metafields', metafieldError as Error, { component: 'product-create', operation: 'create-metafields' })
      // Continue anyway, metafields are not critical
    }

    // Create explicit variants for color/size combinations (since productOptions alone don't create variants in 2025-01 API)
    if (colorVariants.length > 0 || sizeVariants.length > 0) {
      
      try {
        // Generate all combinations of colors and sizes
        const allVariantCombinations = []
        
        if (colorVariants.length > 0 && sizeVariants.length > 0) {
          // Both colors and sizes - create all combinations
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


        interface OptionValue {
          name: string
          value: string
        }

        interface VariantCreateResult {
          data?: {
            productVariantsBulkCreate?: {
              productVariants?: Array<{
                id?: string
                title?: string
                selectedOptions?: OptionValue[]
                [key: string]: unknown
              }>
              userErrors?: Array<{ field: string[]; message: string }>
            }
          }
        }

        let variantResult: VariantCreateResult | null = null
        if (additionalVariants.length > 0) {
          variantResult = await shopify.createProductVariants(createdProduct.id, additionalVariants) as VariantCreateResult

          if (variantResult.data?.productVariantsBulkCreate?.userErrors && variantResult.data.productVariantsBulkCreate.userErrors.length > 0) {
            logger.error('Variant creation had errors', undefined, { userErrors: variantResult.data.productVariantsBulkCreate.userErrors, component: 'product-create', operation: 'create-variants' })
            // Continue anyway, product was created successfully
          } else {
            
            // Create Google metafields for variants
            try {
              const createdVariants = variantResult.data?.productVariantsBulkCreate?.productVariants || []
              
              for (const variant of createdVariants) {
                if (variant?.id) {
                  const variantTitle = variant.title || ''

                  // Extract color and size from variant option values
                  const colorOption = variant.selectedOptions?.find((opt: OptionValue) => opt.name === 'Color')
                  const sizeOption = variant.selectedOptions?.find((opt: OptionValue) => opt.name === 'Size')
                  
                  const googleVariantMetafields = generateGoogleVariantMetafields(
                    variantTitle,
                    colorOption?.value || productData.color, // Use variant color or fallback to product color
                    sizeOption?.value, // Use variant size
                    undefined  // Material will be inherited from product
                  )
                  
                  if (googleVariantMetafields.length > 0 && variant.id) {
                    const variantMetafieldPromises = googleVariantMetafields.map(metafield =>
                      shopify.createProductVariantMetafield(variant.id!, metafield)
                    )
                    await Promise.all(variantMetafieldPromises)
                  }
                }
              }
            } catch (variantMetafieldError) {
              logger.error('Error creating variant metafields', variantMetafieldError as Error, { component: 'product-create', operation: 'create-variant-metafields' })
              // Continue anyway, variants were created successfully
            }
          }
        } else {
        }
      } catch (variantError) {
        logger.error('Error creating variants (product still created)', variantError as Error, { component: 'product-create', operation: 'create-variants' })
        // Continue anyway, product was created successfully
      }
    }

    // Upload images using the corrected GraphQL media upload approach
    if (uploadedImages && uploadedImages.length > 0) {
      console.log(`📤 Starting image upload process for ${uploadedImages.length} image(s)...`)
      
      try {
        for (const [index, imageData] of uploadedImages.entries()) {
          
          const altText = `${generatedContent.title} - Image ${index + 1}`
          const uploadResult = await shopify.createProductImage(
            createdProduct.id,
            imageData,
            altText
          )
          
          if (uploadResult.success) {
          } else {
            logger.error('Failed to upload image', undefined, { index: index + 1, uploadResult, component: 'product-create', operation: 'upload-image' })
          }
        }


      } catch (imageError) {
        logger.error('Error during image upload process', imageError as Error, { component: 'product-create', operation: 'upload-images' })
        console.log('Product created successfully, but images failed to upload. Images can be uploaded manually in Shopify admin.')
        // Continue anyway, the product was created successfully
      }
    } else {
    }

    // Store the generated data in our database
    // Note: This feature is optional - product creation in Shopify is the primary goal

    return NextResponse.json({
      success: true,
      data: {
        product: createdProduct,
        shopifyUrl: `https://${shopDomain}/admin/products/${createdProduct.id.split('/').pop()}`,
        productId: createdProduct.id
      },
    })

  } catch (error) {
    logger.error('Shopify product creation API error', error as Error, { component: 'product-create', operation: 'POST' })
    return NextResponse.json(
      {
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}