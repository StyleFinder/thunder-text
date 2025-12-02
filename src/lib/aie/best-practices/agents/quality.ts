import { callChatCompletion } from '@/lib/services/openai-client';
import { generateEmbedding } from '../../clients';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger'
import {
  ContentExtractionResult,
  AnalysisResult,
  QualityAssessment,
  AgentContext,
} from '../../../../types/best-practices';

export class QualityAgent {
  private readonly MIN_QUALITY_SCORE =
    parseFloat(process.env.MIN_QUALITY_SCORE || '6.0');
  private readonly MAX_DUPLICATE_SIMILARITY =
    parseFloat(process.env.MAX_DUPLICATE_SIMILARITY || '0.95');

  /**
   * Assess quality and validate best practice content
   */
  async assess(
    extractionResult: ContentExtractionResult,
    analysisResult: AnalysisResult,
    context: AgentContext
  ): Promise<QualityAssessment> {

    // Skip quality check if requested
    if (context.original_input.skip_quality_check) {
      console.log('[QualityAgent] Quality check skipped by request');
      return this.createPassingAssessment();
    }

    try {
      // Run quality scoring and duplicate check in parallel
      const [qualityScores, duplicateCheck] = await Promise.all([
        this.scoreQuality(extractionResult, analysisResult),
        context.original_input.skip_duplicate_check
          ? Promise.resolve({ is_duplicate: false })
          : this.checkDuplicates(analysisResult, extractionResult),
      ]);

      // Calculate overall score (weighted average)
      const weights = {
        relevance: 0.25,
        actionability: 0.25,
        accuracy: 0.20,
        completeness: 0.15,
        uniqueness: 0.15,
      };

      const overall_score =
        qualityScores.relevance * weights.relevance +
        qualityScores.actionability * weights.actionability +
        qualityScores.accuracy * weights.accuracy +
        qualityScores.completeness * weights.completeness +
        qualityScores.uniqueness * weights.uniqueness;

      // Collect issues
      const issues: QualityAssessment['issues'] = [];

      // Check for quality threshold
      if (overall_score < this.MIN_QUALITY_SCORE) {
        issues.push({
          severity: 'critical',
          type: 'incomplete',
          message: `Overall quality score (${overall_score.toFixed(1)}) is below minimum threshold (${this.MIN_QUALITY_SCORE})`,
        });
      }

      // Check for duplicates
      if (duplicateCheck.is_duplicate) {
        issues.push({
          severity: 'critical',
          type: 'duplicate',
          message: `Duplicate of existing best practice (${(duplicateCheck.similarity! * 100).toFixed(1)}% similar)`,
        });
      }

      // Check individual scores
      if (qualityScores.relevance < 5) {
        issues.push({
          severity: 'warning',
          type: 'incomplete',
          message: 'Content may not be relevant to advertising best practices',
        });
      }

      if (qualityScores.actionability < 5) {
        issues.push({
          severity: 'warning',
          type: 'incomplete',
          message: 'Content lacks actionable insights',
        });
      }

      // Check for outdated content (basic heuristic)
      if (this.seemsOutdated(extractionResult.extracted_text)) {
        issues.push({
          severity: 'warning',
          type: 'outdated',
          message: 'Content may contain outdated information',
        });
      }

      // Check for promotional content
      if (this.seemsPromotional(extractionResult.extracted_text)) {
        issues.push({
          severity: 'warning',
          type: 'promotional',
          message: 'Content may be overly promotional',
        });
      }

      // Determine if approved
      const is_approved =
        overall_score >= this.MIN_QUALITY_SCORE &&
        !duplicateCheck.is_duplicate &&
        !issues.some((i) => i.severity === 'critical');

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        qualityScores,
        issues,
        analysisResult
      );

      const assessment: QualityAssessment = {
        overall_score,
        is_approved,
        scores: qualityScores,
        issues,
        recommendations,
        duplicate_of: duplicateCheck.duplicate_id,
        duplicate_similarity: duplicateCheck.similarity,
      };

      console.log(
        `[QualityAgent] Assessment complete: ${is_approved ? 'APPROVED' : 'REJECTED'} (score: ${overall_score.toFixed(1)})`
      );

      return assessment;
    } catch (error) {
      logger.error('[QualityAgent] Assessment failed:', error as Error, { component: 'quality' });
      throw new Error(
        `Failed to assess quality: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Score content quality using AI
   */
  private async scoreQuality(
    extraction: ContentExtractionResult,
    analysis: AnalysisResult
  ): Promise<QualityAssessment['scores']> {
    const systemPrompt = `
You are a quality assessment expert for advertising best practices content.
Score the content on the following criteria (scale 0-10):

1. Relevance (0-10): How relevant is this to advertising/marketing professionals?
2. Actionability (0-10): How actionable are the insights? Can readers actually use this?
3. Accuracy (0-10): How accurate and factual is the information? (Penalize if outdated or incorrect)
4. Completeness (0-10): Is the information complete and well-structured?
5. Uniqueness (0-10): Is this unique/valuable, or generic common knowledge?

Be strict but fair. A score of 6-7 is good, 8-9 is excellent, 10 is exceptional.
    `.trim();

    const userPrompt = `
Analyze this content and score it:

Title: ${analysis.title}
Platform: ${analysis.platform}
Category: ${analysis.category}

Content:
${extraction.extracted_text.substring(0, 3000)}${extraction.extracted_text.length > 3000 ? '...' : ''}

Key Insights:
${analysis.key_insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Return JSON:
{
  "relevance": 0-10,
  "actionability": 0-10,
  "accuracy": 0-10,
  "completeness": 0-10,
  "uniqueness": 0-10,
  "reasoning": {
    "relevance": "Brief explanation",
    "actionability": "Brief explanation",
    "accuracy": "Brief explanation",
    "completeness": "Brief explanation",
    "uniqueness": "Brief explanation"
  }
}
    `.trim();

    const response = await callChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: process.env.OPENAI_MODEL_QUALITY || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }
    );

    const scores = JSON.parse(response);

    return {
      relevance: scores.relevance || 0,
      actionability: scores.actionability || 0,
      accuracy: scores.accuracy || 0,
      completeness: scores.completeness || 0,
      uniqueness: scores.uniqueness || 0,
    };
  }

  /**
   * Check for duplicate or similar content using vector search
   */
  private async checkDuplicates(
    analysis: AnalysisResult,
    extraction: ContentExtractionResult
  ): Promise<{
    is_duplicate: boolean;
    duplicate_id?: string;
    similarity?: number;
  }> {
    try {
      // Generate embedding for the content
      const searchText = `${analysis.title}\n${analysis.description}\n${extraction.extracted_text.substring(0, 1000)}`;
      const embedding = await generateEmbedding(searchText);

      // Search for similar content
      const { data, error } = await supabaseAdmin.rpc(
        'search_best_practices',
        {
          query_embedding: embedding,
          match_threshold: 0.8, // High threshold for duplicate detection
          match_count: 3,
          filter_platform: analysis.platform === 'multi' ? null : analysis.platform,
          filter_goal: analysis.goal,
        }
      );

      if (error) {
        console.warn('[QualityAgent] Duplicate check failed:', error);
        return { is_duplicate: false };
      }

      if (data && data.length > 0) {
        const topMatch = data[0];
        const similarity = topMatch.similarity || 0;

        if (similarity >= this.MAX_DUPLICATE_SIMILARITY) {
          console.log(
            `[QualityAgent] Duplicate detected: ${topMatch.id} (${(similarity * 100).toFixed(1)}% similar)`
          );
          return {
            is_duplicate: true,
            duplicate_id: topMatch.id,
            similarity,
          };
        }
      }

      return { is_duplicate: false };
    } catch (error) {
      console.warn('[QualityAgent] Duplicate check error:', error);
      return { is_duplicate: false };
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    scores: QualityAssessment['scores'],
    issues: QualityAssessment['issues'],
    analysis: AnalysisResult
  ): string[] {
    const recommendations: string[] = [];

    if (scores.relevance < 7) {
      recommendations.push(
        'Consider adding more platform-specific or industry-specific details'
      );
    }

    if (scores.actionability < 7) {
      recommendations.push(
        'Add more specific, actionable steps or examples'
      );
    }

    if (scores.accuracy < 7) {
      recommendations.push('Verify facts and update any outdated information');
    }

    if (scores.completeness < 7) {
      recommendations.push('Expand on key concepts or add missing context');
    }

    if (scores.uniqueness < 7) {
      recommendations.push(
        'Include unique insights, data, or case studies to differentiate'
      );
    }

    if (analysis.key_insights.length < 3) {
      recommendations.push(
        'Extract more key insights from the content (aim for 5-7)'
      );
    }

    if (analysis.tags.length < 8) {
      recommendations.push(
        'Add more searchable tags to improve discoverability'
      );
    }

    if (issues.some((i) => i.type === 'outdated')) {
      recommendations.push(
        'Update content to reflect current platform features and best practices'
      );
    }

    if (issues.some((i) => i.type === 'promotional')) {
      recommendations.push('Remove promotional language and focus on educational value');
    }

    return recommendations;
  }

  /**
   * Basic heuristic to detect outdated content
   */
  private seemsOutdated(content: string): boolean {
    const outdatedPatterns = [
      /\b(2018|2019|2020)\b/gi, // Years more than 4 years old
      /facebook pixel/gi, // Old Facebook terminology
      /20% text rule/gi, // Deprecated Facebook ad rule
    ];

    return outdatedPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Basic heuristic to detect promotional content
   */
  private seemsPromotional(content: string): boolean {
    const promotionalPatterns = [
      /\bbuy now\b/gi,
      /\bsign up today\b/gi,
      /\blimited time offer\b/gi,
      /\bcontact us\b/gi,
      /\bour (service|product|company)\b/gi,
    ];

    const matchCount = promotionalPatterns.filter((pattern) =>
      pattern.test(content)
    ).length;

    // If 3+ promotional patterns detected, likely promotional
    return matchCount >= 3;
  }

  /**
   * Create a passing assessment (for skipped quality checks)
   */
  private createPassingAssessment(): QualityAssessment {
    return {
      overall_score: 8.0,
      is_approved: true,
      scores: {
        relevance: 8,
        actionability: 8,
        accuracy: 8,
        completeness: 8,
        uniqueness: 8,
      },
      issues: [],
      recommendations: ['Quality check was skipped'],
    };
  }
}
