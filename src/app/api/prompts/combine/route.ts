import { NextRequest, NextResponse } from 'next/server'
import { getCombinedPrompt, type ProductCategory } from '@/lib/prompts'

// GET /api/prompts/combine - Get combined prompt for AI generation
export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const category = (searchParams.get('category') || 'general') as ProductCategory

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    const combinedPrompt = await getCombinedPrompt(storeId, category)

    if (!combinedPrompt) {
      return NextResponse.json(
        { error: 'Failed to generate combined prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json(combinedPrompt)

  } catch (error) {
    console.error('Error in GET /api/prompts/combine:', error)
    return NextResponse.json(
      { error: 'Failed to combine prompts' },
      { status: 500 }
    )
  }
}