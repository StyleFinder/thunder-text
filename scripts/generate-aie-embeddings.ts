/**
 * Generate embeddings for AIE best practices seed data
 * This script should only need to run once during initial setup
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface BestPractice {
  id: string;
  title: string;
  description: string;
  example_text: string | null;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  console.log('🚀 Starting AIE embeddings generation...\n');

  // Fetch all best practices without embeddings
  const { data: bestPractices, error: fetchError } = await supabase
    .from('aie_best_practices')
    .select('id, title, description, example_text')
    .is('embedding', null);

  if (fetchError) {
    console.error('❌ Error fetching best practices:', fetchError);
    process.exit(1);
  }

  if (!bestPractices || bestPractices.length === 0) {
    console.log('✅ All best practices already have embeddings!');
    return;
  }

  console.log(`📊 Found ${bestPractices.length} best practices needing embeddings\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const practice of bestPractices as BestPractice[]) {
    try {
      // Combine title, description, and example_text for rich embedding
      const textToEmbed = [
        practice.title,
        practice.description,
        practice.example_text,
      ]
        .filter(Boolean)
        .join(' | ');

      console.log(`⚡ Generating embedding for: "${practice.title}"`);

      // Generate embedding
      const embedding = await generateEmbedding(textToEmbed);

      // Update database
      const { error: updateError } = await supabase
        .from('aie_best_practices')
        .update({ embedding })
        .eq('id', practice.id);

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Embedding saved (${embedding.length} dimensions)`);
        successCount++;
      }

      // Rate limiting: OpenAI allows 3000 RPM for ada-002
      // Sleep 100ms between requests to be safe
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Error processing "${practice.title}":`, error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${successCount} embeddings generated`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} failed`);
  }
  console.log('='.repeat(60));

  // Verify embeddings were saved
  const { count } = await supabase
    .from('aie_best_practices')
    .select('id', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  console.log(`\n📊 Total best practices with embeddings: ${count}`);

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
