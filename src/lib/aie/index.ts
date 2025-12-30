/**
 * AIE Main Orchestrator
 * Coordinates the complete ad generation pipeline
 */

import { aieSupabase } from './clients';
import { analyzeImage } from './image-analyzer';
import { retrieveRAGContext, buildEnrichedQuery, logRAGRetrieval } from './rag-retriever';
import { generateAdVariants } from './ad-generator';
import { scoreAdVariant, rankVariants } from './variant-scorer';
import { extractCategory } from './utils';
import type {
  AIEPlatform,
  AIEGoal,
  AIEBrandVoice,
  AIEAdRequest,
  AIEAdVariant,
  AIEImageAnalysisResult,
} from './types';
import { AIEImageAnalysisError } from './types';
import { logger } from '@/lib/logger'

export interface GenerateAdsParams {
  shopId: string;
  userId?: string;
  productId?: string;
  platform: AIEPlatform;
  goal: AIEGoal;
  format?: string;
  description: string;
  imageUrl?: string;
  brandVoice?: AIEBrandVoice;
  targetAudience?: string;
  budgetRange?: string;
}

export interface GenerateAdsResult {
  adRequestId: string;
  variants: AIEAdVariant[];
  imageAnalysis?: AIEImageAnalysisResult;
  generationTimeMs: number;
  aiCost: number;
}

/**
 * Main entry point: Generate AI-powered ad variants
 */
