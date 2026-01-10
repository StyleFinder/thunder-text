/**
 * AIE Embedding Manager
 * Manages embeddings for best practices and ensures they're available
 */

import { aieSupabase, generateEmbedding } from './clients';
import { logger } from '@/lib/logger'

/**
 * Check if best practices have embeddings, generate if missing
 */
export async function ensureBestPracticeEmbeddings(): Promise<{
  total: number;
  had_embeddings: number;
  generated: number;
  errors: number;
}> {

  // Fetch all best practices without embeddings using RPC function
  // This bypasses PostgREST permission issues with SECURITY DEFINER
  const { data: practices, error: fetchError } = await aieSupabase
    .rpc('get_best_practices_without_embeddings');

  if (fetchError) {
    logger.error('❌ Error fetching best practices:', fetchError as Error, { component: 'embedding-manager' });
    throw new Error('Failed to fetch best practices');
  }

  const totalPractices = practices?.length || 0;

  if (totalPractices === 0) {
    return { total: 0, had_embeddings: 0, generated: 0, errors: 0 };
  }

  let generated = 0;
  let errors = 0;

  for (const practice of practices || []) {
    try {
      // Combine all relevant text for embedding
      const combinedText = [
        practice.title,
        practice.description,
        practice.example_text || '',
        ...(practice.tags || []),
      ]
        .filter(Boolean)
        .join('\n');

      // Generate embedding
      const embedding = await generateEmbedding(combinedText);

      // Update the best practice with embedding using RPC function
      // This bypasses PostgREST permission issues with SECURITY DEFINER
      const { error: updateError } = await aieSupabase
        .rpc('update_best_practice_embedding', {
          practice_id: practice.id,
          embedding_vector: embedding,
        });

      if (updateError) {
        logger.error(`❌ Error updating practice ${practice.id}:`, updateError as Error, { component: 'embedding-manager' });
        errors++;
      } else {
        generated++;
      }

      // Rate limiting: wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      logger.error(`❌ Error generating embedding for ${practice.title}:`, error as Error, { component: 'embedding-manager' });
      errors++;
    }
  }

  return {
    total: totalPractices,
    had_embeddings: 0,
    generated,
    errors,
  };
}

/**
 * Check if embeddings are available
 */
export async function checkEmbeddingsAvailable(): Promise<boolean> {
  // Use RPC function to bypass PostgREST permission issues
  const { data, error } = await aieSupabase
    .rpc('count_best_practice_embeddings');

  if (error) {
    logger.error('Error checking embeddings:', error as Error, { component: 'embedding-manager' });
    return false;
  }

  const result = data?.[0];
  return (result?.with_embeddings || 0) > 0;
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStats(): Promise<{
  total_practices: number;
  with_embeddings: number;
  without_embeddings: number;
  percentage_complete: number;
}> {
  const { data: allPractices } = await aieSupabase
    .from('aie_best_practices')
    .select('id, embedding');

  const total = allPractices?.length || 0;
  const withEmbeddings =
    allPractices?.filter((p) => p.embedding !== null).length || 0;
  const withoutEmbeddings = total - withEmbeddings;
  const percentage = total > 0 ? (withEmbeddings / total) * 100 : 0;

  return {
    total_practices: total,
    with_embeddings: withEmbeddings,
    without_embeddings: withoutEmbeddings,
    percentage_complete: Math.round(percentage),
  };
}
