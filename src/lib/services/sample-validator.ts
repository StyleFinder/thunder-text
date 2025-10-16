/**
 * Sample Validation Service
 * Validates content samples before upload
 */

import { countWords } from './file-parser'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    wordCount: number
    characterCount: number
    sentenceCount: number
    avgWordLength: number
  }
}

const MIN_WORD_COUNT = 500
const MAX_WORD_COUNT = 5000
const MIN_SENTENCE_COUNT = 10
const MAX_CHARACTER_COUNT = 50000

/**
 * Comprehensive sample validation
 */
export function validateSample(text: string, sampleType: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Basic validation
  if (!text || text.trim().length === 0) {
    errors.push('Sample text cannot be empty')
    return {
      valid: false,
      errors,
      warnings,
      stats: { wordCount: 0, characterCount: 0, sentenceCount: 0, avgWordLength: 0 }
    }
  }

  // Calculate statistics
  const stats = calculateStats(text)

  // Word count validation
  if (stats.wordCount < MIN_WORD_COUNT) {
    errors.push(`Sample must contain at least ${MIN_WORD_COUNT} words (current: ${stats.wordCount})`)
  } else if (stats.wordCount > MAX_WORD_COUNT) {
    errors.push(`Sample must not exceed ${MAX_WORD_COUNT} words (current: ${stats.wordCount})`)
  }

  // Character count validation
  if (stats.characterCount > MAX_CHARACTER_COUNT) {
    errors.push(`Sample is too long (${stats.characterCount} characters). Maximum is ${MAX_CHARACTER_COUNT} characters.`)
  }

  // Sentence count validation
  if (stats.sentenceCount < MIN_SENTENCE_COUNT) {
    warnings.push(`Sample has only ${stats.sentenceCount} sentences. More sentences (at least ${MIN_SENTENCE_COUNT}) will help build a better voice profile.`)
  }

  // Quality checks
  const qualityChecks = performQualityChecks(text, stats)
  warnings.push(...qualityChecks.warnings)
  errors.push(...qualityChecks.errors)

  // Sample type specific validation
  const typeValidation = validateSampleType(text, sampleType)
  warnings.push(...typeValidation.warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  }
}

/**
 * Calculate text statistics
 */
function calculateStats(text: string) {
  const trimmedText = text.trim()
  const wordCount = countWords(trimmedText)
  const characterCount = trimmedText.length
  const sentences = trimmedText.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const sentenceCount = sentences.length
  const avgWordLength = wordCount > 0 ? characterCount / wordCount : 0

  return {
    wordCount,
    characterCount,
    sentenceCount,
    avgWordLength
  }
}

/**
 * Perform quality checks on sample
 */
function performQualityChecks(text: string, stats: { wordCount: number; avgWordLength: number }) {
  const warnings: string[] = []
  const errors: string[] = []

  // Check for very short average word length (might be gibberish)
  if (stats.avgWordLength < 3) {
    warnings.push('Average word length seems unusually short. Please ensure this is real content.')
  }

  // Check for very long average word length (might be URLs or code)
  if (stats.avgWordLength > 10) {
    warnings.push('Average word length seems unusually long. This might affect voice profile quality.')
  }

  // Check for excessive repetition
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const uniqueWords = new Set(words)
  const uniqueRatio = uniqueWords.size / words.length

  if (uniqueRatio < 0.3) {
    warnings.push('Text seems highly repetitive. More varied vocabulary will create a better voice profile.')
  }

  // Check for excessive capitalization (might be spam/promotional)
  const upperCaseCount = (text.match(/[A-Z]/g) || []).length
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length
  const upperCaseRatio = upperCaseCount / letterCount

  if (upperCaseRatio > 0.3) {
    warnings.push('Excessive capitalization detected. This might affect voice profile quality.')
  }

  // Check for code/technical content
  const codePatterns = [/function\s+\w+\s*\(/, /class\s+\w+/, /import\s+\w+/, /const\s+\w+\s*=/, /<\w+>/]
  const hasCodePatterns = codePatterns.some(pattern => pattern.test(text))

  if (hasCodePatterns) {
    warnings.push('Content appears to contain code. Voice profiles work best with natural writing.')
  }

  return { warnings, errors }
}

/**
 * Sample type specific validation
 */
function validateSampleType(text: string, sampleType: string) {
  const warnings: string[] = []

  switch (sampleType) {
    case 'blog':
      // Blog posts should have paragraphs
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
      if (paragraphs.length < 3) {
        warnings.push('Blog posts typically have multiple paragraphs. Consider adding more structure.')
      }
      break

    case 'email':
      // Emails should have some structure
      const hasGreeting = /^(hi|hello|dear|hey)\b/i.test(text.trim())
      const hasClosing = /(sincerely|regards|best|thanks|cheers)\b/i.test(text.trim())
      if (!hasGreeting && !hasClosing) {
        warnings.push('Email samples work best when they include typical email structure (greeting/closing).')
      }
      break

    case 'description':
      // Product descriptions should be concise
      const wordCount = countWords(text)
      if (wordCount > 2000) {
        warnings.push('Product descriptions are typically shorter. Consider using a more concise sample.')
      }
      break

    case 'other':
      // No specific validation for 'other' type
      break
  }

  return { warnings }
}

/**
 * Quick validation for client-side checks (minimal, fast)
 */
export function quickValidate(text: string): { valid: boolean; message?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, message: 'Sample text cannot be empty' }
  }

  const wordCount = countWords(text)

  if (wordCount < MIN_WORD_COUNT) {
    return { valid: false, message: `Need at least ${MIN_WORD_COUNT} words (current: ${wordCount})` }
  }

  if (wordCount > MAX_WORD_COUNT) {
    return { valid: false, message: `Maximum ${MAX_WORD_COUNT} words allowed (current: ${wordCount})` }
  }

  return { valid: true }
}
