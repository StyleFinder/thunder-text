/**
 * useBusinessInterview Hook
 *
 * Q1: Extracted from business-profile/page.tsx to manage interview state
 * Handles chat messages, prompts, progress tracking, and interview flow
 */

import { useState, useRef, useCallback } from "react";
import type {
  ChatMessage,
  InterviewPrompt,
  InterviewStatus,
  BusinessProfile,
} from "@/types/business-profile";
import { logger } from "@/lib/logger";

interface UseBusinessInterviewOptions {
  shopDomain: string | null;
  onProfileUpdate?: (profile: BusinessProfile) => void;
}

interface UseBusinessInterviewReturn {
  // State
  messages: ChatMessage[];
  currentInput: string;
  currentPrompt: InterviewPrompt | null;
  interviewStatus: InterviewStatus;
  progress: number;
  totalQuestions: number;
  currentQuestionNumber: number;
  isSubmitting: boolean;
  error: string | null;

  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  hasLoadedProfile: React.MutableRefObject<boolean>;

  // Actions
  setCurrentInput: (input: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setInterviewStatus: (status: InterviewStatus) => void;
  setProgress: (progress: number) => void;
  setCurrentPrompt: (prompt: InterviewPrompt | null) => void;
  setError: (error: string | null) => void;
  addAIMessage: (content: string, promptKey?: string) => void;
  addUserMessage: (content: string) => void;
  startInterview: (mode: "full" | "quick_start") => Promise<void>;
  submitAnswer: (
    finalAnswer: string,
    onComplete?: () => void
  ) => Promise<void>;
  resetInterview: () => Promise<boolean>;
}

export function useBusinessInterview({
  shopDomain,
  onProfileUpdate,
}: UseBusinessInterviewOptions): UseBusinessInterviewReturn {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState<InterviewPrompt | null>(
    null
  );

  // Interview state
  const [interviewStatus, setInterviewStatus] =
    useState<InterviewStatus>("not_started");
  const [progress, setProgress] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(19);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedProfile = useRef(false);

  const addAIMessage = useCallback((content: string, promptKey?: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      type: "ai",
      content,
      timestamp: new Date(),
      prompt_key: promptKey,
    };
    setMessages((prev) => [...prev, message]);
  }, []);

