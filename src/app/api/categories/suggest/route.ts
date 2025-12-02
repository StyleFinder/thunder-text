import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { inferProductCategory } = await import('@/lib/category-inference')
    
    const body = await request.json()
    const { title, description, keywords } = body

    if (!title && !description) {
      return NextResponse.json(
        { error: 'Title or description required for category suggestion' },
        { status: 400 }
      )
    }

    // Infer category from the provided content
    const inference = inferProductCategory(
      title || '',
      description || '',
      keywords || [],
      undefined // No existing category
    )


    return NextResponse.json({
      success: true,
      suggestion: {
        category: inference.category,
        confidence: inference.confidence,
        reasoning: inference.reasoning,
        shouldAutoAssign: inference.confidence >= 0.6
      }
    })

  } catch (error) {
    logger.error('❌ Error suggesting category:', error as Error, { component: 'suggest' })
    return NextResponse.json(
      { 
        error: 'Failed to suggest category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}