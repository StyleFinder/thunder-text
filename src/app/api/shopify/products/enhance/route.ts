import { NextRequest, NextResponse } from 'next/server'
import { 
  fetchProductDataForEnhancement, 
  validateProductForEnhancement,
  generateEnhancementContext,
  createEnhancementPreview
} from '@/lib/shopify/product-enhancement'

// GET /api/shopify/products/enhance?productId={id}&shop={shop}
// Fetch comprehensive product data for enhancement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const shop = searchParams.get('shop')

    if (!productId || !shop) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: productId and shop' },
        { status: 400 }
      )
    }

    console.log('🔄 Fetching product data for enhancement:', { productId, shop })

    // Fetch comprehensive product data for enhancement
    const productData = await fetchProductDataForEnhancement(productId, shop)

    if (!productData) {
      return NextResponse.json(
        { success: false, error: 'Product not found or inaccessible' },
        { status: 404 }
      )
    }

    // Validate product is suitable for enhancement
    const validation = validateProductForEnhancement(productData)
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Product not suitable for enhancement',
        validation: {
          issues: validation.issues,
          suggestions: validation.suggestions
        }
      }, { status: 422 })
    }

    // Generate enhancement context and preview
    const enhancementContext = generateEnhancementContext(productData)
    const enhancementPreview = createEnhancementPreview(productData, enhancementContext)

    console.log('✅ Product data fetched and validated successfully')

    return NextResponse.json({
      success: true,
      data: {
        product: productData,
        enhancementContext,
        preview: enhancementPreview,
        validation
      },
      message: 'Product data fetched successfully'
    })

  } catch (error) {
    console.error('❌ Error fetching product data for enhancement:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/shopify/products/enhance?productId={id}&shop={shop}
// Update product with enhanced description
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const shop = searchParams.get('shop')

    if (!productId || !shop) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: productId and shop' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      enhancedContent, 
      preserveOriginal = true,
      updateMetafields = false,
      updateSeo = true 
    } = body

    if (!enhancedContent || !enhancedContent.description) {
      return NextResponse.json(
        { success: false, error: 'Missing enhanced content or description in request body' },
        { status: 400 }
      )
    }

    console.log('🔄 Updating product with enhanced description:', { productId, shop })

    // First, get current product data for backup if needed
    let originalData = null
    if (preserveOriginal) {
      originalData = await fetchProductDataForEnhancement(productId, shop)
      if (!originalData) {
        return NextResponse.json(
          { success: false, error: 'Could not fetch original product data for backup' },
          { status: 404 }
        )
      }
    }

    // Import the product updater dynamically to avoid circular dependencies
    const { createShopifyProductUpdater } = await import('@/lib/shopify/product-updater')
    
    try {
      // Create the Shopify product updater
      const productUpdater = await createShopifyProductUpdater(shop)
      
      // Validate access to the product
      const hasAccess = await productUpdater.validateProductAccess(productId)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'No access to the specified product' },
          { status: 403 }
        )
      }

      // Perform the actual product update
      const updateResult = await productUpdater.updateProductWithEnhancement(
        productId,
        enhancedContent,
        originalData!,
        {
          updateTitle: !!enhancedContent.title,
          updateDescription: true,
          updateSeo,
          updateMetafields,
          preserveOriginal,
          backupToMetafield: true
        }
      )

      if (!updateResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Product update failed',
            details: updateResult.errors?.join(', ') || 'Unknown error'
          },
          { status: 500 }
        )
      }

      console.log('✅ Product successfully updated in Shopify')

      return NextResponse.json({
        success: true,
        data: {
          ...updateResult,
          enhancement_summary: {
            description_length_change: enhancedContent.improvements.enhanced_length - enhancedContent.improvements.original_length,
            seo_improvements: enhancedContent.metaDescription ? ['Added meta description'] : [],
            content_improvements: enhancedContent.improvements.added_elements
          }
        },
        message: 'Product updated successfully',
        warnings: updateResult.warnings
      })

    } catch (error) {
      console.error('❌ Error in product update process:', error)
      
      // Handle specific authentication errors
      if (error instanceof Error && error.message.includes('access token')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Shopify authentication required',
            details: 'Please ensure the app is properly installed and authenticated'
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Product update failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error updating product with enhanced description:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}