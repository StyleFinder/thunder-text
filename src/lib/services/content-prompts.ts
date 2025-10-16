/**
 * Content Generation Prompts
 * Templates for generating different types of content with brand voice
 */

export type ContentType = 'blog' | 'ad' | 'store_copy' | 'social_facebook' | 'social_instagram' | 'social_tiktok'
export type CTAType = 'shop_now' | 'learn_more' | 'visit_website' | 'contact_us' | 'custom'

interface PromptTemplateParams {
  voiceProfile: string
  topic: string
  wordCount: number
  toneIntensity: number
  ctaType: CTAType
  customCTA?: string
  platform?: string
  additionalContext?: string
}

/**
 * Base system prompt that applies to all content types
 */
export const BASE_SYSTEM_PROMPT = `You are a professional content writer specializing in creating on-brand content that matches a specific brand voice.

Your writing must:
1. MATCH THE VOICE PROFILE EXACTLY - This is the most important requirement
2. Be authentic and engaging, not generic or robotic
3. Follow the specified parameters (word count, tone, structure)
4. Integrate CTAs naturally, never force them
5. Avoid clichés and overused marketing phrases

Quality standards:
- Use specific, concrete details over vague descriptions
- Write in active voice
- Vary sentence structure for natural flow
- Match the emotional tone to the brand voice
- Be grammatically perfect

CRITICAL: The brand voice profile is the foundation. Every sentence should sound like it was written by the person whose voice you're matching.`

/**
 * Content type specific prompts
 */
export const CONTENT_TYPE_PROMPTS = {
  blog: (params: PromptTemplateParams) => `
CONTENT TYPE: Blog Post

Write a blog post about: ${params.topic}

TARGET LENGTH: ${params.wordCount} words (±10%)
TONE INTENSITY: ${getToneIntensityDescription(params.toneIntensity)}

STRUCTURE REQUIREMENTS:
- Engaging headline (not included in word count)
- Strong opening hook (first 2-3 sentences)
- 3-5 main sections with subheadings
- Natural conclusion
- Call-to-action: ${getCTAText(params.ctaType, params.customCTA)}

STYLE GUIDELINES:
- Blog posts should be conversational and valuable
- Use examples, stories, or data to support points
- Break up text with subheadings for scannability
- End with actionable takeaway or next steps

${params.additionalContext ? `ADDITIONAL CONTEXT:\n${params.additionalContext}\n` : ''}

Write the blog post now, matching the brand voice profile exactly.`,

  ad: (params: PromptTemplateParams) => `
CONTENT TYPE: Advertisement Copy

Write advertisement copy about: ${params.topic}

TARGET LENGTH: ${params.wordCount} words (±10%)
TONE INTENSITY: ${getToneIntensityDescription(params.toneIntensity)}

AD STRUCTURE:
- Attention-grabbing headline
- Problem or desire identification
- Solution presentation with benefits
- Social proof or credibility (if appropriate)
- Strong call-to-action: ${getCTAText(params.ctaType, params.customCTA)}

AD WRITING PRINCIPLES:
- Lead with benefit, not feature
- Create urgency without being pushy
- Address one clear audience persona
- Use power words that match the brand voice
- Make the CTA impossible to ignore

${params.additionalContext ? `ADDITIONAL CONTEXT:\n${params.additionalContext}\n` : ''}

Write the ad copy now, matching the brand voice profile exactly.`,

  store_copy: (params: PromptTemplateParams) => `
CONTENT TYPE: Store/Website Copy

Write store copy about: ${params.topic}

TARGET LENGTH: ${params.wordCount} words (±10%)
TONE INTENSITY: ${getToneIntensityDescription(params.toneIntensity)}

COPY STRUCTURE:
- Clear, benefit-driven headline
- Value proposition (why choose this)
- Key features or offerings
- Trust builders (quality, guarantee, support)
- Clear call-to-action: ${getCTAText(params.ctaType, params.customCTA)}

STORE COPY GUIDELINES:
- Focus on customer benefits, not just features
- Address common objections preemptively
- Use sensory language to create experience
- Build trust and credibility
- Make purchasing decision easy

${params.additionalContext ? `ADDITIONAL CONTEXT:\n${params.additionalContext}\n` : ''}

Write the store copy now, matching the brand voice profile exactly.`,

  social_facebook: (params: PromptTemplateParams) => `
CONTENT TYPE: Facebook Post

Write a Facebook post about: ${params.topic}

TARGET LENGTH: ${params.wordCount} words (±10%)
TONE INTENSITY: ${getToneIntensityDescription(params.toneIntensity)}
PLATFORM: Facebook

FACEBOOK POST STRUCTURE:
- Strong opening hook (first line is critical)
- 2-4 short paragraphs
- Visual/emotional connection
- Call-to-action: ${getCTAText(params.ctaType, params.customCTA)}

FACEBOOK BEST PRACTICES:
- First sentence must grab attention (appears in preview)
- Use line breaks for readability
- Conversational and relatable tone
- Encourage engagement (questions, reactions)
- Link placement at end

${params.additionalContext ? `ADDITIONAL CONTEXT:\n${params.additionalContext}\n` : ''}

Write the Facebook post now, matching the brand voice profile exactly.`,

  social_instagram: (params: PromptTemplateParams) => `
CONTENT TYPE: Instagram Caption

Write an Instagram caption about: ${params.topic}

TARGET LENGTH: ${params.wordCount} words (±10%)
TONE INTENSITY: ${getToneIntensityDescription(params.toneIntensity)}
PLATFORM: Instagram

INSTAGRAM CAPTION STRUCTURE:
- Compelling first line (critical for engagement)
- Visual description or story
- Value or insight
- Call-to-action: ${getCTAText(params.ctaType, params.customCTA)}
- Relevant hashtags (5-10)

INSTAGRAM BEST PRACTICES:
- First line determines if people "see more"
- Emojis are acceptable if they match brand voice
- Tell a story or share insight
- Connect to visual content
- End with engaging question or CTA

${params.additionalContext ? `ADDITIONAL CONTEXT:\n${params.additionalContext}\n` : ''}

Write the Instagram caption now, matching the brand voice profile exactly.`,

  social_tiktok: (params: PromptTemplateParams) => `
CONTENT TYPE: TikTok Caption/Script

Write TikTok content about: ${params.topic}

TARGET LENGTH: ${params.wordCount} words (±10%)
TONE INTENSITY: ${getToneIntensityDescription(params.toneIntensity)}
PLATFORM: TikTok

TIKTOK CONTENT STRUCTURE:
- Hook: Immediate attention grab (first 3 seconds)
- Setup: Context or problem
- Value: Insight, tip, or entertainment
- Payoff: Resolution or reveal
- Call-to-action: ${getCTAText(params.ctaType, params.customCTA)}

TIKTOK WRITING STYLE:
- Casual, authentic, conversational
- Short sentences and phrases
- Natural speech patterns
- Trending phrases acceptable if genuine
- Focus on value and entertainment

${params.additionalContext ? `ADDITIONAL CONTEXT:\n${params.additionalContext}\n` : ''}

Write the TikTok content now, matching the brand voice profile exactly.`
}

