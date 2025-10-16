/**
 * Content Post-Processor
 * Cleans, formats, and enhances generated content
 */

import { countWords } from './content-generator'
import type { ContentType } from './content-prompts'

export interface PostProcessingOptions {
  trimToWordCount?: number
  formatMarkdown?: boolean
  formatHTML?: boolean
  removeAIArtifacts?: boolean
  addMetadata?: boolean
}

export interface PostProcessedContent {
  content: string
  originalWordCount: number
  finalWordCount: number
  wasModified: boolean
  modifications: string[]
  metadata?: ContentMetadata
}

export interface ContentMetadata {
  generatedAt: string
  contentType: ContentType
  wordCount: number
  characterCount: number
  readingTimeMinutes: number
  seoScore?: number
}

/**
 * Post-process generated content
 */
export function postProcessContent(
  content: string,
  contentType: ContentType,
  options: PostProcessingOptions = {}
): PostProcessedContent {
  const modifications: string[] = []
  let processedContent = content
  const originalWordCount = countWords(content)

  // Remove AI artifacts
  if (options.removeAIArtifacts !== false) {
    const { content: cleaned, found } = removeAIArtifacts(processedContent)
    if (found.length > 0) {
      processedContent = cleaned
      modifications.push(`Removed AI artifacts: ${found.join(', ')}`)
    }
  }

  // Trim to word count if specified
  if (options.trimToWordCount) {
    const { content: trimmed, wasTrimmed } = trimToWordCount(
      processedContent,
      options.trimToWordCount
    )
    if (wasTrimmed) {
      processedContent = trimmed
      modifications.push(`Trimmed to ${options.trimToWordCount} words`)
    }
  }

  // Format markdown
  if (options.formatMarkdown) {
    processedContent = formatMarkdown(processedContent, contentType)
    modifications.push('Applied markdown formatting')
  }

  // Format HTML
  if (options.formatHTML) {
    processedContent = formatHTML(processedContent, contentType)
    modifications.push('Applied HTML formatting')
  }

  // Clean up whitespace and formatting
  processedContent = cleanWhitespace(processedContent)

  const finalWordCount = countWords(processedContent)
  const wasModified = processedContent !== content

  // Generate metadata if requested
  const metadata = options.addMetadata
    ? generateMetadata(processedContent, contentType)
    : undefined

  return {
    content: processedContent,
    originalWordCount,
    finalWordCount,
    wasModified,
    modifications,
    metadata
  }
}

/**
 * Remove common AI artifacts from content
 */
function removeAIArtifacts(content: string): { content: string; found: string[] } {
  const artifacts = [
    { pattern: /as an ai language model,?\s*/gi, name: 'AI disclaimer' },
    { pattern: /i cannot (provide|create|generate|write)/gi, name: 'AI limitation' },
    { pattern: /i apologize,?\s*/gi, name: 'AI apology' },
    { pattern: /i don't have (access|the ability|information)/gi, name: 'AI limitation' },
    { pattern: /\[insert\s+\w+\s+here\]/gi, name: 'Placeholder' },
    { pattern: /\[your\s+\w+\]/gi, name: 'Template placeholder' }
  ]

  let cleaned = content
  const found: string[] = []

  for (const artifact of artifacts) {
    if (artifact.pattern.test(cleaned)) {
      cleaned = cleaned.replace(artifact.pattern, '')
      found.push(artifact.name)
    }
  }

  return { content: cleaned, found }
}

/**
 * Trim content to target word count
 */
function trimToWordCount(content: string, targetWordCount: number): {
  content: string
  wasTrimmed: boolean
} {
  const words = content.split(/\s+/)

  if (words.length <= targetWordCount) {
    return { content, wasTrimmed: false }
  }

  // Trim to target, trying to end at a sentence
  let trimmedWords = words.slice(0, targetWordCount)
  let trimmedText = trimmedWords.join(' ')

  // Try to find last complete sentence
  const lastPeriod = trimmedText.lastIndexOf('.')
  const lastQuestion = trimmedText.lastIndexOf('?')
  const lastExclamation = trimmedText.lastIndexOf('!')

  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation)

  if (lastSentenceEnd > trimmedText.length * 0.8) {
    // If we can end at a sentence without losing too much, do it
    trimmedText = trimmedText.substring(0, lastSentenceEnd + 1)
  }

  return {
    content: trimmedText,
    wasTrimmed: true
  }
}

