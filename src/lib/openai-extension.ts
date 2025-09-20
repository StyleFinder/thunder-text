import OpenAI from 'openai'
import { supabaseAdmin } from './supabase'

// Master OpenAI client with centralized API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder-api-key',
})

export interface ExtensionGenerationRequest {
  images: string[]
  productTitle: string
  productType: string
  tags: string[]
  fabricMaterial?: string
  occasionUse?: string
  targetAudience?: string
  keyFeatures?: string
  additionalNotes?: string
  template?: string
  category?: string
  storeId: string
  productData: any
}

export interface ExtensionGenerationResponse {
  success: boolean
  data?: {
    description: string
    tokenUsage: {
      prompt: number
      completion: number
      total: number
    }
    cost: number
    processingTime: number
  }
  error?: string
}

export async function generateProductDescription(
  request: ExtensionGenerationRequest
): Promise<ExtensionGenerationResponse> {
  const startTime = Date.now()
  
  try {
    // Build the prompt for extension-specific generation
    const prompt = buildExtensionPrompt(request)
    
    // Analyze images using GPT-4o with vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            ...request.images.map(image => ({
              type: "image_url" as const,
              image_url: {
                url: image,
                detail: "high" as const,
              },
            })),
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        success: false,
        error: 'No content generated from OpenAI'
      }
    }

    // Parse the response to extract the description
    const description = parseExtensionResponse(content)
    
    const processingTime = Date.now() - startTime
    const tokenUsage = {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    }
    
    // Calculate cost based on GPT-4 Vision pricing
    const cost = calculateCost(tokenUsage.total)
    
    return {
      success: true,
      data: {
        description,
        tokenUsage,
        cost,
        processingTime,
      }
    }
  } catch (error) {
    console.error('Extension AI generation error:', error)
    return {
      success: false,
      error: `Failed to generate product description: ${error.message}`
    }
  }
}

function buildExtensionPrompt(request: ExtensionGenerationRequest): string {
  // Use template content if provided, otherwise use default instructions
  const coreInstructions = request.template || `
You are an expert e-commerce copywriter. Create compelling product descriptions that convert browsers into buyers.

CORE PRINCIPLES:
- Write in second person ("you") to create connection with the customer
- Use sensory, descriptive language appropriate to the product type
- Balance emotional appeal with practical information
- Include all relevant product specifications
- Focus on benefits over features
- Create urgency and desire without being pushy

FORMATTING RULES:
- Write in HTML format suitable for Shopify product descriptions
- Use <p> tags for paragraphs
- Use <strong> tags for emphasis
- Use <ul> and <li> tags for feature lists if appropriate
- No external links or scripts
- Keep the content clean and professional
`.trim()

  return `
${coreInstructions}

=== PRODUCT INFORMATION ===

Title: ${request.productTitle}
Type: ${request.productType}
${request.tags.length > 0 ? `Tags: ${request.tags.join(', ')}` : ''}
${request.fabricMaterial ? `Fabric/Material Content: ${request.fabricMaterial}` : ''}
${request.occasionUse ? `Occasion Use: ${request.occasionUse}` : ''}
${request.targetAudience ? `Target Audience: ${request.targetAudience}` : ''}
${request.keyFeatures ? `Key Features: ${request.keyFeatures}` : ''}
${request.additionalNotes ? `Additional Notes: ${request.additionalNotes}` : ''}

=== TASK ===

Analyze the provided product images and create a compelling product description that:
1. Captures the visual appeal and key features shown in the images
2. Incorporates the fabric/material content naturally if provided
3. Highlights the occasion use and target audience appropriately
4. Emphasizes the key features and benefits
5. Includes any additional notes seamlessly
6. Is optimized for Shopify's HTML editor

Respond with ONLY the HTML product description, no additional text or explanation.
The description should be ready to paste directly into the Shopify product description field.
`.trim()
}

function parseExtensionResponse(content: string): string {
  // Clean up the response and ensure it's valid HTML
  let description = content.trim()
  
  // Remove any markdown formatting that might have slipped through
  description = description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  description = description.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // Ensure paragraphs are wrapped in <p> tags if they aren't already
  if (!description.includes('<p>') && !description.includes('<div>')) {
    const paragraphs = description.split('\n\n').filter(p => p.trim())
    description = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n')
  }
  
  // Clean up any extra whitespace
  description = description.replace(/\n\s*\n/g, '\n')
  
  return description
}

function calculateCost(tokens: number): number {
  // GPT-4 Vision pricing (approximate)
  const costPerToken = 0.00003 // $0.03 per 1K tokens
  const result = tokens * costPerToken
  return parseFloat(result.toFixed(6))
}

export { openai }