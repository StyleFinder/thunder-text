/**
 * AIE Image Analyzer
 * Uses OpenAI Vision API to analyze product images
 */

import { aieOpenAI, aieSupabase } from './clients';
import type { AIEImageAnalysisResult } from './types';
import { AIEImageAnalysisError } from './types';
import { logger } from '@/lib/logger'

/**
 * Analyze image using OpenAI Vision API with caching
 */
export async function analyzeImage(
  imageUrl: string
): Promise<AIEImageAnalysisResult> {
  try {
    // Check cache first
    const cached = await checkImageAnalysisCache(imageUrl);
    if (cached) {
      return cached;
    }

    console.log('⚡ Analyzing image with OpenAI Vision...');

    // Call OpenAI Vision API
    const response = await aieOpenAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this product image for ad creation. Provide:
1. Category (e.g., apparel, beauty, electronics, home, fitness, food)
2. Subcategory (more specific, e.g., "t-shirt", "lipstick", "smartphone")
3. Visual tags (5-10 descriptive tags)
4. Dominant colors (3-5 colors)
5. Color palette (hex codes if possible)
6. Mood/emotional tone (e.g., playful, elegant, professional)
7. Scene context (e.g., lifestyle shot, product only, outdoor)
8. Any visible text
9. Object count (number of main objects)
10. Quality score (0-1, based on image quality for ads)
11. Keywords for semantic search (10-15 keywords)

Format response as JSON:
{
  "category": "string",
  "subcategory": "string",
  "tags": ["tag1", "tag2"],
  "colors": {
    "dominant": ["color1", "color2"],
    "palette": ["#hex1", "#hex2"]
  },
  "mood": ["mood1", "mood2"],
  "scene_context": ["context1"],
  "text_detected": "text or null",
  "object_count": number,
  "quality_score": number,
  "keywords": ["keyword1", "keyword2"]
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new AIEImageAnalysisError('No response from OpenAI Vision');
    }

    const analysis = JSON.parse(content) as AIEImageAnalysisResult;

    // Cache the result
    await cacheImageAnalysis(imageUrl, analysis);


    return analysis;
  } catch (error) {
    logger.error('Error analyzing image:', error as Error, { component: 'image-analyzer' });
    throw new AIEImageAnalysisError(
      'Failed to analyze image',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if image analysis exists in cache
 */
async function checkImageAnalysisCache(
  imageUrl: string
): Promise<AIEImageAnalysisResult | null> {
  const { data, error } = await aieSupabase
    .from('aie_image_analysis')
    .select('*')
    .eq('image_url', imageUrl)
    .single();

  if (error || !data) {
    return null;
  }

  // Convert database format to AIEImageAnalysisResult
  return {
    category: data.category,
    subcategory: data.subcategory || undefined,
    tags: data.tags || [],
    colors: data.colors || { dominant: [], palette: [] },
    mood: data.mood || [],
    scene_context: data.scene_context || [],
    text_detected: data.text_detected || undefined,
    object_count: data.object_count || undefined,
    quality_score: data.quality_score ? Number(data.quality_score) : 0,
    keywords: data.metadata?.keywords || [],
  };
}

/**
 * Cache image analysis result
 */
async function cacheImageAnalysis(
  imageUrl: string,
  analysis: AIEImageAnalysisResult
): Promise<void> {
  const { error } = await aieSupabase.from('aie_image_analysis').insert({
    image_url: imageUrl,
    analysis_provider: 'openai_vision',
    category: analysis.category,
    subcategory: analysis.subcategory,
    tags: analysis.tags,
    colors: analysis.colors,
    mood: analysis.mood,
    scene_context: analysis.scene_context,
    text_detected: analysis.text_detected,
    object_count: analysis.object_count,
    quality_score: analysis.quality_score,
    metadata: {
      keywords: analysis.keywords,
    },
  });

  if (error) {
    logger.error('Error caching image analysis:', error as Error, { component: 'image-analyzer' });
    // Don't throw - caching failure shouldn't break the flow
  }
}

/**
 * Batch analyze multiple images
 */
export async function analyzeImageBatch(
  imageUrls: string[]
): Promise<AIEImageAnalysisResult[]> {
  const results: AIEImageAnalysisResult[] = [];

  for (const url of imageUrls) {
    try {
      const analysis = await analyzeImage(url);
      results.push(analysis);

      // Rate limiting: Wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      logger.error(`Error analyzing image ${url}:`, error as Error, { component: 'image-analyzer' });
      // Continue with other images
    }
  }

  return results;
}
