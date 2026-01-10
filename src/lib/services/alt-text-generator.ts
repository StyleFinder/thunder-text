/**
 * Alt Text Generator Service
 * Uses OpenAI GPT-4 Vision to generate SEO-friendly alt text for product images
 */

import OpenAI from 'openai';
import { getOpenAIKey } from '../security/api-keys';
import { logger } from '@/lib/logger';

// Initialize OpenAI client (server-side only)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client cannot be used on the client side');
  }

  if (!openaiClient) {
    const apiKey = getOpenAIKey();
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

export interface AltTextGenerationOptions {
  productTitle?: string;
  productCategory?: string;
  maxLength?: number;
}

export interface AltTextResult {
  imageUrl: string;
  altText: string;
  confidence: number;
}

export interface BatchAltTextResult {
  results: AltTextResult[];
  errors: Array<{ imageUrl: string; error: string }>;
}

const DEFAULT_MAX_LENGTH = 125;

/**
 * Generate alt text for a single image using GPT-4 Vision
 */
export async function generateAltText(
  imageUrl: string,
  options: AltTextGenerationOptions = {}
): Promise<AltTextResult> {
  const {
    productTitle,
    productCategory,
    maxLength = DEFAULT_MAX_LENGTH
  } = options;

  const client = getOpenAIClient();

  const contextParts: string[] = [];
  if (productTitle) contextParts.push(`Product: ${productTitle}`);
  if (productCategory) contextParts.push(`Category: ${productCategory}`);
  const contextInfo = contextParts.length > 0
    ? `\n\nContext:\n${contextParts.join('\n')}`
    : '';

  const systemPrompt = `You are an expert at writing SEO-friendly alt text for e-commerce product images.
Your alt text should be:
- Concise (maximum ${maxLength} characters)
- Descriptive of what's visible in the image
- Include product type and key visual details (color, pattern, style, material)
- Natural language that reads well
- SEO-friendly without keyword stuffing
- Never start with "Image of", "Picture of", or "Photo of"

Return ONLY the alt text, nothing else. No quotes, no explanation.`;

  const userPrompt = `Generate alt text for this product image.${contextInfo}

Requirements:
- Maximum ${maxLength} characters
- Be specific about colors, patterns, and materials visible
- Describe the product as if explaining to someone who can't see it`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0.3, // Lower temperature for more consistent output
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No alt text generated from OpenAI');
    }

    // Truncate if somehow exceeds max length
    const altText = content.length > maxLength
      ? content.substring(0, maxLength - 3) + '...'
      : content;

    // Estimate confidence based on response
    const confidence = content.length >= 20 && content.length <= maxLength ? 0.9 : 0.7;

    logger.debug(`Generated alt text for image: "${altText}"`, {
      component: 'alt-text-generator',
      imageUrl: imageUrl.substring(0, 50) + '...',
      length: altText.length
    });

    return {
      imageUrl,
      altText,
      confidence
    };

  } catch (error) {
    logger.error('Error generating alt text:', error as Error, {
      component: 'alt-text-generator',
      imageUrl: imageUrl.substring(0, 50) + '...'
    });
    throw new AltTextGenerationError(
      'Failed to generate alt text',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate alt text for multiple images with rate limiting
 */
export async function generateAltTextBatch(
  images: Array<{ url: string; productTitle?: string; productCategory?: string }>,
  options: { maxLength?: number; onlyMissingAltText?: boolean } = {}
): Promise<BatchAltTextResult> {
  const { maxLength = DEFAULT_MAX_LENGTH } = options;

  const results: AltTextResult[] = [];
  const errors: Array<{ imageUrl: string; error: string }> = [];

  for (const image of images) {
    try {
      const result = await generateAltText(image.url, {
        productTitle: image.productTitle,
        productCategory: image.productCategory,
        maxLength
      });
      results.push(result);

      // Rate limiting: Wait 200ms between requests to avoid rate limits
      if (images.indexOf(image) < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ imageUrl: image.url, error: errorMessage });
      logger.error(`Error generating alt text for ${image.url}:`, error as Error, {
        component: 'alt-text-generator'
      });
    }
  }

  logger.info(`Batch alt text generation complete: ${results.length} success, ${errors.length} errors`, {
    component: 'alt-text-generator'
  });

  return { results, errors };
}

/**
 * Custom error class for alt text generation errors
 */
export class AltTextGenerationError extends Error {
  originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'AltTextGenerationError';
    this.originalError = originalError;
  }
}
