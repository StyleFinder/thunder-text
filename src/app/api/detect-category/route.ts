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
    const body = await request.json()
    const { imageUrl, imageData } = body

    if (!imageUrl && !imageData) {
      return NextResponse.json(
        { error: 'Image URL or image data is required' },
        { status: 400 }
      )
    }

    // Use OpenAI Vision API to analyze the image and detect clothing category
    const { openai } = await import('@/lib/openai')

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this clothing/apparel image and determine which specific category it belongs to from this list:

**EXACT CATEGORIES** (respond with ONLY the exact category name):
- Tops
- Sweaters  
- Jackets
- Jeans
- Jewelry
- Dresses
- Pants
- Shoes
- Accessories

Look at the image and respond with ONLY ONE of these exact category names. No explanation, just the category name.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl || imageData,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    })

    const detectedCategory = completion.choices[0]?.message?.content?.trim()

    if (!detectedCategory) {
      return NextResponse.json(
        { error: 'Could not detect category from image' },
        { status: 400 }
      )
    }

    // Validate that the detected category is one of our valid categories
    const validCategories = [
      'Tops', 'Sweaters', 'Jackets', 'Jeans', 'Jewelry', 
      'Dresses', 'Pants', 'Shoes', 'Accessories'
    ]

    const normalizedCategory = validCategories.find(
      cat => cat.toLowerCase() === detectedCategory.toLowerCase()
    )

    if (!normalizedCategory) {
      // Default to "Tops" if we can't match the detected category
      console.warn(`Detected category "${detectedCategory}" not in valid list, defaulting to "Tops"`)
      return NextResponse.json({
        success: true,
        data: {
          parentCategory: 'Clothing',
          subCategory: 'Tops',
          confidence: 'medium',
          detectedText: detectedCategory
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        parentCategory: 'Clothing',
        subCategory: normalizedCategory,
        confidence: 'high',
        detectedText: detectedCategory
      }
    })

  } catch (error) {
    console.error('Category detection error:', error)
    
    // If OpenAI fails, default to basic clothing category
    return NextResponse.json({
      success: true,
      data: {
        parentCategory: 'Clothing',
        subCategory: 'Tops',
        confidence: 'low',
        error: 'Detection failed, using default category'
      }
    })
  }
}