/**
 * Format content as markdown
 */
function formatMarkdown(content: string, contentType: ContentType): string {
  let formatted = content

  // Ensure proper heading hierarchy
  formatted = formatted.replace(/^([A-Z][A-Z\s]+)$/gm, (match) => {
    if (match.length < 50 && match.trim().length > 3) {
      return `## ${match.trim()}`
    }
    return match
  })

  // Format lists
  formatted = formatted.replace(/^[-•]\s+/gm, '- ')

  return formatted
}

/**
 * Format content as HTML
 */
function formatHTML(content: string, contentType: ContentType): string {
  let formatted = content

  // Wrap paragraphs
  const paragraphs = formatted.split(/\n\n+/)
  formatted = paragraphs
    .filter(p => p.trim().length > 0)
    .map(p => `<p>${p.trim()}</p>`)
    .join('\n\n')

  // Format headings (## Heading -> <h2>)
  formatted = formatted.replace(/##\s+(.+)/g, '<h2>$1</h2>')
  formatted = formatted.replace(/#\s+(.+)/g, '<h1>$1</h1>')

  // Format lists
  formatted = formatted.replace(/^-\s+(.+)$/gm, '<li>$1</li>')

  return formatted
}

/**
 * Clean up whitespace and formatting issues
 */
function cleanWhitespace(content: string): string {
  let cleaned = content

  // Remove excessive blank lines (max 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Remove trailing whitespace from lines
  cleaned = cleaned.replace(/[ \t]+$/gm, '')

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim()

  // Ensure single space after punctuation
  cleaned = cleaned.replace(/([.!?])\s{2,}/g, '$1 ')

  // Fix common formatting issues
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1') // Remove space before punctuation
  cleaned = cleaned.replace(/([.,!?;:])\s{2,}/g, '$1 ') // Single space after punctuation

  return cleaned
}

/**
 * Generate content metadata
 */
function generateMetadata(content: string, contentType: ContentType): ContentMetadata {
  const wordCount = countWords(content)
  const characterCount = content.length

  // Average reading speed: 200 words per minute
  const readingTimeMinutes = Math.ceil(wordCount / 200)

  return {
    generatedAt: new Date().toISOString(),
    contentType,
    wordCount,
    characterCount,
    readingTimeMinutes
  }
}

/**
 * Extract and format CTA from content
 */
export function extractCTA(content: string): string | null {
  // Look for common CTA patterns at the end of content
  const ctaPatterns = [
    /(?:call to action|cta):\s*(.+?)(?:\n|$)/i,
    /(?:^|\n)(.+?(?:shop now|learn more|visit|contact us|get started).+?)(?:\n|$)/i
  ]

  for (const pattern of ctaPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Calculate SEO score (basic heuristic)
 */
export function calculateSEOScore(content: string, targetKeywords?: string[]): number {
  let score = 0
  const wordCount = countWords(content)

  // Length score (0-30 points)
  if (wordCount >= 500 && wordCount <= 2000) {
    score += 30
  } else if (wordCount >= 300) {
    score += 15
  }

  // Readability score (0-20 points)
  const avgWordsPerSentence = calculateAvgWordsPerSentence(content)
  if (avgWordsPerSentence >= 12 && avgWordsPerSentence <= 20) {
    score += 20
  } else if (avgWordsPerSentence >= 8) {
    score += 10
  }

  // Structure score (0-20 points)
  const hasHeadings = /#{1,3}\s+.+/m.test(content) || /<h[1-3]>/i.test(content)
  const hasParagraphs = content.split(/\n\n+/).length >= 3

  if (hasHeadings) score += 10
  if (hasParagraphs) score += 10

  // Keyword score (0-30 points) - if keywords provided
  if (targetKeywords && targetKeywords.length > 0) {
    const lowerContent = content.toLowerCase()
    const keywordDensity = targetKeywords.filter(kw =>
      lowerContent.includes(kw.toLowerCase())
    ).length / targetKeywords.length

    score += Math.round(keywordDensity * 30)
  } else {
    score += 15 // Default partial credit if no keywords specified
  }

  return Math.min(100, score)
}

/**
 * Calculate average words per sentence
 */
function calculateAvgWordsPerSentence(content: string): number {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length === 0) return 0

  const totalWords = sentences.reduce((sum, sentence) => {
    return sum + countWords(sentence)
  }, 0)

  return totalWords / sentences.length
}