/**
 * Construct full user prompt with voice profile
 */
export function buildContentPrompt(
  contentType: ContentType,
  voiceProfile: string,
  params: PromptTemplateParams
): string {
  const contentPrompt = CONTENT_TYPE_PROMPTS[contentType](params)

  return `
BRAND VOICE PROFILE:
${voiceProfile}

---

${contentPrompt}

REMEMBER: Every word must sound like it was written by the person described in the brand voice profile above. This is not optional.
`
}

/**
 * Get tone intensity description
 */
function getToneIntensityDescription(intensity: number): string {
  const descriptions: Record<number, string> = {
    1: 'Very subtle and understated - minimal personality',
    2: 'Gentle and balanced - light personality touch',
    3: 'Moderate - noticeable personality while professional',
    4: 'Strong and expressive - bold personality shines through',
    5: 'Maximum intensity - full personality on display'
  }
  return descriptions[intensity] || descriptions[3]
}

/**
 * Get CTA text based on type
 */
function getCTAText(type: CTAType, customText?: string): string {
  if (type === 'custom' && customText) {
    return customText
  }

  const ctas: Record<CTAType, string> = {
    shop_now: 'Shop Now',
    learn_more: 'Learn More',
    visit_website: 'Visit Our Website',
    contact_us: 'Contact Us',
    custom: customText || 'Take Action'
  }

  return ctas[type]
}

/**
 * Validate content generation parameters
 */
export function validateContentParams(params: PromptTemplateParams): { valid: boolean; error?: string } {
  if (params.wordCount < 50 || params.wordCount > 2000) {
    return { valid: false, error: 'Word count must be between 50 and 2000' }
  }

  if (params.toneIntensity < 1 || params.toneIntensity > 5) {
    return { valid: false, error: 'Tone intensity must be between 1 and 5' }
  }

  if (!params.topic || params.topic.trim().length === 0) {
    return { valid: false, error: 'Topic is required' }
  }

  if (params.topic.length > 500) {
    return { valid: false, error: 'Topic must be less than 500 characters' }
  }

  return { valid: true }
}
