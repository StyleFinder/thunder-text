import OpenAI from 'openai'
import { getCombinedPrompt, type ProductCategory } from './prompts'

// Master OpenAI client with centralized API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder-api-key',
})

export interface ProductDescriptionRequest {
  images: string[]
  productTitle?: string
  category?: string
  brandVoice?: string
  targetLength?: 'short' | 'medium' | 'long'
  keywords?: string[]
  storeId: string
}

export interface ProductDescriptionResponse {
  title: string
  description: string
  bulletPoints: string[]
  metaDescription: string
  keywords: string[]
  confidence: number
  processingTime: number
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
}

export class AIDescriptionGenerator {
  private storeUsage: Map<string, number> = new Map()

  async generateProductDescription(
    request: ProductDescriptionRequest
  ): Promise<ProductDescriptionResponse> {
    const startTime = Date.now()
    
    try {
      // Build the prompt based on request parameters and custom prompts
      const prompt = await this.buildPrompt(request)
      
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
        throw new Error('No content generated from OpenAI')
      }

      // Parse the structured response
      const parsed = this.parseResponse(content)
      
      // Track usage for billing
      this.trackUsage(request.storeId, response.usage?.total_tokens || 0)
      
      const processingTime = Date.now() - startTime
      
      return {
        ...parsed,
        processingTime,
        tokenUsage: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      console.error('AI generation error:', error)
      throw new Error(`Failed to generate product description: ${error.message}`)
    }
  }

  private async buildPrompt(request: ProductDescriptionRequest): Promise<string> {
    const lengthGuide = {
      short: '50-100 words',
      medium: '100-200 words', 
      long: '200-400 words'
    }

    // Get the custom prompts for this store and category
    const category = (request.category || 'general') as ProductCategory
    let customPrompts = null

    console.log('🎯 AI Generation - Building prompt for:', { storeId: request.storeId, category })
    
    try {
      customPrompts = await getCombinedPrompt(request.storeId, category)
      console.log('✅ Custom prompts loaded:', { 
        hasSystemPrompt: !!customPrompts?.system_prompt,
        hasCategoryTemplate: !!customPrompts?.category_template,
        hasCombo: !!customPrompts?.combined
      })
    } catch (error) {
      console.error('❌ Failed to load custom prompts, falling back to default:', error)
    }

    // Use custom prompts if available, otherwise fall back to basic instructions
    const coreInstructions = customPrompts?.combined || `
You are an expert e-commerce copywriter. Create compelling product descriptions that convert browsers into buyers.

CORE PRINCIPLES:
- Write in second person ("you") to create connection with the customer
- Use sensory, descriptive language appropriate to the product type
- Balance emotional appeal with practical information
- Include all relevant product specifications provided in the context
- Format with clear section headers (no special characters like *, #, or -)

FORMATTING RULES:
- Section headers should be in bold TypeCase
- No markdown formatting or special characters
- Keep paragraphs concise (3-5 sentences max)
- Use line breaks between sections for clarity
`.trim()

    return `
${coreInstructions}

=== TASK INSTRUCTIONS ===

Analyze the provided product images and generate compelling content based on the guidelines above.

Product Context:
${request.productTitle ? `- Title: ${request.productTitle}` : ''}
${request.category ? `- Category: ${request.category}` : ''}
${request.brandVoice ? `- Brand Voice: ${request.brandVoice}` : ''}
- Target Length: ${lengthGuide[request.targetLength || 'medium']}
${request.keywords?.length ? `- Target Keywords: ${request.keywords.join(', ')}` : ''}

Please provide a JSON response with the following structure:
{
  "title": "Compelling product title based on images",
  "description": "SEO-optimized product description following the custom guidelines above",
  "bulletPoints": ["Key feature 1", "Key feature 2", "Key feature 3", "Key feature 4", "Key feature 5"],
  "metaDescription": "Search engine meta description (150-160 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "confidence": 0.95
}

CRITICAL: The "description" field must strictly follow the custom prompt guidelines above, especially the formatting rules and section structure provided in the category template.
`.trim()
  }

