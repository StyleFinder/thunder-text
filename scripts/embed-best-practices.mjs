/**
 * Generate embeddings for best practices
 * Simple Node.js script using ES modules
 */

import OpenAI from 'openai';
import fs from 'fs/promises';

// Read API key from .env.local
const envContent = await fs.readFile('.env.local', 'utf-8');
const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
if (!apiKeyMatch) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: apiKeyMatch[1].trim(),
});

// Best practices data (from database)
const bestPractices = [
  {
    id: '65d83093-95c9-44ac-9f2a-ded1b5e4c6da',
    text: 'Start with a Question Hook | Opening with a compelling question immediately engages the audience and encourages them to keep reading. Questions should be relevant to the pain point or desire. | Are you tired of spending hours on [problem]? What if you could [solution] in just 5 minutes?'
  },
  {
    id: '8dc0b9eb-c6c3-4bb8-97b5-101498cdb2e2',
    text: 'Use the Pain-Point-Agitate-Solve Framework | Identify a specific pain point, agitate it to make the reader feel the urgency, then present your product as the solution. | Struggling with [pain]? It gets worse when [agitation]. Our [product] solves this by [benefit].'
  },
  {
    id: 'fb2c9756-c868-473b-979b-af36bd582a99',
    text: 'Lead with Social Proof | Start with a credible statistic, testimonial, or customer count to establish trust immediately. | Join 50,000+ customers who have already [achieved result]. "This changed my life!" - Sarah M.'
  },
];

console.log(`🚀 Generating ${bestPractices.length} embeddings...\n`);

const sqlStatements = [];

for (const practice of bestPractices) {
  console.log(`⚡ Processing: ${practice.text.substring(0, 50)}...`);

  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: practice.text,
  });

  const embedding = response.data[0].embedding;
  const vectorString = `[${embedding.join(',')}]`;

  sqlStatements.push(`UPDATE aie_best_practices SET embedding = '${vectorString}'::vector WHERE id = '${practice.id}';`);

  console.log(`  ✅ Generated ${embedding.length}d embedding`);

  // Rate limit
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Write SQL to file
await fs.writeFile('update-embeddings.sql', sqlStatements.join('\n\n'));
console.log(`\n✅ SQL written to update-embeddings.sql`);
console.log(`Run with Supabase MCP execute_sql`);
