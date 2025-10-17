const fs = require('fs');
const path = require('path');

console.log('🔧 Starting comprehensive fixes...\n');

// ============================================================================
// FIX 1: Remove all sample_name references, use sample_text first line instead
// ============================================================================

// Fix types - remove sample_name
let typesPath = path.join(__dirname, '../src/types/content-center.ts');
let typesContent = fs.readFileSync(typesPath, 'utf8');

typesContent = typesContent.replace(/  sample_name\?: string\n/g, '');

fs.writeFileSync(typesPath, typesContent);
console.log('✅ Removed sample_name from types');

// Fix API - remove sample_name from insert
let apiPath = path.join(__dirname, '../src/app/api/content-center/samples/route.ts');
let apiContent = fs.readFileSync(apiPath, 'utf8');

apiContent = apiContent.replace(
  'const { sample_name, sample_text, sample_type } = body',
  'const { sample_text, sample_type } = body'
);

apiContent = apiContent.replace(
  `.insert({
        store_id: shopData.id,
        sample_name: sample_name,
        sample_text: sanitizedText,
        sample_type: sanitizedType,
        word_count: wordCount,
        is_active: true
      })`,
  `.insert({
        store_id: shopData.id,
        sample_text: sanitizedText,
        sample_type: sanitizedType,
        word_count: wordCount,
        is_active: true
      })`
);

fs.writeFileSync(apiPath, apiContent);
console.log('✅ Removed sample_name from API');

// Fix frontend - use first line of sample_text as name
let voicePagePath = path.join(__dirname, '../src/app/content-center/voice/page.tsx');
let voicePageContent = fs.readFileSync(voicePagePath, 'utf8');

// Helper function to extract title from sample_text
voicePageContent = voicePageContent.replace(
  '          // Convert DB samples to UI format\n          const uiSamples: WritingSample[] = data.data.samples.map((s: ContentSample) => ({\n            id: s.id,\n            dbId: s.id,\n            name: s.sample_name || `${s.sample_type.charAt(0).toUpperCase() + s.sample_type.slice(1)} Sample`,\n            type: s.sample_type.toUpperCase(),\n            uploadDate: new Date(s.created_at).toLocaleDateString(),\n            size: `${s.word_count} words`\n          }))',
  `          // Convert DB samples to UI format\n          const uiSamples: WritingSample[] = data.data.samples.map((s: ContentSample) => {\n            // Extract first line or first 50 chars as name\n            const firstLine = s.sample_text.split('\\n')[0].trim()\n            const displayName = firstLine.length > 0 && firstLine.length <= 100\n              ? firstLine\n              : firstLine.substring(0, 50) + '...'\n            \n            return {\n              id: s.id,\n              dbId: s.id,\n              name: displayName,\n              type: s.sample_type.toUpperCase(),\n              uploadDate: new Date(s.created_at).toLocaleDateString(),\n              size: \`\${s.word_count} words\`\n            }\n          })`
);

// Remove sample_name from file upload
voicePageContent = voicePageContent.replace(
  `          body: JSON.stringify({
            sample_name: file.name,
            sample_text: text,
            sample_type: 'other'
          })`,
  `          body: JSON.stringify({
            sample_text: text,
            sample_type: 'other'
          })`
);

// Remove sample_name from pasted text
voicePageContent = voicePageContent.replace(
  `        body: JSON.stringify({
          sample_name: pasteName.trim() || 'Pasted Text',
          sample_text: pasteText,
          sample_type: 'other'
        })`,
  `        body: JSON.stringify({
          sample_text: pasteText,
          sample_type: 'other'
        })`
);

fs.writeFileSync(voicePagePath, voicePageContent);
console.log('✅ Updated voice page to use sample_text first line as name');

console.log('\n✨ All fixes applied successfully!');
