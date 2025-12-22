/**
 * AIE Ad Generator
 * Generates ad copy using GPT-4 with RAG context
 */

import { aieOpenAI } from './clients';
import type {
  AIEPlatform,
  AIEGoal,
  AIEVariantType,
  AIERAGContext,
  AIEAdVariantDraft,
  AIEBrandVoice,
} from './types';
import { AIEGenerationError } from './types';
import { logger } from '@/lib/logger'
import {
  determineVariantTypes,
  selectHookTechnique,
  selectTone,
  validateCharacterLimits,
} from './utils';
import { createRequestTracker } from '@/lib/monitoring/request-logger';
import { logError } from '@/lib/monitoring/error-logger';

/**
 * Generate 3 ad variants using GPT-4 with RAG context
 */
export async function generateAdVariants(params: {
  description: string;
  platform: AIEPlatform;
  goal: AIEGoal;
  category: string;
  ragContext: AIERAGContext;
  brandVoice?: AIEBrandVoice;
  targetAudience?: string;
  imageUrl?: string;
}): Promise<AIEAdVariantDraft[]> {
  try {
    console.log(`🎨 Generating 3 ad variants for ${params.platform}/${params.goal}`);

    // Determine variant types (3 different approaches)
    const variantTypes = determineVariantTypes(params.platform, params.goal);

    // Generate each variant
    const variants: AIEAdVariantDraft[] = [];

    for (let i = 0; i < 3; i++) {
      const variantType = variantTypes[i];
      const hookTechnique = selectHookTechnique(variantType);
      const tone = selectTone(variantType, params.platform);

      console.log(
        `  Variant ${i + 1}: ${variantType} (${hookTechnique} hook, ${tone} tone)`
      );

      const variant = await generateSingleVariant({
        ...params,
        variantNumber: i + 1,
        variantType,
        hookTechnique,
        tone,
      });

      variants.push(variant);

      // Rate limiting: Wait 500ms between GPT-4 calls
      if (i < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }


    return variants;
  } catch (error) {
    logger.error('Error generating ad variants:', error as Error, { component: 'ad-generator' });
    throw new AIEGenerationError(
      'Failed to generate ad variants',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate a single ad variant
 */
async function generateSingleVariant(params: {
  description: string;
  platform: AIEPlatform;
  goal: AIEGoal;
  category: string;
  ragContext: AIERAGContext;
  variantNumber: number;
  variantType: AIEVariantType;
  hookTechnique: string;
  tone: string;
  brandVoice?: AIEBrandVoice;
  targetAudience?: string;
  imageUrl?: string;
  shopId?: string;
}): Promise<AIEAdVariantDraft> {
  // Create request tracker for monitoring
  const tracker = createRequestTracker('ad_generation', params.shopId);

  // Build the prompt with RAG context
  const prompt = buildGenerationPrompt(params);
  const systemPrompt = `You are an expert ad copywriter specializing in ${params.platform} ads.
You create high-converting ad copy based on proven frameworks and best practices.
Always follow platform-specific guidelines and character limits.
Generate ads in JSON format with clear structure.`;

  try {
    // Call GPT-4o-mini for ad generation (text-only, cost-effective)
    const response = await aieOpenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.8, // Higher creativity for ad copy
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from GPT-4');
    }

    // Log successful request
    const inputTokens = response.usage?.prompt_tokens || Math.ceil((systemPrompt.length + prompt.length) / 4);
    const outputTokens = response.usage?.completion_tokens || Math.ceil(content.length / 4);

    await tracker.complete({
      model: 'gpt-4o-mini',
      inputTokens,
      outputTokens,
      endpoint: 'chat.completions',
      metadata: {
        platform: params.platform,
        goal: params.goal,
        variantNumber: params.variantNumber,
        variantType: params.variantType
      }
    });

    const generated = JSON.parse(content);

    // Validate character limits
    const validation = validateCharacterLimits({
      platform: params.platform,
      headline: generated.headline,
      primaryText: generated.primary_text,
      description: generated.description,
    });

    if (!validation.valid) {
      console.warn(`⚠️  Character limit warnings:`, validation.errors);
    }

    // Build variant draft
    const variant: AIEAdVariantDraft = {
      id: '', // Will be set by database
      ad_request_id: '', // Will be set when saved
      variant_number: params.variantNumber,
      variant_type: params.variantType,
      headline: generated.headline,
      headline_alternatives: generated.headline_alternatives || [],
      primary_text: generated.primary_text,
      description: generated.description,
      cta: generated.cta,
      cta_rationale: generated.cta_rationale,
      hook_technique: params.hookTechnique as any,
      tone: params.tone as any,
      predicted_score: 0, // Will be calculated
      score_breakdown: {
        brand_fit: 0,
        context_relevance: 0,
        platform_compliance: 0,
        hook_strength: 0,
        cta_clarity: 0,
      },
      generation_reasoning: generated.reasoning,
      rag_context_used: {
        best_practice_ids: params.ragContext.best_practices
          .slice(0, 5)
          .map((bp) => bp.id),
        example_ids: params.ragContext.ad_examples.slice(0, 3).map((ex) => ex.id),
      },
      is_selected: false,
      user_edited: false,
      edit_history: [],
      metadata: {
        best_practices_used: params.ragContext.best_practices
          .slice(0, 5)
          .map((bp) => ({
            id: bp.id,
            title: bp.title,
            similarity: bp.similarity,
          })),
        examples_referenced: params.ragContext.ad_examples.slice(0, 3).map((ex) => ({
          id: ex.id,
          headline: ex.headline,
          similarity: ex.similarity,
        })),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return variant;
  } catch (error) {
    // Log error to monitoring system
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.toLowerCase().includes('timeout');
    const isRateLimited = errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('429');

    await tracker.error({
      model: 'gpt-4o-mini',
      errorCode: isRateLimited ? '429' : undefined,
      errorMessage,
      endpoint: 'chat.completions',
      isTimeout,
      isRateLimited
    });

    await logError({
      errorType: isTimeout ? 'timeout' : isRateLimited ? 'rate_limit' : 'api_error',
      errorMessage,
      shopId: params.shopId,
      endpoint: 'ad-generator',
      operationType: 'ad_generation',
      requestData: {
        platform: params.platform,
        goal: params.goal,
        variantNumber: params.variantNumber
      }
    });

    throw error;
  }
}

/**
 * Build generation prompt with RAG context
 */
function buildGenerationPrompt(params: {
  description: string;
  platform: AIEPlatform;
  goal: AIEGoal;
  category: string;
  ragContext: AIERAGContext;
  variantType: AIEVariantType;
  hookTechnique: string;
  tone: string;
  brandVoice?: AIEBrandVoice;
  targetAudience?: string;
}): string {
  const sections: string[] = [];

  // Section 1: Task description
  sections.push(`# Task: Generate ${params.platform} Ad Copy

**Variant Type**: ${params.variantType}
**Hook Technique**: ${params.hookTechnique}
**Tone**: ${params.tone}
**Campaign Goal**: ${params.goal}
**Category**: ${params.category}
${params.targetAudience ? `**Target Audience**: ${params.targetAudience}` : ''}`);

  // Section 2: Product/Service Description
  sections.push(`# Product/Service Description

${params.description}`);

  // Section 3: Brand Voice (if provided)
  if (params.brandVoice) {
    const forbiddenWords = params.brandVoice.forbidden_words?.join(', ') || 'None';
    sections.push(`# Brand Voice Guidelines

**Tone**: ${params.brandVoice.tone || 'Not specified'}
**Values**: ${params.brandVoice.values?.join(', ') || 'Not specified'}
**Forbidden Words**: ${forbiddenWords}
**Example Copy**: ${params.brandVoice.example_copy || 'Not provided'}`);
  }

  // Section 4: Best Practices (Top 5 most relevant)
  sections.push(`# Relevant Best Practices (Apply These)

${params.ragContext.best_practices
  .slice(0, 5)
  .map(
    (bp, idx) =>
      `${idx + 1}. **${bp.title}** (similarity: ${((bp.similarity || 0) * 100).toFixed(0)}%)
   ${bp.description}
   ${bp.example_text ? `Example: "${bp.example_text}"` : ''}`
  )
  .join('\n\n')}`);

  // Section 5: High-Performing Examples (if available)
  if (params.ragContext.ad_examples.length > 0) {
    sections.push(`# High-Performing Ad Examples (For Inspiration)

${params.ragContext.ad_examples
  .slice(0, 3)
  .map(
    (ex, idx) =>
      `${idx + 1}. ${ex.headline ? `Headline: "${ex.headline}"` : ''}
   Primary Text: "${ex.primary_text.substring(0, 100)}..."
   Hook: ${ex.hook_type}, Tone: ${ex.tone}
   Performance: ${ex.performance_tag} (${ex.performance_percentile}th percentile)`
  )
  .join('\n\n')}`);
  }

  // Section 6: Platform Guidelines
  const platformGuidelines = getPlatformGuidelines(params.platform);
  sections.push(`# Platform-Specific Guidelines

${platformGuidelines}`);

  // Section 7: Output Format
  sections.push(`# Required Output Format (JSON)

Generate a JSON object with the following structure:
{
  "headline": "string (${getPlatformLimits(params.platform).headline} chars max)",
  "headline_alternatives": ["alternative 1", "alternative 2", "alternative 3"],
  "primary_text": "string (${getPlatformLimits(params.platform).primaryText} chars max)",
  "description": "string (${getPlatformLimits(params.platform).description || 'optional'})",
  "cta": "string (e.g., Shop Now, Learn More, Sign Up)",
  "cta_rationale": "Why this CTA matches the goal",
  "reasoning": "Explain which best practices you applied and why"
}

**Important**:
1. Apply the ${params.variantType} variant type approach
2. Use ${params.hookTechnique} hook technique
3. Maintain ${params.tone} tone throughout
4. Follow best practices from the RAG context above
5. Stay within platform character limits
6. Ensure the ad is compelling, clear, and conversion-focused`);

  return sections.join('\n\n');
}

/**
 * Get platform-specific guidelines
 */
function getPlatformGuidelines(platform: AIEPlatform): string {
  const guidelines: Record<AIEPlatform, string> = {
    meta: `- Primary text: First 125 chars appear in feed (front-load key message)
- Headlines: Keep under 40 characters
- Use 2-3 relevant emojis max
- Strong hook in first sentence
- Mobile-first formatting (short sentences)
- Clear CTA button text`,
    instagram: `- Visual-first: Copy complements the image
- Casual, authentic tone works best
- Hashtags optional (can reduce reach in ads)
- Stories: First 3 seconds are critical
- UGC style often outperforms polished content`,
    google: `- Responsive Search Ads: Provide 3 unique headline variations
- Include search keywords in headlines for relevance
- Descriptions add value, don't repeat headlines
- Professional, authoritative tone
- Clear value proposition upfront`,
    tiktok: `- Casual, authentic, native-feeling copy
- Hook in first 3 seconds critical
- Embrace trends and platform culture
- Short, punchy sentences
- Mobile-vertical format`,
    pinterest: `- Descriptive, keyword-rich copy
- Focus on inspiration and discovery
- How-to and tutorial angles work well
- Seasonal targeting opportunities
- Longer copy acceptable (up to 500 chars)`,
  };

  return guidelines[platform] || guidelines.meta;
}

/**
 * Get platform character limits
 */
function getPlatformLimits(platform: AIEPlatform): {
  headline: number;
  primaryText: number;
  description?: number;
} {
  const limits: Record<
    AIEPlatform,
    { headline: number; primaryText: number; description?: number }
  > = {
    meta: { headline: 40, primaryText: 125, description: 30 },
    instagram: { headline: 40, primaryText: 125 },
    google: { headline: 30, primaryText: 90, description: 90 },
    tiktok: { headline: 100, primaryText: 100 },
    pinterest: { headline: 100, primaryText: 500 },
  };

  return limits[platform];
}