  const addUserMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      type: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  }, []);

  const startInterview = useCallback(
    async (mode: "full" | "quick_start" = "full") => {
      if (!shopDomain) {
        setError(
          "Shop domain not found. Please reload the page from Shopify Admin."
        );
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/business-profile/start", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${shopDomain}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode }),
        });

        const data = await response.json();

        if (data.success) {
          if (onProfileUpdate) {
            onProfileUpdate(data.data.profile);
          }
          setInterviewStatus("in_progress");
          setTotalQuestions(
            data.data.total_questions || (mode === "quick_start" ? 12 : 21)
          );

          // Load any existing responses for this mode
          const profileResponse = await fetch("/api/business-profile", {
            headers: {
              Authorization: `Bearer ${shopDomain}`,
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();

            if (
              profileData.success &&
              profileData.data.responses &&
              profileData.data.responses.length > 0
            ) {
              // User has existing responses - load chat history
              const chatHistory: ChatMessage[] = [];

              const timeEstimate =
                mode === "quick_start" ? "5-7 minutes" : "15-20 minutes";
              chatHistory.push({
                id: "welcome",
                type: "ai",
                content: `Hi! I'm here to learn about your business so we can create content that truly represents your brand. This ${mode === "quick_start" ? "quick" : ""} conversation will take about ${timeEstimate}. Ready to get started?`,
                timestamp: new Date(
                  profileData.data.profile.interview_started_at || Date.now()
                ),
              });

              // Add question-answer pairs from existing responses
              profileData.data.responses.forEach(
                (resp: {
                  id: string;
                  prompt?: { question_text?: string };
                  prompt_key: string;
                  response_text: string;
                  created_at: string;
                }) => {
                  chatHistory.push({
                    id: `q-${resp.id}`,
                    type: "ai",
                    content: resp.prompt?.question_text || resp.prompt_key,
                    timestamp: new Date(resp.created_at),
                    prompt_key: resp.prompt_key,
                  });

                  chatHistory.push({
                    id: `a-${resp.id}`,
                    type: "user",
                    content: resp.response_text,
                    timestamp: new Date(resp.created_at),
                  });
                }
              );

              setMessages(chatHistory);
              setProgress(profileData.data.progress.percentage_complete);
              setCurrentQuestionNumber(
                profileData.data.progress.current_question
              );

              // If there's a next prompt, show it
              if (profileData.data.progress.next_prompt) {
                setCurrentPrompt(profileData.data.progress.next_prompt);
                setTimeout(() => {
                  addAIMessage(
                    profileData.data.progress.next_prompt.question_text,
                    profileData.data.progress.next_prompt.prompt_key
                  );
                }, 500);
              }
            } else {
              // No existing responses - start fresh
              setCurrentPrompt(data.data.first_prompt);
              const timeEstimate =
                mode === "quick_start" ? "5-7 minutes" : "15-20 minutes";
              addAIMessage(
                `Hi! I'm here to learn about your business so we can create content that truly represents your brand. This ${mode === "quick_start" ? "quick" : ""} conversation will take about ${timeEstimate}. Ready to get started?`
              );

              setTimeout(() => {
                addAIMessage(
                  data.data.first_prompt.question_text,
                  data.data.first_prompt.prompt_key
                );
              }, 1500);
            }
          }
        } else {
          setError(data.error || "Failed to start interview");
        }
      } catch (err) {
        logger.error("Failed to start interview:", err as Error, {
          component: "useBusinessInterview",
        });
        setError("Failed to start interview. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [shopDomain, onProfileUpdate, addAIMessage]
  );

  const submitAnswer = useCallback(
    async (finalAnswer: string, onComplete?: () => void) => {
      if (!finalAnswer.trim() || !currentPrompt || !shopDomain) return;

      const wordCount = finalAnswer.trim().split(/\s+/).length;
      if (currentPrompt.min_words && wordCount < currentPrompt.min_words) {
        setError(
          `Please provide at least ${currentPrompt.min_words} words (current: ${wordCount})`
        );
        return;
      }

      setIsSubmitting(true);
      setError(null);

      addUserMessage(finalAnswer);
      setCurrentInput("");

      try {
        const response = await fetch("/api/business-profile/answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${shopDomain}`,
          },
          body: JSON.stringify({
            prompt_key: currentPrompt.prompt_key,
            question_number: currentPrompt.question_number,
            response_text: finalAnswer,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setProgress(data.data.progress.percentage_complete);
          setCurrentQuestionNumber(data.data.progress.current_question);

          if (data.data.interview_complete) {
            setTimeout(() => {
              addAIMessage("Excellent! You've completed all questions. 🎉");
            }, 800);
          } else if (data.data.next_prompt) {
            setCurrentPrompt(data.data.next_prompt);

            setTimeout(() => {
              addAIMessage(
                data.data.next_prompt.question_text,
                data.data.next_prompt.prompt_key
              );
            }, 1000);
          }

          if (onComplete) {
            onComplete();
          }
        } else {
          setError(data.error || "Failed to submit answer");
        }
      } catch (err) {
        logger.error("Failed to submit answer:", err as Error, {
          component: "useBusinessInterview",
        });
        setError("Failed to submit answer. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentPrompt, shopDomain, addAIMessage, addUserMessage]
  );

  const resetInterview = useCallback(async (): Promise<boolean> => {
    if (!shopDomain) return false;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/business-profile/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessages([]);
        setInterviewStatus("not_started");
        setProgress(0);
        setCurrentPrompt(null);
        setCurrentInput("");
        hasLoadedProfile.current = false;
        return true;
      } else {
        setError(data.error || "Failed to reset interview");
        return false;
      }
    } catch (err) {
      logger.error("Failed to reset interview:", err as Error, {
        component: "useBusinessInterview",
      });
      setError("Failed to reset interview. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [shopDomain]);

  return {
    // State
    messages,
    currentInput,
    currentPrompt,
    interviewStatus,
    progress,
    totalQuestions,
    currentQuestionNumber,
    isSubmitting,
    error,

    // Refs
    messagesEndRef,
    hasLoadedProfile,

    // Actions
    setCurrentInput,
    setMessages,
    setInterviewStatus,
    setProgress,
    setCurrentPrompt,
    setError,
    addAIMessage,
    addUserMessage,
    startInterview,
    submitAnswer,
    resetInterview,
  };
}
