import { callChatCompletion } from '@/lib/services/openai-client';
import {
  ContentExtractionResult,
  AnalysisResult,
  AgentContext,
} from '../../../../types/best-practices';
import { AiePlatform, AieGoal } from '../../../../types/aie';
import { logger } from '@/lib/logger'

export class AnalysisAgent {
  /**
   * Analyze extracted content and generate structured metadata
   */
  async analyze(
    extractionResult: ContentExtractionResult,
    context: AgentContext
  ): Promise<AnalysisResult> {
    const { extracted_text, word_count } = extractionResult;

    // Validate minimum content length
    if (word_count < 50) {
      throw new Error(
        `Content too short for analysis (${word_count} words, minimum 50 required)`
      );
    }

    console.log(
      `[AnalysisAgent] Analyzing content (${word_count} words)...`
    );

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(
        extracted_text,
        context.original_input
      );

      const response = await callChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: process.env.OPENAI_MODEL_ANALYSIS || 'gpt-4o-mini',
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }
      );

      const analysis = this.parseResponse(response);
      console.log(
        `[AnalysisAgent] Analysis complete: "${analysis.title}" (${analysis.platform}, ${analysis.category})`
      );

      return analysis;
    } catch (error) {
      logger.error('[AnalysisAgent] Analysis failed:', error as Error, { component: 'analysis' });
      throw new Error(
        `Failed to analyze content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildSystemPrompt(): string {
    return `
You are an expert advertising analyst specializing in digital marketing best practices.
Your job is to analyze content and extract structured, actionable insights for advertising professionals.

Your analysis should identify:
1. Which advertising platform(s) the content applies to
2. The main category/topic area
3. The primary advertising goal it supports
4. Key actionable insights and takeaways
5. Relevant searchable tags and keywords
6. Notable quotes or examples
7. Target audience and difficulty level

Focus on extracting practical, actionable information that can be used to improve ad campaigns.
    `.trim();
  }

  private buildUserPrompt(
    content: string,
    originalInput: Partial<{
      platform: string;
      category: string;
      goal: string;
      tags: string[];
    }>
  ): string {
    // Include any hints from the original input
    const hints: string[] = [];
    if (originalInput.platform) {
      hints.push(`Expected platform: ${originalInput.platform}`);
    }
    if (originalInput.category) {
      hints.push(`Expected category: ${originalInput.category}`);
    }
    if (originalInput.goal) {
      hints.push(`Expected goal: ${originalInput.goal}`);
    }
    if (originalInput.tags && originalInput.tags.length > 0) {
      hints.push(`Suggested tags: ${originalInput.tags.join(', ')}`);
    }

    const hintsSection = hints.length > 0 ? `\n\nHints from uploader:\n${hints.join('\n')}` : '';

    return `
Analyze the following content and extract structured metadata.

Content:
${content}
${hintsSection}

Return a JSON object with:
{
  "title": "A descriptive title (5-12 words) that clearly conveys the main topic",
  "platform": "meta" | "google" | "tiktok" | "pinterest" | "multi",
  "category": "ad-copy" | "targeting" | "creative-strategy" | "campaign-optimization" | "audience-building" | "conversion-optimization" | "content-strategy" | "analytics" | "budget-management" | "testing-strategies",
  "goal": "awareness" | "engagement" | "conversion",
  "description": "2-3 sentence summary of the key insights and value",
  "key_insights": ["Array of 3-7 specific, actionable insights"],
  "tags": ["Array of 8-15 searchable keywords/phrases"],
  "example_quotes": ["Array of 1-3 impactful quotes or examples from the content"],
  "actionable_takeaways": ["Array of 3-5 specific actions someone could take based on this"],
  "target_audience": "Who this content is most relevant for (e.g., 'E-commerce brands', 'B2B marketers', 'Small business owners')",
  "difficulty_level": "beginner" | "intermediate" | "advanced"
}

Guidelines:
- Choose the most specific platform possible. Only use "multi" if it genuinely applies to multiple platforms
- Tags should be specific search terms (e.g., "carousel ads", "lookalike audiences", "A/B testing")
- Key insights should be specific and actionable, not generic advice
- Example quotes should be direct quotes from the content when possible
- Actionable takeaways should be concrete steps, not vague suggestions
    `.trim();
  }

  private parseResponse(response: string): AnalysisResult {
    try {
      const cleanJson = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanJson);

      // Validate required fields
      const required = [
        'title',
        'platform',
        'category',
        'goal',
        'description',
        'key_insights',
        'tags',
      ];
      for (const field of required) {
        if (!parsed[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate platform enum
      const validPlatforms: (AiePlatform | 'multi')[] = [
        'meta',
        'google',
        'tiktok',
        'pinterest',
        'multi',
      ];
      if (!validPlatforms.includes(parsed.platform)) {
        throw new Error(
          `Invalid platform: ${parsed.platform}. Must be one of: ${validPlatforms.join(', ')}`
        );
      }

      // Validate goal enum
      const validGoals: AieGoal[] = ['awareness', 'engagement', 'conversion'];
      if (!validGoals.includes(parsed.goal)) {
        throw new Error(
          `Invalid goal: ${parsed.goal}. Must be one of: ${validGoals.join(', ')}`
        );
      }

      // Validate arrays
      if (!Array.isArray(parsed.key_insights) || parsed.key_insights.length === 0) {
        throw new Error('key_insights must be a non-empty array');
      }
      if (!Array.isArray(parsed.tags) || parsed.tags.length === 0) {
        throw new Error('tags must be a non-empty array');
      }

      return {
        title: parsed.title,
        platform: parsed.platform,
        category: parsed.category,
        goal: parsed.goal,
        description: parsed.description,
        key_insights: parsed.key_insights,
        tags: parsed.tags,
        example_quotes: parsed.example_quotes || [],
        actionable_takeaways: parsed.actionable_takeaways || [],
        target_audience: parsed.target_audience,
        difficulty_level: parsed.difficulty_level,
      };
    } catch (error) {
      logger.error('[AnalysisAgent] Failed to parse response:', error as Error, { component: 'analysis' });
      logger.error(`Raw response: ${response}`, undefined, { component: 'analysis' });
      throw new Error(
        `Failed to parse analysis response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
