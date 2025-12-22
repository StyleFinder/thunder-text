import { AIDescriptionGenerator } from '@/lib/openai'

// Mock OpenAI
jest.mock('openai')

declare global {
  var mockOpenAICreate: jest.Mock
}

describe('AIDescriptionGenerator', () => {
  let generator: AIDescriptionGenerator

  beforeEach(() => {
    generator = new AIDescriptionGenerator()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateProductDescription', () => {
    const mockRequest = {
      images: ['data:image/jpeg;base64,test'],
      productTitle: 'Test Product',
      category: 'Electronics',
      brandVoice: 'professional',
      targetLength: 'medium' as const,
      keywords: ['test', 'product'],
      storeId: 'test-store-id',
    }

    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            title: 'Test Product Title',
            description: 'Test product description',
            bulletPoints: ['Feature 1', 'Feature 2', 'Feature 3'],
            metaDescription: 'Test meta description',
            keywords: ['test', 'product', 'electronics'],
            confidence: 0.95,
          }),
        },
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    }

    it('should generate product description successfully', async () => {
      global.mockOpenAICreate.mockResolvedValue(mockOpenAIResponse)

      const result = await generator.generateProductDescription(mockRequest)

      expect(result).toMatchObject({
        title: 'Test Product Title',
        description: 'Test product description',
        bulletPoints: ['Feature 1', 'Feature 2', 'Feature 3'],
        metaDescription: 'Test meta description',
        keywords: ['test', 'product', 'electronics'],
        confidence: 0.95,
        tokenUsage: {
          prompt: 100,
          completion: 50,
          total: 150,
        },
      })
      expect(typeof result.processingTime).toBe('number')
    })

    it('should handle OpenAI API errors', async () => {
      const error = new Error('OpenAI API error')
      global.mockOpenAICreate.mockRejectedValue(error)

      await expect(generator.generateProductDescription(mockRequest))
        .rejects.toThrow('Failed to generate product description: OpenAI API error')
    })

    it('should handle empty response from OpenAI', async () => {
      global.mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      })

      await expect(generator.generateProductDescription(mockRequest))
        .rejects.toThrow('No content generated from OpenAI')
    })

    it('should parse malformed JSON response gracefully', async () => {
      const malformedResponse = {
        choices: [{
          message: {
            content: 'This is not valid JSON but should be handled gracefully',
          },
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }

      global.mockOpenAICreate.mockResolvedValue(malformedResponse)

      const result = await generator.generateProductDescription(mockRequest)

      expect(result.title).toBe('Generated Product Title')
      expect(result.description).toContain('This is not valid JSON')
      expect(result.confidence).toBe(0.5)
    })

    it('should track usage for billing', async () => {
      global.mockOpenAICreate.mockResolvedValue(mockOpenAIResponse)

      await generator.generateProductDescription(mockRequest)

      expect(generator.getStoreUsage('test-store-id')).toBe(150)
    })

    it('should build appropriate prompts based on request parameters', async () => {
      global.mockOpenAICreate.mockResolvedValue(mockOpenAIResponse)

      await generator.generateProductDescription(mockRequest)

      const callArgs = global.mockOpenAICreate.mock.calls[0][0]
      const messages = callArgs.messages as any[]
      const textContent = messages[0].content.find((c: any) => c.type === 'text')?.text

      expect(textContent).toContain('Title: Test Product')
      expect(textContent).toContain('Category: Electronics')
      expect(textContent).toContain('Brand Voice: professional')
      expect(textContent).toContain('Target Keywords: test, product')
    })
  })

  describe('calculateCost', () => {
    it('should calculate input cost correctly', () => {
      const cost = generator.calculateCost(1000000, false)
      expect(cost).toBe(0.15) // 1M tokens * $0.15/1M (GPT-4o-mini input)
    })

    it('should calculate output cost correctly', () => {
      const cost = generator.calculateCost(1000000, true)
      expect(cost).toBe(0.6) // 1M tokens * $0.60/1M (GPT-4o-mini output)
    })

    it('should default to input pricing', () => {
      const cost = generator.calculateCost(1000000)
      expect(cost).toBe(0.15) // Defaults to input pricing
    })

    it('should handle zero tokens', () => {
      const cost = generator.calculateCost(0)
      expect(cost).toBe(0)
    })
  })

  describe('calculateTotalCost', () => {
    it('should calculate combined input and output cost', () => {
      const cost = generator.calculateTotalCost(1000000, 500000)
      // Input: 1M * $0.15/1M = $0.15
      // Output: 500K * $0.60/1M = $0.30
      // Total: $0.45
      expect(cost).toBe(0.45)
    })
  })

  describe('getStoreUsage', () => {
    it('should return 0 for new store', () => {
      const usage = generator.getStoreUsage('new-store-id')
      expect(usage).toBe(0)
    })

    it('should return accumulated usage', () => {
      generator['trackUsage']('test-store', 100)
      generator['trackUsage']('test-store', 50)
      
      const usage = generator.getStoreUsage('test-store')
      expect(usage).toBe(150)
    })
  })
})