export async function generateAds(
  params: GenerateAdsParams
): Promise<GenerateAdsResult> {
  const startTime = Date.now();
  let aiCost = 0;


  try {
    // Step 1: Look up shop UUID from shop domain
    const { data: shop, error: shopError } = await aieSupabase
      .from('shops')
      .select('id')
      .eq('shop_domain', params.shopId)
      .single();

    if (shopError || !shop) {
      throw new Error(`Shop not found: ${params.shopId}`);
    }

    const shopUuid = shop.id;

    // Step 2: Create ad request record
    const { data: adRequest, error: requestError } = await aieSupabase
      .from('aie_ad_requests')
      .insert({
        shop_id: shopUuid,
        user_id: params.userId,
        product_id: params.productId,
        platform: params.platform,
        goal: params.goal,
        format: params.format,
        description: params.description,
        image_url: params.imageUrl,
        brand_voice_override: params.brandVoice,
        target_audience: params.targetAudience,
        budget_range: params.budgetRange,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError || !adRequest) {
      throw new Error(`Failed to create ad request: ${requestError?.message}`);
    }

    const adRequestId = adRequest.id;

    // Update status to analyzing
    await updateAdRequestStatus(adRequestId, 'analyzing');

    // Step 2: Analyze image (if provided)
    let imageAnalysis = null;
    let category = extractCategory(undefined, params.description);

    if (params.imageUrl) {
      imageAnalysis = await analyzeImage(params.imageUrl);
      category = imageAnalysis.category;
      aiCost += 0.01; // GPT-4 Vision cost

      // Update request with image analysis
      await aieSupabase
        .from('aie_ad_requests')
        .update({ image_analysis: imageAnalysis })
        .eq('id', adRequestId);

    }

    // Update status to generating
    await updateAdRequestStatus(adRequestId, 'generating');

    // Step 3: Build enriched query for RAG
    if (!imageAnalysis) {
      throw new AIEImageAnalysisError('Image analysis failed - cannot proceed with generation');
    }

    const enrichedQuery = buildEnrichedQuery({
      description: params.description,
      imageAnalysis,
      targetAudience: params.targetAudience,
      goal: params.goal,
    });

    // Step 4: Retrieve RAG context
    const ragContext = await retrieveRAGContext({
      query: enrichedQuery,
      platform: params.platform,
      goal: params.goal,
      category,
      format: params.format,
      imageAnalysis: imageAnalysis || undefined,
    });

    aiCost += 0.0001; // Embedding cost

    // Step 5: Generate ad variants
    const variantDrafts = await generateAdVariants({
      description: params.description,
      platform: params.platform,
      goal: params.goal,
      category,
      ragContext,
      brandVoice: params.brandVoice,
      targetAudience: params.targetAudience,
      imageUrl: params.imageUrl,
    });

    aiCost += 0.03; // GPT-4 generation cost (3 variants)


    // Step 6: Score variants
    const scoredVariants = variantDrafts.map((draft) => ({
      ...draft,
      score: scoreAdVariant({
        variant: draft,
        platform: params.platform,
        goal: params.goal,
        brandVoice: params.brandVoice,
        description: params.description,
      }),
    }));

    // Rank variants by score
    const rankedVariants = rankVariants(scoredVariants);

    // Step 7: Save variants to database
    const savedVariants = await Promise.all(
      rankedVariants.map(async (variant) => {
        const { data, error } = await aieSupabase
          .from('aie_ad_variants')
          .insert({
            ad_request_id: adRequestId,
            variant_number: variant.variant_number,
            variant_type: variant.variant_type,
            headline: variant.headline,
            headline_alternatives: variant.headline_alternatives,
            primary_text: variant.primary_text,
            description: variant.description,
            cta: variant.cta,
            cta_rationale: variant.cta_rationale,
            hook_technique: variant.hook_technique,
            tone: variant.tone,
            predicted_score: variant.score.predicted_score,
            score_breakdown: variant.score.score_breakdown,
            generation_reasoning: variant.generation_reasoning,
            rag_context_used: variant.rag_context_used,
          })
          .select()
          .single();

        if (error) {
          logger.error(`Error saving variant ${variant.variant_number}:`, error as Error, { component: 'index' });
          throw error;
        }

        return data as AIEAdVariant;
      })
    );

    // Step 8: Log RAG retrieval for analytics
    await logRAGRetrieval({
      adRequestId,
      queryText: enrichedQuery,
      queryEmbedding: [], // Would need to store from retrieval
      retrievedBestPractices: ragContext.best_practices,
      retrievedExamples: ragContext.ad_examples,
      retrievalTimeMs: ragContext.retrieval_metadata.retrieval_time_ms,
      similarityThreshold: 0.7,
      topK: 10,
    });

    // Step 9: Update request with completion
    const generationTimeMs = Date.now() - startTime;
    await aieSupabase
      .from('aie_ad_requests')
      .update({
        status: 'generated',
        generation_time_ms: generationTimeMs,
        ai_cost: aiCost,
      })
      .eq('id', adRequestId);

    return {
      adRequestId,
      variants: savedVariants,
      imageAnalysis,
      generationTimeMs,
      aiCost,
    };
  } catch (error) {
    logger.error('❌ AIE pipeline error:', error as Error, { component: 'index' });

    // Update request status to failed
    if (error && typeof error === 'object' && 'adRequestId' in error) {
      await aieSupabase
        .from('aie_ad_requests')
        .update({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', (error as any).adRequestId);
    }

    throw error;
  }
}

/**
 * Update ad request status
 */
async function updateAdRequestStatus(
  adRequestId: string,
  status: AIEAdRequest['status']
): Promise<void> {
  await aieSupabase
    .from('aie_ad_requests')
    .update({ status })
    .eq('id', adRequestId);
}

/**
 * Get ad request with variants
 */
export async function getAdRequest(
  adRequestId: string
): Promise<AIEAdRequest & { variants: AIEAdVariant[] }> {
  const { data: request, error: requestError } = await aieSupabase
    .from('aie_ad_requests')
    .select('*')
    .eq('id', adRequestId)
    .single();

  if (requestError || !request) {
    throw new Error(`Ad request not found: ${adRequestId}`);
  }

  const { data: variants, error: variantsError } = await aieSupabase
    .from('aie_ad_variants')
    .select('*')
    .eq('ad_request_id', adRequestId)
    .order('predicted_score', { ascending: false });

  if (variantsError) {
    throw new Error(`Failed to fetch variants: ${variantsError.message}`);
  }

  return {
    ...request,
    variants: variants || [],
  } as AIEAdRequest & { variants: AIEAdVariant[] };
}

// Export all sub-modules
export * from './types';
export * from './clients';
export * from './utils';
export * from './image-analyzer';
export * from './rag-retriever';
export * from './ad-generator';
export * from './variant-scorer';
export * from './embedding-manager';
