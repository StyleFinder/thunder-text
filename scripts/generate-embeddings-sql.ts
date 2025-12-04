/**
 * Generate embeddings using Supabase MCP + OpenAI
 * Simpler approach that avoids RLS issues
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  console.log('🚀 Generating embeddings for AIE best practices...\n');

  // This is a simplified version that just generates embeddings
  // The actual database update will be done via Supabase MCP

  const bestPractices: BestPractice[] = [
    // Sample data - will be replaced with actual data from database
  ];

  const embeddings: Array<{ id: string; embedding: number[] }> = [];

  for (const practice of bestPractices) {
    const textToEmbed = [
      practice.title,
      practice.description,
      practice.example_text,
    ]
      .filter(Boolean)
      .join(' | ');

    console.log(`⚡ Generating embedding for: "${practice.title}"`);
    const embedding = await generateEmbedding(textToEmbed);
    embeddings.push({ id: practice.id, embedding });

    console.log(`  ✅ Generated (${embedding.length} dimensions)`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Output SQL for manual execution
  console.log('\n' + '='.repeat(60));
  console.log('Generated embeddings - use Supabase MCP to update:');
  console.log('='.repeat(60));

  for (const { id, embedding } of embeddings) {
    const vectorString = `[${embedding.join(',')}]`;
    console.log(`UPDATE aie_best_practices SET embedding = '${vectorString}' WHERE id = '${id}';`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
