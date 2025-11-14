/**
 * AIE Shared Clients
 * Centralized client instances for AIE module
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

/**
 * OpenAI client for AIE operations
 * Reuses the global OpenAI instance but provides AIE-specific configuration
 */
export const aieOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Supabase client for AIE database operations
 * Uses service role key for administrative operations
 */
export const aieSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Generate text embedding using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await aieOpenAI.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings with caching
 * Checks aie_embedding_cache first, generates if not found
 */
export async function generateEmbeddingWithCache(
  text: string
): Promise<{ embedding: number[]; cached: boolean }> {
  // Call database function to check cache
  const { data, error } = await aieSupabase.rpc('get_or_create_aie_embedding', {
    input_text: text,
    embedding_vector: null,
  });

  if (error) {
    console.error('Error checking embedding cache:', error);
    // Fallback to direct generation
    const embedding = await generateEmbedding(text);
    return { embedding, cached: false };
  }

  // If cached, return it
  if (data && data.length > 0 && data[0].is_cached) {
    return { embedding: data[0].embedding, cached: true };
  }

  // Not cached, generate and store
  const embedding = await generateEmbedding(text);

  // Store in cache
  await aieSupabase.rpc('get_or_create_aie_embedding', {
    input_text: text,
    embedding_vector: embedding,
  });

  return { embedding, cached: false };
}
