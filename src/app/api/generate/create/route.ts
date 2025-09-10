import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface CreateProductRequest {
  images: string[] // base64 encoded images
  category: string
  sizing: string
  template: string
  fabricMaterial: string
  occasionUse: string
  targetAudience: string
  keyFeatures: string
  additionalNotes: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProductRequest = await request.json()
    
    const { 
      images, 
      category, 
      sizing, 
      template,
      fabricMaterial, 
      occasionUse, 
      targetAudience, 
      keyFeatures, 
      additionalNotes 
    } = body

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image is required' },
        { status: 400 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Product category is required' },
        { status: 400 }
      )
    }

    // Build the system prompt for product creation
    let systemPrompt = `You are a professional e-commerce copywriter tasked with creating compelling product descriptions for a new product. 

REQUIREMENTS:
- Create engaging, SEO-optimized content that converts browsers to buyers
- Use the provided product details and images to generate accurate descriptions
- Match the specified template style and target the right audience
- Include relevant keywords naturally throughout the content
- Generate content that's appropriate for the product category: ${category}

PRODUCT DETAILS:
- Category: ${category}
- Available Sizing: ${sizing || 'Not specified'}
- Template Style: ${template}
${fabricMaterial ? `- Materials: ${fabricMaterial}` : ''}
${occasionUse ? `- Occasion/Use: ${occasionUse}` : ''}
${targetAudience ? `- Target Audience: ${targetAudience}` : ''}
${keyFeatures ? `- Key Features: ${keyFeatures}` : ''}
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ''}

OUTPUT FORMAT - Return a JSON object with these exact fields:
{
  "title": "Product title (max 70 characters)",
  "description": "Detailed product description (200-400 words)",
  "bulletPoints": ["Array of 5-7 key benefit bullet points"],
  "metaDescription": "SEO meta description (max 160 characters)", 
  "keywords": ["Array of 8-12 relevant SEO keywords"],
  "suggestedPrice": "Suggested price range based on category and features",
  "tags": ["Array of product tags for organization"]
}`

    const userPrompt = `Analyze these product images and create compelling e-commerce content. Focus on what makes this product unique and valuable to customers.

${additionalNotes ? `Special Instructions: ${additionalNotes}` : ''}`

    // Prepare image content for OpenAI
    const imageContent = images.map(image => ({
      type: "image_url" as const,
      image_url: {
        url: image,
        detail: "high" as const
      }
    }))

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: userPrompt
          },
          ...imageContent
        ]
      }
    ]

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    })

    const generatedContent = completion.choices[0]?.message?.content

    if (!generatedContent) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate content' },
        { status: 500 }
      )
    }

    let parsedContent
    try {
      parsedContent = JSON.parse(generatedContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      return NextResponse.json(
        { success: false, error: 'Generated content format error' },
        { status: 500 }
      )
    }

    // Validate required fields
    const requiredFields = ['title', 'description', 'bulletPoints', 'metaDescription', 'keywords']
    const missingFields = requiredFields.filter(field => !parsedContent[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing fields: ${missingFields.join(', ')}` },
        { status: 500 }
      )
    }

    const tokenUsage = {
      total: completion.usage?.total_tokens || 0,
      prompt: completion.usage?.prompt_tokens || 0,
      completion: completion.usage?.completion_tokens || 0
    }

    // TODO: Track usage in database
    const usage = {
      current: 0, // Would fetch from database
      limit: 25,
      remaining: 25 // Would calculate from database
    }

    return NextResponse.json({
      success: true,
      data: {
        generatedContent: {
          title: parsedContent.title,
          description: parsedContent.description,
          bulletPoints: parsedContent.bulletPoints || [],
          metaDescription: parsedContent.metaDescription,
          keywords: parsedContent.keywords || [],
          suggestedPrice: parsedContent.suggestedPrice || null,
          tags: parsedContent.tags || []
        },
        tokenUsage,
        productData: {
          category,
          sizing,
          template,
          fabricMaterial,
          occasionUse,
          targetAudience,
          keyFeatures,
          additionalNotes
        }
      },
      usage
    })

  } catch (error) {
    console.error('Create product generation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error occurred while generating content' 
      },
      { status: 500 }
    )
  }
}