import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { getCombinedPrompt, type ProductCategory } from '@/lib/prompts'

interface CreateProductRequest {
  images: string[] // base64 encoded images
  category: string
  sizing: string
  template: string
  productType?: string
  fabricMaterial: string
  occasionUse: string
  targetAudience: string
  keyFeatures: string
  additionalNotes: string
}

export async function POST(request: NextRequest) {
  try {
    // Check for session token in Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    if (!sessionToken) {
      console.error('❌ No session token provided for generate/create API')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('✅ Session token present for generate/create API')

    // Decode session token to get shop domain
    let shopDomain: string | null = null
    try {
      const parts = sessionToken.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
        const shopMatch = payload.dest?.match(/https:\/\/([^\/]+)/)
        shopDomain = shopMatch ? shopMatch[1] : null
        console.log('🔍 Decoded shop from session token:', shopDomain)
      }
    } catch (error) {
      console.error('❌ Failed to decode session token:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid session token' },
        { status: 401 }
      )
    }

    if (!shopDomain) {
      console.error('❌ No shop domain found in session token')
      return NextResponse.json(
        { success: false, error: 'Invalid session token - no shop domain' },
        { status: 401 }
      )
    }

    const body: CreateProductRequest = await request.json()

    const {
      images,
      category,
      sizing,
      template,
      productType,
      fabricMaterial,
      occasionUse,
      targetAudience,
      keyFeatures,
      additionalNotes
    } = body

    console.log('🔍 FRONTEND DATA RECEIVED:', {
      category,
      template,
      raw_body: { category: body.category, template: body.template }
    })

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

    // Get store ID from shop domain
    const storeId = shopDomain
    
    // Frontend already sends the correct backend category key (e.g. 'womens_clothing')
    // No mapping needed - use the template value directly
    const productCategory = template as ProductCategory || 'general'
    
    // Get custom prompts for the store and category
    console.log('🎯 AI Generation - Building custom prompt for:', { 
      parentCategory: category,
      productTemplate: template, 
      mappedCategory: productCategory,
      storeId 
    })
    
    let customPrompts = null
    let systemPrompt = ''
    
    try {
      customPrompts = await getCombinedPrompt(storeId, productCategory)
      console.log('✅ Custom prompts loaded:', { 
        hasSystemPrompt: !!customPrompts?.system_prompt,
        hasCategoryTemplate: !!customPrompts?.category_template,
        hasCombo: !!customPrompts?.combined
      })
      
      if (customPrompts?.combined) {
        systemPrompt = `${customPrompts.combined}

=== TASK INSTRUCTIONS ===

Analyze the provided product images and generate compelling content based on the custom guidelines above.

PRODUCT DETAILS:
- Category: ${category}
${productType ? `- Product Type: ${productType}` : ''}
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
  "description": "Detailed product description following the custom prompt guidelines above (200-400 words)",
  "bulletPoints": ["Array of 5-7 key benefit bullet points"],
  "metaDescription": "SEO meta description (max 160 characters)", 
  "keywords": ["Array of 8-12 relevant SEO keywords"],
  "suggestedPrice": "Suggested price range based on category and features",
  "tags": ["Array of product tags for organization"]
}

CRITICAL: The "description" field must strictly follow the custom prompt guidelines above, especially the formatting rules and section structure provided in the category template.

FORMATTING REQUIREMENTS:
- Use HTML formatting, not Markdown
- Section headers should be bold using <b>Header Name</b> tags
- Never use **markdown bold** or asterisks for formatting
- Use <br> for line breaks when needed
- Keep paragraphs as plain text without HTML paragraph tags
- NEVER use "Opening Hook" as a section label or header in the output
- The first paragraph should begin directly without any label or header
- Other section headers like "Product Details", "Styling Tips", "Care and Sizing", "Why You'll Love It" should be included as specified in the template`
      } else {
        throw new Error('No custom prompts available')
      }
    } catch (error) {
      console.error('❌ Failed to load custom prompts, using fallback:', error)
      // Fallback to basic prompt if custom prompts fail
      systemPrompt = `You are a professional e-commerce copywriter tasked with creating compelling product descriptions for a new product. 

REQUIREMENTS:
- Create engaging, SEO-optimized content that converts browsers to buyers
- Use the provided product details and images to generate accurate descriptions
- Match the specified template style and target the right audience
- Include relevant keywords naturally throughout the content
- Generate content that's appropriate for the product category: ${category}

PRODUCT DETAILS:
- Category: ${category}
${productType ? `- Product Type: ${productType}` : ''}
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
}

FORMATTING REQUIREMENTS:
- Use HTML formatting, not Markdown
- Section headers should be bold using <b>Header Name</b> tags
- Never use **markdown bold** or asterisks for formatting
- Use <br> for line breaks when needed
- Keep paragraphs as plain text without HTML paragraph tags
- NEVER use "Opening Hook" as a section label or header in the output
- The first paragraph should begin directly without any label or header
- Other section headers like "Product Details", "Styling Tips", "Care and Sizing", "Why You'll Love It" should be included as specified in the template`
    }

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