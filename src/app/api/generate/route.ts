import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { aiGenerator } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { images, productTitle, category, brandVoice, targetLength, keywords } = body

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Images are required' },
        { status: 400 }
      )
    }

    // Get store information
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id, current_usage, usage_limits, plan')
      .eq('id', session.user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Check usage limits
    if (store.current_usage >= store.usage_limits) {
      return NextResponse.json(
        { error: 'Usage limit exceeded. Please upgrade your plan.' },
        { status: 429 }
      )
    }

    // Generate product description
    const result = await aiGenerator.generateProductDescription({
      images,
      productTitle,
      category,
      brandVoice,
      targetLength,
      keywords,
      storeId: store.id,
    })

    // Update usage count
    await supabaseAdmin
      .from('stores')
      .update({ 
        current_usage: store.current_usage + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    // Track usage metrics
    const today = new Date().toISOString().split('T')[0]
    await supabaseAdmin
      .from('usage_metrics')
      .upsert({
        store_id: store.id,
        period: today,
        generations_count: 1,
        ai_tokens_used: result.tokenUsage.total,
      }, {
        onConflict: 'store_id,period',
      })

    return NextResponse.json({
      success: true,
      data: result,
      usage: {
        current: store.current_usage + 1,
        limit: store.usage_limits,
        remaining: store.usage_limits - (store.current_usage + 1),
      },
    })

  } catch (error) {
    console.error('Generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}