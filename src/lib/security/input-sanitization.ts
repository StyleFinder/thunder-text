/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize and validate user input to prevent:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL Injection (additional layer beyond parameterized queries)
 * - NoSQL Injection
 * - Command Injection
 * - Path Traversal
 */

/**
 * Remove potentially dangerous HTML tags and scripts
 *
 * @param input - Raw user input
 * @returns Sanitized string safe for display
 */
export function sanitizeHTML(input: string): string {
  if (!input) return ''

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '')

  // Remove potentially dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'applet', 'meta', 'link', 'style']
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi')
    sanitized = sanitized.replace(regex, '')
  })

  return sanitized.trim()
}

/**
 * Sanitize text for content samples (preserve formatting but remove scripts)
 *
 * @param input - Raw content sample text
 * @returns Sanitized text safe for storage and processing
 */
export function sanitizeContentSample(input: string): string {
  if (!input) return ''

  // For content samples, we want to preserve most text but remove dangerous scripts
  let sanitized = input

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/data:text\/html/gi, '')

  return sanitized.trim()
}

/**
 * Validate and sanitize email addresses
 *
 * @param email - Email address to validate
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null

  const trimmed = email.trim().toLowerCase()

  // Basic email regex (not perfect but good enough for sanitization)
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

  if (!emailRegex.test(trimmed)) {
    return null
  }

  return trimmed
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or null if dangerous
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null

  const trimmed = url.trim()

  // Reject dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerUrl = trimmed.toLowerCase()

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return null
    }
  }

  // Only allow http, https, and relative URLs
  if (!/^(https?:\/\/|\/)/i.test(trimmed)) {
    return null
  }

  return trimmed
}

/**
 * Sanitize filename to prevent path traversal attacks
 *
 * @param filename - Filename to sanitize
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return ''

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '')
  sanitized = sanitized.replace(/[/\\]/g, '')

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '')

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop()
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
    sanitized = nameWithoutExt.substring(0, 250) + (ext ? '.' + ext : '')
  }

  return sanitized.trim()
}

/**
 * Validate word count is within acceptable range
 *
 * @param text - Text to count words in
 * @param min - Minimum word count
 * @param max - Maximum word count
 * @returns Validation result
 */
export function validateWordCount(
  text: string,
  min: number,
  max: number
): { valid: boolean; count: number; error?: string } {
  const words = text.trim().split(/\s+/).filter(word => word.length > 0)
  const count = words.length

  if (count < min) {
    return {
      valid: false,
      count,
      error: `Text must contain at least ${min} words. Current: ${count} words.`
    }
  }

  if (count > max) {
    return {
      valid: false,
      count,
      error: `Text must contain at most ${max} words. Current: ${count} words.`
    }
  }

  return { valid: true, count }
}

/**
 * Validate and sanitize JSON input
 *
 * @param input - JSON string to validate
 * @returns Parsed and validated JSON or null if invalid
 */
export function sanitizeJSON(input: string): unknown | null {
  try {
    const parsed = JSON.parse(input)

    // Recursively sanitize string values in the JSON
    const sanitizeObject = (obj: unknown): unknown => {
      if (typeof obj === 'string') {
        return sanitizeHTML(obj)
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
      }

      if (obj !== null && typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value)
        }
        return sanitized
      }

      return obj
    }

    return sanitizeObject(parsed)
  } catch (error) {
    return null
  }
}

/**
 * Validate content type is allowed
 *
 * @param contentType - Content type to validate
 * @returns True if valid, false otherwise
 */
export function validateContentType(contentType: string): boolean {
  const allowedTypes = [
    'blog',
    'ad',
    'store_copy',
    'social_facebook',
    'social_instagram',
    'social_tiktok'
  ]

  return allowedTypes.includes(contentType)
}

/**
 * Validate sample type is allowed
 *
 * @param sampleType - Sample type to validate
 * @returns True if valid, false otherwise
 */
export function validateSampleType(sampleType: string): boolean {
  const allowedTypes = ['blog', 'email', 'description', 'other']
  return allowedTypes.includes(sampleType)
}

/**
 * Rate limit text length to prevent abuse
 *
 * @param text - Text to validate
 * @param maxLength - Maximum allowed length
 * @returns Validation result
 */
export function validateTextLength(
  text: string,
  maxLength: number
): { valid: boolean; length: number; error?: string } {
  const length = text.length

  if (length > maxLength) {
    return {
      valid: false,
      length,
      error: `Text exceeds maximum length of ${maxLength} characters. Current: ${length} characters.`
    }
  }

  return { valid: true, length }
}

/**
 * Comprehensive input sanitization for content samples
 *
 * @param input - Raw sample input
 * @returns Sanitized and validated sample or error
 */
export function sanitizeAndValidateSample(input: {
  sample_text: string
  sample_type: string
}): { valid: boolean; sanitized?: { sample_text: string; sample_type: string }; error?: string } {
  // Validate sample type
  if (!validateSampleType(input.sample_type)) {
    return {
      valid: false,
      error: 'Invalid sample type. Must be: blog, email, description, or other.'
    }
  }

  // Sanitize text
  const sanitizedText = sanitizeContentSample(input.sample_text)

  // Validate text length (max 50,000 characters to prevent abuse)
  const lengthCheck = validateTextLength(sanitizedText, 50000)
  if (!lengthCheck.valid) {
    return { valid: false, error: lengthCheck.error }
  }

  // Validate word count (500-5000 words)
  const wordCountCheck = validateWordCount(sanitizedText, 500, 5000)
  if (!wordCountCheck.valid) {
    return { valid: false, error: wordCountCheck.error }
  }

  return {
    valid: true,
    sanitized: {
      sample_text: sanitizedText,
      sample_type: input.sample_type
    }
  }
}