  private parseResponse(content: string): Omit<ProductDescriptionResponse, 'processingTime' | 'tokenUsage'> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          title: parsed.title || 'Generated Product Title',
          description: parsed.description || 'Generated product description',
          bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [],
          metaDescription: parsed.metaDescription || '',
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        }
      }
    } catch (error) {
      console.error('Failed to parse JSON response:', error)
    }

    // Fallback parsing if JSON extraction fails
    return {
      title: 'Generated Product Title',
      description: content.substring(0, 400),
      bulletPoints: [],
      metaDescription: content.substring(0, 160),
      keywords: [],
      confidence: 0.5,
    }
  }

  private trackUsage(storeId: string, tokens: number): void {
    const currentUsage = this.storeUsage.get(storeId) || 0
    this.storeUsage.set(storeId, currentUsage + tokens)
  }

  getStoreUsage(storeId: string): number {
    return this.storeUsage.get(storeId) || 0
  }

  // Cost calculation based on GPT-4 Vision pricing
  calculateCost(tokens: number): number {
    // GPT-4 Vision pricing (approximate)
    const costPerToken = 0.00003 // $0.03 per 1K tokens
    const result = tokens * costPerToken
    return parseFloat(result.toFixed(6))
  }

  // Enhanced product description for existing products
  async enhanceProductDescription(request: {
    productId: string
    images: string[]
    template: string
    productDetails: {
      parentCategory: string
      availableSizing: string
      fabricMaterial: string
      occasionUse: string
      targetAudience: string
      keyFeatures: string
      additionalNotes: string
    }
    enhancementOptions: {
      generateTitle: boolean
      enhanceDescription: boolean
      generateSEO: boolean
      createPromo: boolean
    }
    storeId: string
  }): Promise<any> {
    const startTime = Date.now()

    try {
      // Build enhancement prompt
      const prompt = `You are an expert e-commerce copywriter specializing in creating compelling product descriptions.

Based on the provided product images and details, generate enhanced content with these specifications:

Product Details:
- Category: ${request.productDetails.parentCategory}
- Template Type: ${request.template}
- Fabric/Material: ${request.productDetails.fabricMaterial || 'Not specified'}
- Occasion/Use: ${request.productDetails.occasionUse || 'Not specified'}
- Target Audience: ${request.productDetails.targetAudience || 'General'}
- Available Sizing: ${request.productDetails.availableSizing || 'Not specified'}
- Key Features: ${request.productDetails.keyFeatures || 'To be determined from images'}
- Additional Notes: ${request.productDetails.additionalNotes || 'None'}

Enhancement Options:
${request.enhancementOptions.generateTitle ? '- Generate a compelling product title' : ''}
${request.enhancementOptions.enhanceDescription ? '- Create an enhanced product description with HTML formatting' : ''}
${request.enhancementOptions.generateSEO ? '- Generate SEO title and meta description' : ''}
${request.enhancementOptions.createPromo ? '- Create promotional copy for marketing' : ''}

Please provide the output in the following JSON format:
{
  ${request.enhancementOptions.generateTitle ? '"title": "New compelling product title",' : ''}
  ${request.enhancementOptions.enhanceDescription ? '"description": "Enhanced HTML-formatted product description with bullet points and features",' : ''}
  ${request.enhancementOptions.generateSEO ? '"seoTitle": "SEO-optimized title (60 chars max)", "seoDescription": "SEO meta description (160 chars max)",' : ''}
  ${request.enhancementOptions.createPromo ? '"promoText": "Short promotional copy for marketing",' : ''}
  "confidence": 0.95
}`

      // Call GPT-4 Vision with images
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
              ...request.images.slice(0, 5).map(image => ({
                type: "image_url" as const,
                image_url: {
                  url: image,
                  detail: "high" as const,
                },
              })),
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content generated from OpenAI')
      }

      // Parse the response
      let parsed
      try {
        // Extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          parsed = JSON.parse(content)
        }
      } catch (e) {
        console.error('Failed to parse enhanced content:', e)
        // Fallback structure
        parsed = {
          description: content,
          confidence: 0.7
        }
      }

      const processingTime = Date.now() - startTime

      return {
        ...parsed,
        processingTime,
        tokenUsage: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      console.error('AI enhancement error:', error)
      throw new Error(`Failed to enhance product description: ${error.message}`)
    }
  }
}

// Singleton instance for the application
export const aiGenerator = new AIDescriptionGenerator()

// Export the OpenAI client for direct use
export { openai }