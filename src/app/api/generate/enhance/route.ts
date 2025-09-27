import { NextRequest, NextResponse } from 'next/server'
import { enhancementGenerator, type EnhancementRequest } from '@/lib/openai-enhancement'
import { type EnhancementProductData } from '@/lib/shopify/product-enhancement'

// POST /api/generate/enhance
// Generate enhanced description for existing product
export async function POST(request: NextRequest) {
  try {
    // Check for session token in Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    if (!sessionToken) {
      console.error('❌ No session token provided for enhance API')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('✅ Session token present for enhance API')

    const body = await request.json()
    const {
      existingProduct,
      enhancementInputs,
      template,
      preserveElements = ['images', 'price', 'variants'],
      enhancementGoals = {}
    } = body

    // Validate required inputs
    if (!existingProduct || !enhancementInputs) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: existingProduct and enhancementInputs' },
        { status: 400 }
      )
    }

    // Validate that the product has an existing description to enhance
    if (!existingProduct.originalDescription && !existingProduct.description) {
      return NextResponse.json(
        { success: false, error: 'Product must have an existing description to enhance' },
        { status: 400 }
      )
    }

    console.log('🔄 Generating enhanced description for existing product:', {
      productId: existingProduct.id,
      template: template || 'default',
      hasOriginalDescription: !!(existingProduct.originalDescription || existingProduct.description)
    })

    // Ensure the product has the originalDescription field
    const productData: EnhancementProductData = {
      ...existingProduct,
      originalDescription: existingProduct.originalDescription || existingProduct.description || '',
      performance: existingProduct.performance || {
        lastModified: new Date().toISOString(),
        viewCount: 0,
        conversionRate: 0
      },
      seoAnalysis: existingProduct.seoAnalysis || {
        keywordDensity: {},
        titleLength: existingProduct.title?.length || 0,
        descriptionLength: (existingProduct.originalDescription || existingProduct.description || '').length,
        missingAltTexts: 0
      }
    }

    // Prepare the enhancement request
    const enhancementRequest: EnhancementRequest = {
      originalProduct: productData,
      enhancementInputs,
      template,
      preserveElements,
      enhancementGoals: {
        improveSeo: enhancementGoals.improveSeo ?? true,
        increaseLength: enhancementGoals.increaseLength ?? false,
        addEmotionalAppeals: enhancementGoals.addEmotionalAppeals ?? true,
        enhanceFeatures: enhancementGoals.enhanceFeatures ?? true,
        improveReadability: enhancementGoals.improveReadability ?? true,
        ...enhancementGoals
      }
    }

    // Generate the enhanced description using OpenAI
    const enhancedContent = await enhancementGenerator.generateEnhancedDescription(enhancementRequest)

    console.log('✅ Enhanced description generated successfully')

    return NextResponse.json({
      success: true,
      data: {
        generatedContent: enhancedContent,
        originalProduct: productData,
        enhancementInputs,
        template: template || 'default',
        timestamp: new Date().toISOString(),
        processingTime: enhancedContent.processingTime,
        tokenUsage: enhancedContent.tokenUsage
      },
      message: 'Enhanced description generated successfully'
    })

  } catch (error) {
    console.error('❌ Error generating enhanced description:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate enhanced description',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

