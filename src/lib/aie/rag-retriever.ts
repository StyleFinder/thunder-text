/**
 * AIE RAG Retriever
 * Retrieves relevant best practices and ad examples using pgvector similarity search
 */

import { aieSupabase, generateEmbeddingWithCache } from './clients';
import type {
  AIEPlatform,
  AIEGoal,
  AIEBestPractice,
  AIEAdExample,
  AIERAGContext,
} from './types';
import { AIERAGRetrievalError } from './types';
import { logger } from '@/lib/logger'

/**
 * Retrieve relevant context for ad generation using RAG
 */
export async function retrieveRAGContext(params: {
  query: string;
  platform: AIEPlatform;
  goal: AIEGoal;
  category: string;
  format?: string;
  imageAnalysis?: {
    tags?: string[];
    mood?: string[];
    keywords?: string[];
  };
}): Promise<AIERAGContext> {
  const startTime = Date.now();

  try {
    // Generate embedding for the query
    const { embedding, cached } = await generateEmbeddingWithCache(params.query);

    // Retrieve best practices
    const bestPractices = await retrieveBestPractices({
      embedding,
      platform: params.platform,
      goal: params.goal,
      category: params.category,
      topK: 10,
      similarityThreshold: 0.7,
    });

    // Retrieve ad examples (high-performing ads)
    const adExamples = await retrieveAdExamples({
      embedding,
      platform: params.platform,
      category: params.category,
      format: params.format,
      topK: 5,
      similarityThreshold: 0.65,
    });

    const retrievalTime = Date.now() - startTime;

    // Log retrieval for debugging and optimization
    // This will help us understand which best practices are being retrieved
    // and optimize the system over time
    const avgSimilarity =
      bestPractices.length > 0
        ? bestPractices.reduce((sum, bp) => sum + (bp.similarity || 0), 0) / bestPractices.length
        : 0;

    const ragContext: AIERAGContext = {
      query_text: params.query,
      query_embedding: embedding,
      best_practices: bestPractices,
      ad_examples: adExamples,
      total_similarity_score: avgSimilarity * bestPractices.length,
      retrieval_metadata: {
        best_practices_count: bestPractices.length,
        ad_examples_count: adExamples.length,
        avg_similarity: avgSimilarity,
        retrieval_time_ms: retrievalTime,
      },
    };

    return ragContext;
  } catch (error) {
    logger.error('Error in RAG retrieval:', error as Error, { component: 'rag-retriever' });
    throw new AIERAGRetrievalError(
      'Failed to retrieve RAG context',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Retrieve best practices using pgvector similarity search
 */
async function retrieveBestPractices(params: {
  embedding: number[];
  platform: AIEPlatform;
  goal: AIEGoal;
  category: string;
  topK: number;
  similarityThreshold: number;
}): Promise<AIEBestPractice[]> {
  // Call the database function for pgvector search
  const { data, error } = await aieSupabase.rpc('search_aie_best_practices', {
    query_embedding: params.embedding,
    match_platform: params.platform,
    match_goal: params.goal,
    match_category: params.category,
    top_k: params.topK,
    similarity_threshold: params.similarityThreshold,
  });

  if (error) {
    logger.error('Error retrieving best practices:', error as Error, { component: 'rag-retriever' });
    throw new Error(`Best practices retrieval failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(
      `⚠️  No best practices found for ${params.platform}/${params.category}/${params.goal}`
    );
    return [];
  }

  // Transform database results to AIEBestPractice type
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    example_text: row.example_text as string | undefined,
    framework_type: row.framework_type as string | undefined,
    platform: row.platform as AIEPlatform,
    goal: row.goal as AIEGoal,
    category: row.category as string,
    similarity: Number(row.similarity),
  }));
}

/**
 * Retrieve high-performing ad examples using pgvector similarity search
 */
async function retrieveAdExamples(params: {
  embedding: number[];
  platform: AIEPlatform;
  category: string;
  format?: string;
  topK: number;
  similarityThreshold: number;
}): Promise<AIEAdExample[]> {
  // Call the database function for pgvector search
  const { data, error } = await aieSupabase.rpc('search_aie_ad_examples', {
    query_embedding: params.embedding,
    match_platform: params.platform,
    match_category: params.category,
    match_format: params.format || null,
    performance_tags: ['high'], // Only retrieve high-performing ads
    seasonal_tags: [], // Can be enhanced later for seasonal targeting
    top_k: params.topK,
    similarity_threshold: params.similarityThreshold,
  });

  if (error) {
    logger.error('Error retrieving ad examples:', error as Error, { component: 'rag-retriever' });
    // Don't throw - ad examples are optional, best practices are more important
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform database results to AIEAdExample type
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    platform: row.platform as AIEPlatform,
    format: row.format as string,
    category: row.category as string,
    primary_text: row.primary_text as string,
    headline: row.headline as string | undefined,
    cta: row.cta as string | undefined,
    hook_type: row.hook_type as string | undefined,
    tone: row.tone as string | undefined,
    performance_tag: row.performance_tag as string,
    performance_percentile: row.performance_percentile as number | undefined,
    performance_metrics: row.performance_metrics as Record<string, unknown>,
    similarity: Number(row.similarity),
  }));
}

/**
 * Log RAG retrieval for debugging and analytics
 */
export async function logRAGRetrieval(params: {
  adRequestId: string;
  queryText: string;
  queryEmbedding: number[];
  retrievedBestPractices: AIEBestPractice[];
  retrievedExamples: AIEAdExample[];
  retrievalTimeMs: number;
  similarityThreshold: number;
  topK: number;
}): Promise<void> {
  try {
    await aieSupabase.from('aie_rag_retrieval_logs').insert({
      ad_request_id: params.adRequestId,
      query_embedding: params.queryEmbedding,
      query_text: params.queryText,
      retrieved_best_practices: params.retrievedBestPractices.map((bp) => ({
        id: bp.id,
        title: bp.title,
        similarity: bp.similarity,
      })),
      retrieved_examples: params.retrievedExamples.map((ex) => ({
        id: ex.id,
        headline: ex.headline,
        similarity: ex.similarity,
      })),
      retrieval_time_ms: params.retrievalTimeMs,
      similarity_threshold: params.similarityThreshold,
      top_k: params.topK,
    });
  } catch (error) {
    logger.error('Error logging RAG retrieval:', error as Error, { component: 'rag-retriever' });
    // Don't throw - logging failure shouldn't break the flow
  }
}

/**
 * Build enriched query for better RAG retrieval
 * Combines user description with image analysis insights
 */
export function buildEnrichedQuery(params: {
  description: string;
  imageAnalysis?: {
    category?: string;
    subcategory?: string;
    tags?: string[];
    mood?: string[];
    keywords?: string[];
  };
  targetAudience?: string;
  goal: AIEGoal;
}): string {
  const parts: string[] = [params.description];

  if (params.imageAnalysis) {
    if (params.imageAnalysis.category) {
      parts.push(`Product category: ${params.imageAnalysis.category}`);
    }
    if (params.imageAnalysis.subcategory) {
      parts.push(`Product type: ${params.imageAnalysis.subcategory}`);
    }
    if (params.imageAnalysis.mood && params.imageAnalysis.mood.length > 0) {
      parts.push(`Visual mood: ${params.imageAnalysis.mood.join(', ')}`);
    }
    if (params.imageAnalysis.keywords && params.imageAnalysis.keywords.length > 0) {
      parts.push(`Keywords: ${params.imageAnalysis.keywords.slice(0, 5).join(', ')}`);
    }
  }

  if (params.targetAudience) {
    parts.push(`Target audience: ${params.targetAudience}`);
  }

  parts.push(`Campaign goal: ${params.goal}`);

  return parts.join(' | ');
}
