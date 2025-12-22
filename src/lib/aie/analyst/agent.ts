import { callChatCompletion } from '@/lib/services/openai-client';
import { AdVariant, ResearchContext, AiePlatform, AieGoal, BrandVoiceContext } from '../../../types/aie';
import { logger } from '@/lib/logger'

export class AnalystAgent {

    /**
     * Review and score a list of ad variants
     */
    async scoreVariants(
        variants: Partial<AdVariant>[],
        context: ResearchContext,
        platform: AiePlatform,
        goal: AieGoal
    ): Promise<Partial<AdVariant>[]> {

        // 1. Prepare the variants for analysis
        const variantsText = variants.map((v, i) =>
            `Variant ${i + 1} (${v.variant_type}):\nHeadline: ${v.headline}\nPrimary Text: ${v.primary_text}`
        ).join('\n\n');

        // 2. Build brand voice scoring criteria if available
        const brandVoiceCriteria = this.buildBrandVoiceCriteria(context.brandVoice);

        // 3. Construct the scoring prompt
        const systemPrompt = `
You are the Analyst Agent for the Ad Intelligence Engine (AIE).
Your job is to critique and score ad copy based on predicted performance.

Scoring Criteria (0-10):
- Hook Strength (2 pts): Does the first line grab attention immediately?
- Clarity (2 pts): Is the value proposition easy to understand?
- Platform Fit (2 pts):
  * Does it feel native to ${platform}?
  * MOBILE OPTIMIZATION: Primary text ≤ 90 characters gets full points
  * PENALTY: 91-125 chars = -0.5pts, 126-250 chars = -1pt, 251+ chars = -1.5pts
  * Headline 25-40 chars (shorter = better for mobile)
- Call to Action (2 pts):
  * Is there a STRONG, clear CTA at the end?
  * Does it use an action verb (Shop, Get, Buy, Discover, etc.)?
  * Does it match the goal (${goal})?
  * Does it create urgency when appropriate?
  * PENALIZE if CTA is weak, missing, or doesn't match goal
${brandVoiceCriteria ? `- Brand Voice Alignment (2 pts): Does it match the brand's tone, vocabulary, and values?` : ''}

${brandVoiceCriteria || ''}

CTA Scoring Guide for ${goal}:
${this.getCTAScoringGuide(goal)}

Output:
Return a JSON array of scores (one for each variant) with a brief critique.
    `.trim();

        const userPrompt = `
Goal: ${goal}
Platform: ${platform}

Best Practices to Check Against:
${context.bestPractices.map(bp => `- ${bp.title}`).join('\n')}

Ad Variants to Score:
${variantsText}

Output Format (JSON Array):
[
  {
    "variant_index": 0,
    "score": 8.5,
    "critique": "Strong hook, but CTA could be more urgent."${context.brandVoice ? ',\n    "brand_alignment": "Good tone match, uses preferred vocabulary"' : ''}
  },
  ...
]
    `.trim();

        // 3. Call OpenAI
        const response = await callChatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            model: 'gpt-4o-mini', // Cost-effective for text analysis
            temperature: 0.2 // Low temperature for consistent, objective grading
        });

        // 4. Parse and merge scores
        try {
            const scores = this.parseResponse(response);

            // Merge scores back into the variants
            return variants.map((variant, index) => {
                const scoreData = scores.find((s: { variant_index: number; score: number; critique: string }) => s.variant_index === index);
                return {
                    ...variant,
                    predicted_score: scoreData ? scoreData.score : 0,
                    // We could also attach the critique to the variant object if we extended the type
                };
            });

        } catch (error) {
            logger.error('Failed to parse Analyst Agent response:', error as Error, { component: 'agent' });
            // Return variants without scores if analysis fails, rather than crashing
            return variants.map(v => ({ ...v, predicted_score: 0 }));
        }
    }

    private parseResponse(response: string): Array<{ variant_index: number; score: number; critique: string; brand_alignment?: string }> {
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    }

    /**
     * Build brand voice scoring criteria section for the prompt
     */
    private buildBrandVoiceCriteria(brandVoice?: BrandVoiceContext): string | null {
        if (!brandVoice) return null;

        const parts: string[] = [];
        parts.push('');
        parts.push('BRAND VOICE REQUIREMENTS (for scoring brand alignment):');

        if (brandVoice.tone) {
            parts.push(`- Expected Tone: ${brandVoice.tone}`);
        }
        if (brandVoice.style) {
            parts.push(`- Expected Style: ${brandVoice.style}`);
        }
        if (brandVoice.preferredTerms.length > 0) {
            parts.push(`- Should use: ${brandVoice.preferredTerms.slice(0, 5).join(', ')}`);
        }
        if (brandVoice.avoidedTerms.length > 0) {
            parts.push(`- Should NOT use: ${brandVoice.avoidedTerms.slice(0, 5).join(', ')}`);
        }
        if (brandVoice.coreValues.length > 0) {
            parts.push(`- Should reflect values: ${brandVoice.coreValues.join(', ')}`);
        }

        return parts.length > 2 ? parts.join('\n') : null;
    }

    /**
     * Build CTA scoring guidance for specific goals
     */
    private getCTAScoringGuide(goal: AieGoal): string {
        const guides: Record<AieGoal, string> = {
            conversion: `
Strong CTAs (2 pts): "Shop Now", "Buy Now", "Get Yours Today", "Add to Cart", "Order Now"
Weak CTAs (1 pt): "Click here", "Visit us", "See more" (too vague)
Missing/Poor (0 pts): No CTA, or CTA doesn't drive purchase action
            `,
            awareness: `
Strong CTAs (2 pts): "Learn More", "Discover Why", "Find Out How", "Explore"
Weak CTAs (1 pt): Generic phrases without intrigue
Missing/Poor (0 pts): No CTA, or CTA too sales-y for awareness goal
            `,
            engagement: `
Strong CTAs (2 pts): "Tag Someone", "Share Your Story", "Comment Below", "Join the Conversation"
Weak CTAs (1 pt): One-way asks without community aspect
Missing/Poor (0 pts): No CTA, or CTA doesn't encourage interaction
            `,
            traffic: `
Strong CTAs (2 pts): "Visit Our Site", "Browse Now", "See the Full Collection", "Explore More"
Weak CTAs (1 pt): Vague navigation prompts
Missing/Poor (0 pts): No CTA, or CTA doesn't drive website traffic
            `,
            app_installs: `
Strong CTAs (2 pts): "Download Now", "Get the App", "Install Today", "Try It Free"
Weak CTAs (1 pt): Download prompts without urgency
Missing/Poor (0 pts): No CTA, or CTA doesn't explicitly request app install
            `
        };

        return guides[goal].trim();
    }
}
