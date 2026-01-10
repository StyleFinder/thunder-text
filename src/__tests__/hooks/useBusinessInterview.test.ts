/**
 * useBusinessInterview Hook Tests
 *
 * Q4: Tests for the business interview hook extracted in Q1
 */

import { renderHook, act, waitFor as _waitFor } from "@testing-library/react";
import { useBusinessInterview } from "@/hooks/useBusinessInterview";
import type { InterviewPrompt } from "@/types/business-profile";

/**
 * Creates a test interview prompt with required defaults
 */
function createTestPrompt(overrides: Partial<InterviewPrompt>): InterviewPrompt {
  return {
    id: "test-id",
    prompt_key: "test_prompt",
    category: "test",
    question_number: 1,
    question_text: "Test question?",
    display_order: 1,
    is_required: false,
    min_words: 0,
    suggested_words: 50,
    is_active: true,
    is_quick_start: false,
    quick_start_order: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("useBusinessInterview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("initial state", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentInput).toBe("");
      expect(result.current.currentPrompt).toBeNull();
      expect(result.current.interviewStatus).toBe("not_started");
      expect(result.current.progress).toBe(0);
      expect(result.current.totalQuestions).toBe(19);
      expect(result.current.currentQuestionNumber).toBe(0);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should have refs initialized", () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      expect(result.current.messagesEndRef.current).toBeNull();
      expect(result.current.hasLoadedProfile.current).toBe(false);
    });
  });

  describe("addAIMessage", () => {
    it("should add an AI message to the messages array", () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      act(() => {
        result.current.addAIMessage("Hello, I am the AI assistant");
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].type).toBe("ai");
      expect(result.current.messages[0].content).toBe(
        "Hello, I am the AI assistant"
      );
      expect(result.current.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it("should add an AI message with prompt key", () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      act(() => {
        result.current.addAIMessage("What is your business name?", "business_name");
      });

      expect(result.current.messages[0].prompt_key).toBe("business_name");
    });
  });

  describe("addUserMessage", () => {
    it("should add a user message to the messages array", () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      act(() => {
        result.current.addUserMessage("My business is called Test Inc");
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].type).toBe("user");
      expect(result.current.messages[0].content).toBe(
        "My business is called Test Inc"
      );
    });
  });

  describe("setCurrentInput", () => {
    it("should update the current input", () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      act(() => {
        result.current.setCurrentInput("New input value");
      });

      expect(result.current.currentInput).toBe("New input value");
    });
  });

  describe("setError", () => {
    it("should update the error state", () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      act(() => {
        result.current.setError("Something went wrong");
      });

      expect(result.current.error).toBe("Something went wrong");
    });

    it("should clear the error state", () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      act(() => {
        result.current.setError("Something went wrong");
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("startInterview", () => {
    it("should set error when shopDomain is null", async () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: null })
      );

      await act(async () => {
        await result.current.startInterview("full");
      });

      expect(result.current.error).toBe(
        "Shop domain not found. Please reload the page from Shopify Admin."
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should start interview and set status to in_progress", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                profile: { id: "123" },
                first_prompt: {
                  prompt_key: "business_name",
                  question_text: "What is your business name?",
                },
                total_questions: 21,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                profile: { id: "123" },
                responses: [],
                progress: { current_question: 0, percentage_complete: 0 },
              },
            }),
        });

      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      await act(async () => {
        await result.current.startInterview("full");
      });

      expect(result.current.interviewStatus).toBe("in_progress");
      expect(result.current.error).toBeNull();
    });

    it("should handle API error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      await act(async () => {
        await result.current.startInterview("full");
      });

      expect(result.current.error).toBe(
        "Failed to start interview. Please try again."
      );
    });
  });

  describe("submitAnswer", () => {
    it("should not submit when answer is empty", async () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      // Set a current prompt
      act(() => {
        result.current.setCurrentPrompt(createTestPrompt({
          id: "1",
          prompt_key: "business_name",
          question_text: "What is your business name?",
          question_number: 1,
          is_required: true,
        }));
      });

      await act(async () => {
        await result.current.submitAnswer("");
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should validate minimum word count", async () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      // Set a prompt with min_words requirement
      act(() => {
        result.current.setCurrentPrompt(createTestPrompt({
          id: "1",
          prompt_key: "business_description",
          question_text: "Describe your business",
          question_number: 2,
          is_required: true,
          min_words: 20,
        }));
      });

      await act(async () => {
        await result.current.submitAnswer("Too short");
      });

      expect(result.current.error).toContain("Please provide at least 20 words");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should submit answer successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              progress: {
                percentage_complete: 10,
                current_question: 2,
              },
              next_prompt: {
                prompt_key: "target_audience",
                question_text: "Who is your target audience?",
                question_number: 2,
              },
            },
          }),
      });

      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      // Set a current prompt
      act(() => {
        result.current.setCurrentPrompt(createTestPrompt({
          id: "1",
          prompt_key: "business_name",
          question_text: "What is your business name?",
          question_number: 1,
          is_required: true,
        }));
      });

      await act(async () => {
        await result.current.submitAnswer("My Business Name is Test Inc");
      });

      expect(result.current.progress).toBe(10);
      expect(result.current.currentQuestionNumber).toBe(2);
      expect(result.current.messages).toHaveLength(1); // User message added
      expect(result.current.messages[0].content).toBe(
        "My Business Name is Test Inc"
      );
    });
  });

  describe("resetInterview", () => {
    it("should return false when shopDomain is null", async () => {
      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: null })
      );

      let success: boolean;
      await act(async () => {
        success = await result.current.resetInterview();
      });

      expect(success!).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should reset interview state on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
          }),
      });

      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      // Add some state first
      act(() => {
        result.current.addAIMessage("Test message");
        result.current.setProgress(50);
        result.current.setInterviewStatus("in_progress");
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.resetInterview();
      });

      expect(success!).toBe(true);
      expect(result.current.messages).toEqual([]);
      expect(result.current.interviewStatus).toBe("not_started");
      expect(result.current.progress).toBe(0);
      expect(result.current.currentPrompt).toBeNull();
    });

    it("should handle API error on reset", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useBusinessInterview({ shopDomain: "test-shop.myshopify.com" })
      );

      let success: boolean;
      await act(async () => {
        success = await result.current.resetInterview();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe(
        "Failed to reset interview. Please try again."
      );
    });
  });

  describe("callback integration", () => {
    it("should call onProfileUpdate when interview starts", async () => {
      const onProfileUpdate = jest.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                profile: { id: "123", business_name: "Test" },
                first_prompt: {
                  prompt_key: "business_name",
                  question_text: "What is your business name?",
                },
                total_questions: 21,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                profile: { id: "123" },
                responses: [],
                progress: { current_question: 0, percentage_complete: 0 },
              },
            }),
        });

      const { result } = renderHook(() =>
        useBusinessInterview({
          shopDomain: "test-shop.myshopify.com",
          onProfileUpdate,
        })
      );

      await act(async () => {
        await result.current.startInterview("full");
      });

      expect(onProfileUpdate).toHaveBeenCalledWith({
        id: "123",
        business_name: "Test",
      });
    });
  });
});
