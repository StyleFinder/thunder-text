import OpenAI from 'openai'

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
      // Build the prompt based on request parameters
      const prompt = this.buildPrompt(request)
      
      // Analyze images using GPT-4 Vision
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
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

  private buildPrompt(request: ProductDescriptionRequest): string {
    const lengthGuide = {
      short: '50-100 words',
      medium: '100-200 words', 
      long: '200-400 words'
    }
    
    return `
Analyze the provided product images and generate a compelling, SEO-optimized product description.

Product Context:
${request.productTitle ? `- Title: ${request.productTitle}` : ''}
${request.category ? `- Category: ${request.category}` : ''}
${request.brandVoice ? `- Brand Voice: ${request.brandVoice}` : ''}
- Target Length: ${lengthGuide[request.targetLength || 'medium']}
${request.keywords?.length ? `- Target Keywords: ${request.keywords.join(', ')}` : ''}

Please provide a JSON response with the following structure:
{
  "title": "Compelling product title based on images",
  "description": "SEO-optimized product description",
  "bulletPoints": ["Key feature 1", "Key feature 2", "Key feature 3", "Key feature 4", "Key feature 5"],
  "metaDescription": "Search engine meta description (150-160 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "confidence": 0.95
}

Requirements:
- Focus on product features visible in the images
- Include materials, colors, patterns, and design elements
- Write compelling copy that converts browsers to buyers
- Ensure all keywords are naturally integrated
- Maintain consistent brand voice throughout
- Generate exactly 5 bullet points highlighting key features
- Create an engaging meta description for search results
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
    return tokens * costPerToken
  }
}

// Singleton instance for the application
export const aiGenerator = new AIDescriptionGenerator()