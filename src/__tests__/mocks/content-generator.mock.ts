/**
 * Content Generator Mock
 *
 * Mocks the content generator service for testing without OpenAI API calls.
 * Used in content-generate.test.ts to test the generation endpoint.
 */

import type { GeneratedContentResult } from "@/lib/services/content-generator";

/**
 * Default mock response for content generation
 */
export const mockGeneratedContent: GeneratedContentResult = {
  content:
    "This is mock generated content for testing purposes. It contains enough words to pass validation and demonstrates the expected structure of generated content from the OpenAI API.",
  wordCount: 30,
  tokensUsed: 150,
  generationTimeMs: 1234,
  metadata: {
    contentType: "blog",
    topic: "Test Topic",
    requestedWordCount: 100,
    actualWordCount: 30,
    toneIntensity: 3,
    ctaType: "shop_now",
    voiceProfileVersion: 1,
  },
};

/**
 * Create a customized mock response
 */
export function createMockGeneratedContent(
  overrides: Partial<GeneratedContentResult> = {},
): GeneratedContentResult {
  return {
    ...mockGeneratedContent,
    ...overrides,
    metadata: {
      ...mockGeneratedContent.metadata,
      ...(overrides.metadata || {}),
    },
  };
}

/**
 * Mock implementation of generateContent
 * Returns predictable content for testing
 */
export const mockGenerateContent = jest
  .fn()
  .mockImplementation(
    async (voiceProfile: any, params: any): Promise<GeneratedContentResult> => {
      return createMockGeneratedContent({
        metadata: {
          ...mockGeneratedContent.metadata,
          contentType: params.contentType,
          topic: params.topic,
          requestedWordCount: params.wordCount,
          toneIntensity: params.toneIntensity,
          ctaType: params.ctaType,
        },
      });
    },
  );

/**
 * Reset the mock between tests
 */
export function resetContentGeneratorMock(): void {
  mockGenerateContent.mockClear();
}
