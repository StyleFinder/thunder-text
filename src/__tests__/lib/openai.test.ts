import { AIDescriptionGenerator } from '@/lib/openai'
import OpenAI from 'openai'

// Mock OpenAI
jest.mock('openai')

describe('AIDescriptionGenerator', () => {
  let generator: AIDescriptionGenerator
  let mockOpenAI: jest.Mocked<OpenAI>

  beforeEach(() => {
    generator = new AIDescriptionGenerator()
    mockOpenAI = require('openai').__esModule 
      ? require('openai').default() 
      : require('openai')()
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
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse)

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
      mockOpenAI.chat.completions.create.mockRejectedValue(error)

      await expect(generator.generateProductDescription(mockRequest))
        .rejects.toThrow('Failed to generate product description: OpenAI API error')
    })

    it('should handle empty response from OpenAI', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
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

      mockOpenAI.chat.completions.create.mockResolvedValue(malformedResponse)

      const result = await generator.generateProductDescription(mockRequest)

      expect(result.title).toBe('Generated Product Title')
      expect(result.description).toContain('This is not valid JSON')
      expect(result.confidence).toBe(0.5)
    })

    it('should track usage for billing', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse)

      await generator.generateProductDescription(mockRequest)

      expect(generator.getStoreUsage('test-store-id')).toBe(150)
    })

    it('should build appropriate prompts based on request parameters', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse)

      await generator.generateProductDescription(mockRequest)

      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0]
      const messages = callArgs.messages as any[]
      const textContent = messages[0].content.find((c: any) => c.type === 'text')?.text

      expect(textContent).toContain('Title: Test Product')
      expect(textContent).toContain('Category: Electronics')
      expect(textContent).toContain('Brand Voice: professional')
      expect(textContent).toContain('Target Keywords: test, product')
    })
  })

  describe('calculateCost', () => {
    it('should calculate cost correctly', () => {
      const cost = generator.calculateCost(1000)
      expect(cost).toBe(0.03) // 1000 tokens * 0.00003 per token
    })

    it('should handle zero tokens', () => {
      const cost = generator.calculateCost(0)
      expect(cost).toBe(0)
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