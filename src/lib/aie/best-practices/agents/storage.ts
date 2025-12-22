import { generateEmbedding } from '../../clients';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ContentExtractionResult,
  AnalysisResult,
  QualityAssessment,
  StorageResult,
  AgentContext,
  BestPracticeMetadataDB,
} from '../../../../types/best-practices';
import { AieSourceType } from '../../../../types/aie';
import { logger } from '@/lib/logger'

export class StorageAgent {
  /**
   * Generate embedding and store best practice in database
   */
  async store(
    extractionResult: ContentExtractionResult,
    analysisResult: AnalysisResult,
    qualityAssessment: QualityAssessment,
    context: AgentContext
  ): Promise<StorageResult> {

    try {
      // 1. Generate embedding
      const embeddingText = this.buildEmbeddingText(
        extractionResult,
        analysisResult
      );
      const embedding = await generateEmbedding(embeddingText);
      console.log('[StorageAgent] Embedding generated');

      // 2. Build metadata
      const metadata = this.buildMetadata(
        extractionResult,
        analysisResult,
        qualityAssessment,
        context
      );

      // 3. Prepare record
      const record = {
        title: analysisResult.title,
        platform: analysisResult.platform === 'multi' ? null : analysisResult.platform,
        category: analysisResult.category,
        goal: analysisResult.goal,
        description: analysisResult.description,
        example_text: analysisResult.example_quotes?.[0] || null,
        source_type: this.determineSourceType(context) as AieSourceType,
        source_url: context.original_input.source_url || context.original_input.url || null,
        embedding,
        metadata,
        quality_score: qualityAssessment.overall_score,
        priority_score: this.calculatePriorityScore(
          qualityAssessment,
          analysisResult,
          context
        ),
        is_active: qualityAssessment.is_approved,
      };

      // 4. Check if this is an update or insert
      let best_practice_id: string;
      let updated_existing = false;

      if (qualityAssessment.duplicate_of) {
        // Update existing record if duplicate
        const { data, error } = await supabaseAdmin
          .from('aie_best_practices')
          .update({
            ...record,
            updated_at: new Date().toISOString(),
          })
          .eq('id', qualityAssessment.duplicate_of)
          .select('id')
          .single();

        if (error) {
          throw new Error(`Failed to update existing record: ${error.message}`);
        }

        best_practice_id = data.id;
        updated_existing = true;
      } else {
        // Insert new record
        const { data, error } = await supabaseAdmin
          .from('aie_best_practices')
          .insert(record)
          .select('id')
          .single();

        if (error) {
          throw new Error(`Failed to insert record: ${error.message}`);
        }

        best_practice_id = data.id;
      }

      return {
        best_practice_id,
        embedding_generated: true,
        inserted: !updated_existing,
        updated_existing,
        vector_indexed: true, // HNSW index is automatic
      };
    } catch (error) {
      logger.error('[StorageAgent] Storage failed:', error as Error, { component: 'storage' });
      throw new Error(
        `Failed to store best practice: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build text for embedding generation
   */
  private buildEmbeddingText(
    extraction: ContentExtractionResult,
    analysis: AnalysisResult
  ): string {
    // Combine key information for semantic search
    const parts = [
      `Title: ${analysis.title}`,
      `Description: ${analysis.description}`,
      `Key Insights: ${analysis.key_insights.join('; ')}`,
      `Tags: ${analysis.tags.join(', ')}`,
      `Content: ${extraction.extracted_text.substring(0, 2000)}`,
    ];

    if (analysis.example_quotes.length > 0) {
      parts.push(`Examples: ${analysis.example_quotes.join('; ')}`);
    }

    if (analysis.actionable_takeaways.length > 0) {
      parts.push(`Takeaways: ${analysis.actionable_takeaways.join('; ')}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build metadata JSONB object
   */
  private buildMetadata(
    extraction: ContentExtractionResult,
    analysis: AnalysisResult,
    quality: QualityAssessment,
    context: AgentContext
  ): BestPracticeMetadataDB {
    const metadata: BestPracticeMetadataDB = {
      tags: analysis.tags,
      key_insights: analysis.key_insights,
      extracted_by: context.source_type === 'file' ? 'manual' : 'automated',

      extraction_metadata: {
        method: extraction.extraction_method,
        confidence: extraction.confidence_score,
        word_count: extraction.word_count,
      },

      analysis_metadata: {
        model: process.env.OPENAI_MODEL_ANALYSIS || 'gpt-4o-mini',
        temperature: 0.3,
        timestamp: new Date().toISOString(),
      },

      quality_metadata: {
        reviewer: 'ai',
        scores: quality.scores,
        issues: quality.issues,
        last_review_date: new Date().toISOString(),
      },
    };

    // Add optional fields
    if (extraction.file_format === 'audio' && extraction.extracted_text) {
      metadata.transcription = extraction.extracted_text;
    }

    if (context.original_input.file) {
      metadata.original_filename = (context.original_input.file as File).name;
    }

    if (context.original_input.source_name) {
      metadata.source_author = context.original_input.source_name;
    }

    // Generate duplicate check hash
    metadata.duplicate_check_hash = this.generateHash(
      analysis.title + analysis.description
    );

    return metadata;
  }

  /**
   * Determine source type from context
   */
  private determineSourceType(context: AgentContext): string {
    const { original_input } = context;

    // Check for expert sources
    if (
      original_input.source_name?.toLowerCase().includes('boutique') ||
      original_input.source_name?.toLowerCase().includes('bhb')
    ) {
      return 'expert';
    }

    // Internal uploads
    if (context.source_type === 'file') {
      return 'internal';
    }

    // Public web sources
    return 'public';
  }

  /**
   * Calculate priority score based on quality and other factors
   */
  private calculatePriorityScore(
    quality: QualityAssessment,
    analysis: AnalysisResult,
    context: AgentContext
  ): number {
    let score = 5.0; // Base score

    // Quality contribution (max +3)
    score += (quality.overall_score - 5) * 0.3;

    // Source type boost
    const sourceType = this.determineSourceType(context);
    if (sourceType === 'expert') score += 2;
    else if (sourceType === 'internal') score += 1;

    // Actionability boost
    if (analysis.actionable_takeaways.length >= 5) score += 1;

    // Platform-specific boost
    if (analysis.platform !== 'multi') score += 0.5;

    // Difficulty level consideration
    if (analysis.difficulty_level === 'advanced') score += 0.5;
    else if (analysis.difficulty_level === 'beginner') score += 0.3;

    // Manual override
    if (context.original_input.priority_override) {
      score = context.original_input.priority_override;
    }

    // Clamp to 1-10 range
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Generate a simple hash for duplicate checking
   */
  private generateHash(text: string): string {
    // Simple hash function (for demonstration - consider using a proper hash in production)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}
