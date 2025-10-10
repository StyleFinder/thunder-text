import { NextRequest, NextResponse } from 'next/server'
import { resetSystemPrompt } from '@/lib/prompts'

// POST /api/prompts/reset - Reset system prompt to default
export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { store_id, type } = body

    if (!store_id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    if (type !== 'system_prompt') {
      return NextResponse.json(
        { error: 'Invalid type for reset operation' },
        { status: 400 }
      )
    }

    const result = await resetSystemPrompt(store_id)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to reset system prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Error in POST /api/prompts/reset:', error)
    return NextResponse.json(
      { error: 'Failed to reset prompt' },
      { status: 500 }
    )
  }
}
