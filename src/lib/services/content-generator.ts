/**
 * Content Generator Service
 * Generates various types of content using OpenAI with brand voice
 */

import { callChatCompletion, estimateTokenCount } from './openai-client'
import {
  BASE_SYSTEM_PROMPT,
  buildContentPrompt,
  validateContentParams,
  type ContentType,
  type CTAType
} from './content-prompts'
import type { BrandVoiceProfile } from '@/types/content-center'

export interface ContentGenerationParams {
  contentType: ContentType
  topic: string
  wordCount: number
  toneIntensity: number
  ctaType: CTAType
  customCTA?: string
  platform?: string
  additionalContext?: string
}

export interface GeneratedContentResult {
  content: string
  wordCount: number
  tokensUsed: number
  generationTimeMs: number
  metadata: {
    contentType: ContentType
    topic: string
    requestedWordCount: number
    actualWordCount: number
    toneIntensity: number
    ctaType: CTAType
    voiceProfileVersion: number
  }
}

/**
 * Generate content using user's brand voice profile
 */
export async function generateContent(
  voiceProfile: BrandVoiceProfile,
  params: ContentGenerationParams
): Promise<GeneratedContentResult> {
  const startTime = Date.now()

  // Validate parameters
  const validation = validateContentParams({
    voiceProfile: voiceProfile.profile_text,
    ...params
  })

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid content generation parameters')
  }

  // Build prompt
  const userPrompt = buildContentPrompt(
    params.contentType,
    voiceProfile.profile_text,
    {
      voiceProfile: voiceProfile.profile_text,
      ...params
    }
  )

  // Calculate appropriate temperature based on tone intensity and content type
  const temperature = calculateTemperature(params.contentType, params.toneIntensity)

  // Calculate max tokens based on requested word count
  const maxTokens = calculateMaxTokens(params.wordCount)

  // Generate content
  const content = await callChatCompletion(
    [
      {
        role: 'system',
        content: BASE_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    {
      model: 'gpt-4o',
      temperature,
      maxTokens,
      topP: 0.95,
      frequencyPenalty: 0.3, // Reduce repetition
      presencePenalty: 0.2    // Encourage topic diversity
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000
    }
  )

  const generationTimeMs = Date.now() - startTime

  // Calculate actual word count
  const actualWordCount = countWords(content)

  // Estimate tokens used
  const promptTokens = estimateTokenCount(BASE_SYSTEM_PROMPT + userPrompt)
  const completionTokens = estimateTokenCount(content)
  const tokensUsed = promptTokens + completionTokens

  return {
    content,
    wordCount: actualWordCount,
    tokensUsed,
    generationTimeMs,
    metadata: {
      contentType: params.contentType,
      topic: params.topic,
      requestedWordCount: params.wordCount,
      actualWordCount,
      toneIntensity: params.toneIntensity,
      ctaType: params.ctaType,
      voiceProfileVersion: voiceProfile.profile_version
    }
  }
}

/**
 * Calculate appropriate temperature based on content type and tone intensity
 */
function calculateTemperature(contentType: ContentType, toneIntensity: number): number {
  // Base temperatures by content type
  const baseTemperatures: Record<ContentType, number> = {
    blog: 0.7,           // More creative
    ad: 0.65,            // Balanced
    store_copy: 0.6,     // More focused
    social_facebook: 0.75,  // More casual
    social_instagram: 0.75, // More casual
    social_tiktok: 0.8      // Most casual/creative
  }

  const baseTemp = baseTemperatures[contentType]

  // Adjust based on tone intensity (1-5 scale)
  // Lower intensity = more conservative, higher intensity = more creative
  const intensityAdjustment = (toneIntensity - 3) * 0.05

  const finalTemp = Math.max(0.3, Math.min(0.9, baseTemp + intensityAdjustment))

  return finalTemp
}

/**
 * Calculate max tokens based on requested word count
 * Rule of thumb: 1 word ≈ 1.3 tokens
 */
function calculateMaxTokens(wordCount: number): number {
  // Add 30% buffer for longer tokens, formatting, and overhead
  const tokensNeeded = Math.ceil(wordCount * 1.3 * 1.3)

  // Cap at reasonable maximum
  return Math.min(tokensNeeded, 4000)
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Validate generated content quality
 */
export function validateGeneratedContent(
  content: string,
  params: ContentGenerationParams
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check if content exists
  if (!content || content.trim().length === 0) {
    issues.push('Generated content is empty')
    return { valid: false, issues }
  }

  // Check word count accuracy (within ±20%)
  const actualWordCount = countWords(content)
  const deviation = Math.abs(actualWordCount - params.wordCount) / params.wordCount

  if (deviation > 0.2) {
    issues.push(
      `Word count deviation too large: requested ${params.wordCount}, got ${actualWordCount} (${Math.round(deviation * 100)}%)`
    )
  }

  // Check for common AI artifacts
  const artifacts = [
    'as an ai',
    'i cannot',
    'i apologize',
    'i don\'t have',
    'i am not able'
  ]

  const lowerContent = content.toLowerCase()
  for (const artifact of artifacts) {
    if (lowerContent.includes(artifact)) {
      issues.push(`Content contains AI artifact: "${artifact}"`)
    }
  }

  // Check for generic/template language
  const genericPhrases = [
    'click here to learn more',
    'contact us today',
    'limited time offer',
    'act now'
  ]

  for (const phrase of genericPhrases) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      issues.push(`Content contains generic phrase: "${phrase}"`)
    }
  }

  // Check minimum content length
  if (actualWordCount < 50) {
    issues.push('Content is too short (less than 50 words)')
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Batch generate multiple content pieces
 * Useful for generating variations or multiple platform versions
 */
export async function batchGenerateContent(
  voiceProfile: BrandVoiceProfile,
  paramsArray: ContentGenerationParams[]
): Promise<GeneratedContentResult[]> {
  const results: GeneratedContentResult[] = []

  // Generate sequentially to avoid rate limits
  for (const params of paramsArray) {
    try {
      const result = await generateContent(voiceProfile, params)
      results.push(result)

      // Small delay between generations to be respectful of API limits
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error('Batch generation error:', error)
      // Continue with next item even if one fails
    }
  }

  return results
}
