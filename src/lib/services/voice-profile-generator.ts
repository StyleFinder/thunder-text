/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * Voice Profile Generator Service
 * Generates brand voice profiles from content samples using OpenAI
 */

import {
  callChatCompletion,
  truncateToTokenLimit,
  estimateTokenCount,
} from "./openai-client";
import type { ContentSample } from "@/types/content-center";

export interface VoiceProfileResult {
  profileText: string;
  tokensUsed: number;
  generationTimeMs: number;
}

const VOICE_PROFILE_SYSTEM_PROMPT = `You are a professional brand voice analyst specializing in identifying and documenting unique writing styles. Your task is to analyze content samples and create a comprehensive brand voice profile.

Your analysis should be:
1. SPECIFIC - Use concrete examples and patterns, not generic descriptions
2. ACTIONABLE - Provide clear characteristics that can guide content generation
3. CONSISTENT - Base all observations on evidence from the samples
4. COMPREHENSIVE - Cover tone, style, vocabulary, structure, and personality

Format the profile as a structured document with these sections:
- TONE CHARACTERISTICS
- WRITING STYLE
- VOCABULARY PATTERNS
- BRAND PERSONALITY
- FORMATTING PREFERENCES
- SIGNATURE ELEMENTS (unique phrases, rhetorical devices, or patterns)

Be analytical and precise. Avoid generic terms like "engaging" or "professional" without specific supporting evidence.`;

const VOICE_PROFILE_USER_PROMPT = `Analyze the following content samples and create a detailed brand voice profile:

{samples}

Create a comprehensive voice profile that captures the unique characteristics of this writing style. Focus on specific, observable patterns that differentiate this voice from others.`;

/**
 * Generate brand voice profile from content samples
 */
export async function generateVoiceProfile(
  samples: ContentSample[],
): Promise<VoiceProfileResult> {
  const startTime = Date.now();

  if (samples.length < 3) {
    throw new Error(
      `Insufficient samples: need at least 3, got ${samples.length}`,
    );
  }

  // Prepare samples for analysis
  const samplesText = prepareSamplesForAnalysis(samples);

  // Build messages for OpenAI
  const messages = [
    {
      role: "system" as const,
      content: VOICE_PROFILE_SYSTEM_PROMPT,
    },
    {
      role: "user" as const,
      content: VOICE_PROFILE_USER_PROMPT.replace("{samples}", samplesText),
    },
  ];

  // Call OpenAI with retry logic
  const profileText = await callChatCompletion(
    messages,
    {
      model: "gpt-4o-mini", // Cost-effective for text analysis
      temperature: 0.3, // Lower temperature for more consistent analysis
      maxTokens: 2500, // Enough for detailed profile
      topP: 0.9,
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
    },
  );

  const generationTimeMs = Date.now() - startTime;

  // Estimate tokens used (rough estimate)
  const promptTokens = estimateTokenCount(
    VOICE_PROFILE_SYSTEM_PROMPT + samplesText,
  );
  const completionTokens = estimateTokenCount(profileText);
  const tokensUsed = promptTokens + completionTokens;

  return {
    profileText,
    tokensUsed,
    generationTimeMs,
  };
}

/**
 * Prepare samples for analysis
 * Combines samples with context about their type and truncates if needed
 */
function prepareSamplesForAnalysis(samples: ContentSample[]): string {
  const MAX_SAMPLE_TOKENS = 12000; // Leave room for system prompt and response

  let samplesText = samples
    .map((sample, index) => {
      const typeLabel = getSampleTypeLabel(sample.sample_type);
      return `
=== SAMPLE ${index + 1} (${typeLabel}, ${sample.word_count} words) ===
${sample.sample_text}
`;
    })
    .join("\n\n");

  // Check if we need to truncate
  const estimatedTokens = estimateTokenCount(samplesText);
  if (estimatedTokens > MAX_SAMPLE_TOKENS) {
    console.warn(
      `Samples exceed token limit (${estimatedTokens} > ${MAX_SAMPLE_TOKENS}). ` +
        `Truncating to fit...`,
    );
    samplesText = truncateToTokenLimit(samplesText, MAX_SAMPLE_TOKENS);
  }

  return samplesText;
}

/**
 * Get human-readable label for sample type
 */
function getSampleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    blog: "Blog Post",
    email: "Email",
    description: "Product Description",
    other: "General Content",
  };
  return labels[type] || type;
}

/**
 * Validate voice profile quality
 * Checks if the generated profile meets minimum quality standards
 */
export function validateVoiceProfile(profileText: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check minimum length
  const wordCount = profileText.trim().split(/\s+/).length;
  if (wordCount < 200) {
    issues.push("Profile is too short (less than 200 words)");
  }

  // Check for required sections
  const requiredSections = ["TONE", "STYLE", "VOCABULARY", "PERSONALITY"];
  const missingSections = requiredSections.filter(
    (section) => !profileText.toUpperCase().includes(section),
  );

  if (missingSections.length > 0) {
    issues.push(`Missing required sections: ${missingSections.join(", ")}`);
  }

  // Check for generic/vague language
  const genericPhrases = [
    "engaging content",
    "high quality",
    "professional tone",
    "clear communication",
  ];

  const hasGenericLanguage = genericPhrases.some((phrase) =>
    profileText.toLowerCase().includes(phrase.toLowerCase()),
  );

  if (hasGenericLanguage) {
    issues.push("Profile contains generic language. Should be more specific.");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Enhance existing voice profile with new samples
 * Useful when user adds more samples after initial profile generation
 */
export async function enhanceVoiceProfile(
  existingProfile: string,
  newSamples: ContentSample[],
): Promise<VoiceProfileResult> {
  const startTime = Date.now();

  const samplesText = prepareSamplesForAnalysis(newSamples);

  const enhancementPrompt = `You are refining an existing brand voice profile with additional content samples.

EXISTING PROFILE:
${existingProfile}

NEW SAMPLES:
${samplesText}

Task: Update and enhance the voice profile by:
1. Confirming patterns that appear in both old and new samples
2. Adding new patterns or characteristics found in the new samples
3. Refining descriptions to be more accurate based on the expanded sample set
4. Removing or adjusting any characteristics that don't hold up with the new evidence

Maintain the same structure and format as the existing profile. Be specific and evidence-based.`;

  const messages = [
    {
      role: "system" as const,
      content: VOICE_PROFILE_SYSTEM_PROMPT,
    },
    {
      role: "user" as const,
      content: enhancementPrompt,
    },
  ];

  const profileText = await callChatCompletion(messages, {
    model: "gpt-4o-mini", // Cost-effective for text analysis
    temperature: 0.3,
    maxTokens: 2500,
  });

  const generationTimeMs = Date.now() - startTime;
  const tokensUsed = estimateTokenCount(enhancementPrompt + profileText);

  return {
    profileText,
    tokensUsed,
    generationTimeMs,
  };
}
