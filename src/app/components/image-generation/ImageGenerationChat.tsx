/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Sparkles,
  User,
  Loader2,
  ImageIcon,
  AlertCircle,
  RefreshCw,
  Download,
  Save,
  Share2,
  FileDown,
  Copy,
  Check,
  ChevronDown,
  Square,
  SkipForward,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { colors } from "@/lib/design-system/colors";
import { useShop } from "@/hooks/useShop";
import type {
  OpenAIImageModel,
  AspectRatio,
  GeneratedImage,
  PromptDebugInfo,
  SessionExportData,
  QuestionnaireState,
  QuestionnaireAnswer,
  Question,
} from "@/types/image-generation";
import { QuestionCard } from "./QuestionCard";
import { PromptLibrary } from "./PromptLibrary";
import {
  QUESTIONNAIRE_QUESTIONS,
  getNextQuestion,
  getVisibleQuestions,
  buildAnswerSummary,
  getAutoSize,
} from "@/lib/services/questionnaire-config";
import { authenticatedFetch } from "@/lib/shopify/api-client";
import { logger } from "@/lib/logger";

// Message types for chat interface
interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "error" | "system" | "question";
  content: string;
  timestamp: Date;
  image?: GeneratedImage;
  isLoading?: boolean;
  promptDebug?: PromptDebugInfo;
  // Questionnaire-specific fields
  questionIndex?: number;
  showSkip?: boolean;
  /** The question object (needed for dynamic questions with loaded options) */
  question?: Question;
  /** Total visible questions count for progress display */
  visibleQuestionsCount?: number;
  /** Whether to show the prominent skip button in system messages */
  showSkipButton?: boolean;
}

interface ImageGenerationChatProps {
  shopId: string;
  /** Shop domain for fetching product types from Shopify */
  shopDomain?: string;
  referenceImage: string | null;
  openaiModel: OpenAIImageModel;
  aspectRatio: AspectRatio;
  onImageGenerated: (image: GeneratedImage) => void;
  onSaveToLibrary?: (image: GeneratedImage) => Promise<boolean>;
  _onDownload?: (format?: "png" | "jpg" | "webp") => void;
  onExport?: () => void;
  disabled?: boolean;
}

export function ImageGenerationChat({
  shopId,
  shopDomain: shopDomainProp,
  referenceImage,
  openaiModel,
  aspectRatio,
  onImageGenerated,
  onSaveToLibrary,
  _onDownload,
  onExport,
  disabled = false,
}: ImageGenerationChatProps) {
  // Get shop info from hook as fallback if not passed as props
  // We prefer shopDomain for Shopify API calls, but can fall back to shopId for DB lookup
  const { shopDomain: shopDomainFromHook, shopId: shopIdFromHook } = useShop();
  const shopDomain = shopDomainProp || shopDomainFromHook || undefined;
  const resolvedShopId = shopId || shopIdFromHook || undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionStartedAt] = useState<string>(new Date().toISOString());
  const [promptLogs, setPromptLogs] = useState<PromptDebugInfo[]>([]);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [savedImageIds, setSavedImageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Questionnaire state
  const [questionnaireState, setQuestionnaireState] =
    useState<QuestionnaireState>({
      currentQuestionIndex: 0,
      answers: [],
      isComplete: false,
      wasSkipped: false,
    });
  const [questionnaireStarted, setQuestionnaireStarted] = useState(false);

  // Shopify product types for dynamic question
  const [shopifyProductTypes, setShopifyProductTypes] = useState<string[]>([]);
  const [productTypesLoading, setProductTypesLoading] = useState(false);

  // Fetch Shopify product types on mount
  useEffect(() => {
    async function fetchProductTypes() {
      // Need at least shopDomain or resolvedShopId to fetch product types
      if (!shopDomain && !resolvedShopId) return;

      setProductTypesLoading(true);
      try {
        const params = new URLSearchParams();
        // Pass both shop (domain) and shopId when available
        // API will try shopId first for DB lookup, then fall back to domain
        if (shopDomain) {
          params.append("shop", shopDomain);
        }
        if (resolvedShopId) {
          params.append("shopId", resolvedShopId);
        }
        const url = `/api/shopify/product-types?${params.toString()}`;
        const response = await authenticatedFetch(url);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.productTypes) {
            setShopifyProductTypes(data.data.productTypes);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch product types:", err);
        // Non-critical - user can still type custom answer
      } finally {
        setProductTypesLoading(false);
      }
    }

    fetchProductTypes();
  }, [shopDomain, resolvedShopId]);

  // Helper to build a question with dynamically loaded options
  const getQuestionWithOptions = useCallback(
    (question: Question): Question => {
      if (question.isDynamic && question.id === "productType") {
        // Build options from loaded Shopify product types
        const options = shopifyProductTypes.map((type) => ({
          label: type,
          value: type,
          icon: undefined,
          description: undefined,
        }));
        return { ...question, options };
      }
      return question;
    },
    [shopifyProductTypes],
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input after generation completes
  useEffect(() => {
    if (!isGenerating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isGenerating]);

  // Reset conversation when reference image changes
  // This ensures a new product uses a fresh conversation, not iterating on old images
  const previousReferenceImageRef = useRef<string | null>(referenceImage);
  useEffect(() => {
    const previousRef = previousReferenceImageRef.current;
    // Update ref immediately
    previousReferenceImageRef.current = referenceImage;

    // Only reset if there was a previous reference image and it changed to a different one
    if (
      previousRef !== null &&
      previousRef !== referenceImage &&
      referenceImage !== null
    ) {
      // Reset questionnaire state
      setQuestionnaireState({
        currentQuestionIndex: 0,
        answers: [],
        isComplete: false,
        wasSkipped: false,
      });
      setQuestionnaireStarted(true);
      setConversationId(null);
      setPromptLogs([]);

      // Start fresh with the first question using getNextQuestion
      const nextQ = getNextQuestion([]);
      if (nextQ) {
        const questionWithOptions = getQuestionWithOptions(nextQ.question);
        const visibleCount = getVisibleQuestions([]).length;
        setMessages([
          {
            id: Math.random().toString(36).substring(2, 15),
            type: "question",
            content: questionWithOptions.text,
            timestamp: new Date(),
            questionIndex: nextQ.index,
            showSkip: true,
            question: questionWithOptions,
            visibleQuestionsCount: visibleCount,
          },
        ]);
      }
    }
  }, [referenceImage, getQuestionWithOptions]);

  // Start questionnaire when reference image is first uploaded
  useEffect(() => {
    if (referenceImage && !questionnaireStarted && messages.length === 0) {
      // Start the questionnaire
      setQuestionnaireStarted(true);
      // Add welcome message with skip option first
      const welcomeMessage: ChatMessage = {
        id: generateId(),
        type: "system",
        content:
          "Great! I'll ask a few quick questions to help generate the perfect scene. This usually takes about 30 seconds and helps create better results.",
        timestamp: new Date(),
        showSkipButton: true,
      };
      // Add the first question using getNextQuestion for proper conditional logic
      const nextQ = getNextQuestion([]);
      if (nextQ) {
        const questionWithOptions = getQuestionWithOptions(nextQ.question);
        const visibleCount = getVisibleQuestions([]).length;
        setMessages([
          welcomeMessage,
          {
            id: generateId(),
            type: "question",
            content: questionWithOptions.text,
            timestamp: new Date(),
            questionIndex: nextQ.index,
            showSkip: true,
            question: questionWithOptions,
            visibleQuestionsCount: visibleCount,
          },
        ]);
      }
    }
  }, [
    referenceImage,
    questionnaireStarted,
    messages.length,
    getQuestionWithOptions,
  ]);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const addMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "timestamp">) => {
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        },
      ]);
    },
    [],
  );

  const updateLastAssistantMessage = useCallback(
    (update: Partial<ChatMessage>) => {
      setMessages((prev) => {
        const newMessages = [...prev];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].type === "assistant") {
            newMessages[i] = { ...newMessages[i], ...update };
            break;
          }
        }
        return newMessages;
      });
    },
    [],
  );

  // Handle questionnaire answer selection
  // Now accepts questionId to properly handle answer changes on previously answered questions
  const handleQuestionnaireAnswer = useCallback(
    (
      answerValue: string,
      answerLabel: string,
      isCustom: boolean,
      questionId: string,
    ) => {
      // Find the question being answered
      const targetQuestion = QUESTIONNAIRE_QUESTIONS.find(
        (q) => q.id === questionId,
      );
      if (!targetQuestion) return;

      // Record the answer
      const newAnswer: QuestionnaireAnswer = {
        questionId: targetQuestion.id,
        questionText: targetQuestion.text,
        answer: answerValue,
        answerLabel: answerLabel,
        isCustom,
      };

      // Check if this question was already answered - if so, replace the answer
      const existingAnswerIndex = questionnaireState.answers.findIndex(
        (a) => a.questionId === questionId,
      );
      let newAnswers: QuestionnaireAnswer[];
      const isChangingAnswer = existingAnswerIndex >= 0;

      if (isChangingAnswer) {
        // Replace existing answer (user is changing their selection)
        newAnswers = [...questionnaireState.answers];
        newAnswers[existingAnswerIndex] = newAnswer;

        // If changing productType, also remove any auto-applied size answer
        if (questionId === "productType") {
          newAnswers = newAnswers.filter(
            (a) =>
              a.questionId !== "productSize" ||
              !questionnaireState.answers.find(
                (prev) =>
                  prev.questionId === "productType" && getAutoSize(prev.answer),
              ),
          );
        }
      } else {
        // Add new answer
        newAnswers = [...questionnaireState.answers, newAnswer];
      }

      // Add user's answer as a message (shows what they selected)
      addMessage({
        type: "user",
        content: isChangingAnswer ? `Changed to: ${answerLabel}` : answerLabel,
      });

      // If this was the productType question, check for auto-size
      if (questionId === "productType") {
        const autoSize = getAutoSize(answerValue);
        if (autoSize) {
          // Auto-apply size for categories like Jewelry
          const sizeQuestion = QUESTIONNAIRE_QUESTIONS.find(
            (q) => q.id === "productSize",
          );
          if (sizeQuestion) {
            // Check if size was already answered (remove it to re-apply auto-size)
            newAnswers = newAnswers.filter(
              (a) => a.questionId !== "productSize",
            );
            const sizeOption = sizeQuestion.options.find(
              (o) => o.value === autoSize,
            );
            const sizeLabel = sizeOption?.label || autoSize;
            newAnswers = [
              ...newAnswers,
              {
                questionId: "productSize",
                questionText: sizeQuestion.text,
                answer: autoSize,
                answerLabel: sizeLabel,
                isCustom: false,
              },
            ];
          }
        }
      }

      // If changing an answer, just update the state without advancing (questionnaire might already be complete)
      if (isChangingAnswer) {
        setQuestionnaireState({
          ...questionnaireState,
          answers: newAnswers,
        });
        // Show acknowledgment if questionnaire was already complete
        if (questionnaireState.isComplete) {
          setTimeout(() => {
            const summary = buildAnswerSummary(newAnswers);
            addMessage({
              type: "assistant",
              content: `Got it! Updated your preferences.\n\n${summary}`,
            });
          }, 300);
        }
        return;
      }

      // Use getNextQuestion to find the next unanswered, visible question
      const nextQ = getNextQuestion(newAnswers);

      if (nextQ) {
        // There's another question to show
        const questionWithOptions = getQuestionWithOptions(nextQ.question);
        const visibleCount = getVisibleQuestions(newAnswers).length;

        setQuestionnaireState({
          ...questionnaireState,
          currentQuestionIndex: nextQ.index,
          answers: newAnswers,
        });

        // Add next question message (slight delay for UX)
        setTimeout(() => {
          addMessage({
            type: "question",
            content: questionWithOptions.text,
            questionIndex: nextQ.index,
            showSkip: true,
            question: questionWithOptions,
            visibleQuestionsCount: visibleCount,
          });
        }, 300);
      } else {
        // Questionnaire complete
        const currentIndex = questionnaireState.currentQuestionIndex;
        setQuestionnaireState({
          currentQuestionIndex: currentIndex,
          answers: newAnswers,
          isComplete: true,
          wasSkipped: false,
        });

        // Add summary message
        setTimeout(() => {
          const summary = buildAnswerSummary(newAnswers);
          addMessage({
            type: "assistant",
            content: summary,
          });
        }, 300);
      }
    },
    [questionnaireState, addMessage, getQuestionWithOptions],
  );

  // Handle questionnaire skip - preserves any answers already collected
  const handleQuestionnaireSkip = useCallback(() => {
    // Keep any answers the user has already provided
    const partialAnswers = questionnaireState.answers;

    setQuestionnaireState({
      currentQuestionIndex: questionnaireState.currentQuestionIndex,
      answers: partialAnswers,
      isComplete: true,
      wasSkipped: true,
    });

    // Add skip acknowledgment message - different if they answered some questions
    const hasPartialAnswers = partialAnswers.length > 0;
    const message = hasPartialAnswers
      ? `Got it! I'll use your ${partialAnswers.length} answer${partialAnswers.length > 1 ? "s" : ""} to help guide the image.\n\nNow describe the scene you'd like to see your product in:`
      : 'No problem! You can describe your scene directly. Here are some tips:\n\n• Be specific about indoor vs outdoor: "inside a living room" or "on a front porch"\n• Describe the setting: foyer, fireplace mantel, garden, patio, etc.\n• Add mood: "cozy", "elegant", "modern", "rustic", "festive"\n\nNow describe the scene you\'d like to see your product in:';

    addMessage({
      type: "assistant",
      content: message,
    });
  }, [addMessage, questionnaireState]);

  const handleGenerate = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const prompt = inputValue.trim();
    setInputValue("");

    // Add user message
    addMessage({
      type: "user",
      content: prompt,
    });

    // Add loading message
    addMessage({
      type: "assistant",
      content: "Generating your image...",
      isLoading: true,
    });

    setIsGenerating(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Determine which endpoint to call (initial generate vs iterate)
      const isIteration = conversationId && messages.some((m) => m.image);
      const lastImage = [...messages].reverse().find((m) => m.image)?.image;

      let response;

      if (isIteration && lastImage) {
        // Call iterate endpoint
        response = await fetch("/api/image-generation/iterate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            previousImageUrl: lastImage.imageUrl,
            feedback: prompt,
            provider: "openai",
            model: openaiModel,
          }),
          signal: abortControllerRef.current.signal,
        });
      } else {
        // Call generate endpoint
        // Include questionnaire answers for prompt enhancement
        const questionnaireAnswers =
          questionnaireState.isComplete && !questionnaireState.wasSkipped
            ? questionnaireState.answers.map((a) => ({
                questionId: a.questionId,
                answer: a.answer,
              }))
            : undefined;

        response = await fetch("/api/image-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            referenceImage: referenceImage || undefined,
            provider: "openai",
            model: openaiModel,
            aspectRatio,
            questionnaireAnswers,
            shopId: resolvedShopId,
          }),
          signal: abortControllerRef.current.signal,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      // Store conversation ID for iterations
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Store prompt debug info for session export
      if (data.promptDebug) {
        setPromptLogs((prev) => [...prev, data.promptDebug]);
      }

      // Create generated image object
      const generatedImage: GeneratedImage = {
        id: data.id || generateId(),
        imageUrl: data.imageUrl,
        prompt,
        provider: data.provider,
        model: data.model,
        costCents: data.costCents || 0,
        aspectRatio,
        isFinal: false,
        createdAt: new Date().toISOString(),
        conversationId: data.conversationId,
      };

      // Update assistant message with image and prompt debug
      updateLastAssistantMessage({
        content: "Here is your generated image:",
        isLoading: false,
        image: generatedImage,
        promptDebug: data.promptDebug,
      });

      // Notify parent
      onImageGenerated(generatedImage);
    } catch (error) {
      // Check if it was an abort
      if (error instanceof Error && error.name === "AbortError") {
        updateLastAssistantMessage({
          type: "system",
          content: "Generation cancelled.",
          isLoading: false,
        });
      } else {
        logger.error("Generation error", error as Error, { component: "ImageGenerationChat" });

        updateLastAssistantMessage({
          type: "error",
          content:
            error instanceof Error
              ? error.message
              : "Failed to generate image. Please try again.",
          isLoading: false,
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleRetry = (originalPrompt: string) => {
    setInputValue(originalPrompt);
    // Remove error message
    setMessages((prev) => prev.filter((m) => m.type !== "error"));
  };

  // Build session export data
  const buildExportData = useCallback((): SessionExportData => {
    // Calculate total cost from all generated images
    const totalCostCents = messages
      .filter((m) => m.image)
      .reduce((sum, m) => sum + (m.image?.costCents || 0), 0);

    // Count generations
    const generationCount = messages.filter((m) => m.image).length;

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      session: {
        conversationId,
        provider: "openai",
        model: openaiModel,
        aspectRatio,
        startedAt: sessionStartedAt,
        totalCostCents,
        generationCount,
      },
      referenceImage: referenceImage,
      messages: messages.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        image: m.image
          ? {
              imageUrl: m.image.imageUrl,
              provider: m.image.provider,
              model: m.image.model,
              costCents: m.image.costCents,
              aspectRatio: m.image.aspectRatio,
            }
          : undefined,
        promptDebug: m.promptDebug,
      })),
      promptLogs,
    };
  }, [
    messages,
    promptLogs,
    conversationId,
    openaiModel,
    aspectRatio,
    sessionStartedAt,
    referenceImage,
  ]);

  // Download session data as JSON file
  const handleDownloadSession = useCallback(() => {
    const exportData = buildExportData();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `image-session-${conversationId || Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [buildExportData, conversationId]);

  // Copy session data to clipboard
  const handleCopySession = useCallback(async () => {
    const exportData = buildExportData();
    const jsonString = JSON.stringify(exportData, null, 2);

    try {
      await navigator.clipboard.writeText(jsonString);
      setCopiedToClipboard(true);
      // Reset after 2 seconds
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      logger.error("Failed to copy to clipboard", err as Error, { component: "ImageGenerationChat" });
      // Fallback: create a temporary textarea
      const textarea = document.createElement("textarea");
      textarea.value = jsonString;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    }
  }, [buildExportData]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: colors.smartBlue }} />
            Image Generation
          </CardTitle>
          {messages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  title="Export session data for debugging"
                >
                  {copiedToClipboard ? (
                    <Check className="w-3 h-3 mr-1 text-green-600" />
                  ) : (
                    <FileDown className="w-3 h-3 mr-1" />
                  )}
                  {copiedToClipboard ? "Copied!" : "Export Session"}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopySession}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadSession}>
                  <Download className="w-4 h-4 mr-2" />
                  Download JSON File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: colors.backgroundLight }}
              >
                <Sparkles
                  className="w-8 h-8"
                  style={{ color: colors.smartBlue }}
                />
              </div>
              <p
                className="text-sm font-medium"
                style={{ color: colors.oxfordNavy }}
              >
                Ready to create!
              </p>
              <p
                className="text-xs mt-2 max-w-xs"
                style={{ color: colors.grayText }}
              >
                {referenceImage
                  ? "Describe the scene you want to create with your product image"
                  : "Upload a reference image, then describe your desired scene"}
              </p>
              {!referenceImage && (
                <Badge
                  variant="outline"
                  className="mt-4"
                  style={{
                    borderColor: colors.brightAmber,
                    color: colors.oxfordNavy,
                  }}
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  No reference image
                </Badge>
              )}
              {referenceImage && (
                <div
                  className="mt-6 p-4 rounded-lg text-left max-w-md"
                  style={{
                    backgroundColor: `${colors.smartBlue}08`,
                    border: `1px solid ${colors.smartBlue}20`,
                  }}
                >
                  <p
                    className="text-xs font-medium mb-2"
                    style={{ color: colors.smartBlue }}
                  >
                    Tips for best results:
                  </p>
                  <ul
                    className="text-xs space-y-1"
                    style={{ color: colors.grayText }}
                  >
                    <li>
                      • <strong>Be specific</strong> about indoor vs outdoor:
                      "inside a living room" or "on a front porch"
                    </li>
                    <li>
                      • Describe the <strong>setting</strong>: foyer, fireplace
                      mantel, garden, patio, etc.
                    </li>
                    <li>
                      • Add mood: "cozy", "elegant", "modern", "rustic",
                      "festive"
                    </li>
                    <li>
                      • Include lighting: "warm evening light", "bright
                      daylight", "soft morning glow"
                    </li>
                    <li>
                      • Mention style: "close-up", "product-focused", "lifestyle
                      shot"
                    </li>
                  </ul>
                  <p
                    className="text-xs mt-3 italic"
                    style={{ color: colors.grayText }}
                  >
                    Examples: "Inside a cozy living room on a fireplace mantel
                    with warm holiday decor" or "Outside on a snow-covered front
                    porch with twinkling lights"
                  </p>
                </div>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.type !== "user" && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        message.type === "error"
                          ? `${colors.error}15`
                          : colors.backgroundLight,
                    }}
                  >
                    {message.type === "error" ? (
                      <AlertCircle
                        className="w-4 h-4"
                        style={{ color: colors.error }}
                      />
                    ) : (
                      <Sparkles
                        className="w-4 h-4"
                        style={{ color: colors.smartBlue }}
                      />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${
                    message.type === "user" ? "order-first" : ""
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 ${
                      message.type === "user"
                        ? ""
                        : message.type === "error"
                          ? "border"
                          : ""
                    }`}
                    style={{
                      backgroundColor:
                        message.type === "user"
                          ? colors.smartBlue
                          : message.type === "error"
                            ? `${colors.error}08`
                            : colors.backgroundLight,
                      color:
                        message.type === "user"
                          ? colors.white
                          : colors.oxfordNavy,
                      borderColor:
                        message.type === "error" ? colors.error : undefined,
                    }}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">{message.content}</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                    {/* Skip to Generate button for system messages */}
                    {message.type === "system" &&
                      message.showSkipButton &&
                      !questionnaireState.isComplete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleQuestionnaireSkip}
                          className="mt-3 w-full"
                          style={{
                            borderColor: colors.smartBlue,
                            color: colors.smartBlue,
                          }}
                        >
                          <SkipForward className="w-4 h-4 mr-2" />
                          Skip to Generate
                        </Button>
                      )}

                    {/* Display generated image */}
                    {message.image && (
                      <div className="mt-3">
                        <div
                          className="relative w-full max-w-md"
                          style={{ aspectRatio: "1/1" }}
                        >
                          <Image
                            src={message.image.imageUrl}
                            alt="Generated"
                            fill
                            className="rounded-lg object-contain"
                            style={{ backgroundColor: colors.white }}
                            unoptimized
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: colors.border,
                              color: colors.grayText,
                            }}
                          >
                            OpenAI
                          </Badge>
                        </div>
                        {/* Action buttons for this image */}
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => {
                              if (message.image) {
                                const link = document.createElement("a");
                                link.href = message.image.imageUrl;
                                link.download = `generated-image-${Date.now()}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={async () => {
                              if (message.image && onSaveToLibrary) {
                                const imageId = message.id;
                                setSavingImageId(imageId);
                                try {
                                  const success = await onSaveToLibrary(
                                    message.image,
                                  );
                                  if (success) {
                                    setSavedImageIds((prev) =>
                                      new Set(prev).add(imageId),
                                    );
                                  }
                                } finally {
                                  setSavingImageId(null);
                                }
                              }
                            }}
                            disabled={
                              message.image.isFinal ||
                              savedImageIds.has(message.id) ||
                              savingImageId === message.id
                            }
                            style={
                              savedImageIds.has(message.id)
                                ? {
                                    backgroundColor: "#dcfce7",
                                    borderColor: "#22c55e",
                                    color: "#16a34a",
                                  }
                                : undefined
                            }
                          >
                            {savingImageId === message.id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : savedImageIds.has(message.id) ||
                              message.image.isFinal ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Saved!
                              </>
                            ) : (
                              <>
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => onExport?.()}
                            style={{
                              backgroundColor: colors.smartBlue,
                              color: colors.white,
                            }}
                          >
                            <Share2 className="w-3 h-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Retry button for errors */}
                    {message.type === "error" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const lastUserMessage = [...messages]
                            .reverse()
                            .find((m) => m.type === "user");
                          if (lastUserMessage) {
                            handleRetry(lastUserMessage.content);
                          }
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    )}

                    {/* Questionnaire question */}
                    {message.type === "question" &&
                      message.questionIndex !== undefined &&
                      (() => {
                        const questionDef =
                          message.question ||
                          getQuestionWithOptions(
                            QUESTIONNAIRE_QUESTIONS[message.questionIndex],
                          );
                        // Find if this question has already been answered (for showing selected state)
                        const existingAnswer = questionnaireState.answers.find(
                          (a) => a.questionId === questionDef.id,
                        );
                        return (
                          <QuestionCard
                            question={questionDef}
                            questionNumber={
                              questionnaireState.answers.length + 1
                            }
                            totalQuestions={
                              message.visibleQuestionsCount ||
                              getVisibleQuestions(questionnaireState.answers)
                                .length
                            }
                            onAnswer={handleQuestionnaireAnswer}
                            onSkip={
                              message.showSkip
                                ? handleQuestionnaireSkip
                                : undefined
                            }
                            showSkip={message.showSkip ?? false}
                            disabled={isGenerating}
                            isLoading={
                              productTypesLoading && message.question?.isDynamic
                            }
                            selectedAnswer={existingAnswer?.answer}
                          />
                        );
                      })()}
                  </div>

                  <p
                    className="text-xs mt-1"
                    style={{ color: colors.grayText }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.type === "user" && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: colors.backgroundLight }}
                  >
                    <User
                      className="w-4 h-4"
                      style={{ color: colors.grayText }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Library - shown when questionnaire is complete and user can type */}
        {referenceImage && questionnaireState.isComplete && (
          <div className="flex-shrink-0">
            <PromptLibrary
              onSelectPrompt={(prompt) => setInputValue(prompt)}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            placeholder={
              !referenceImage
                ? "Upload a reference image first, then describe your scene..."
                : questionnaireStarted && !questionnaireState.isComplete
                  ? "Answer the questions above or skip to describe your scene..."
                  : 'Describe the scene (e.g., "On a cozy fireplace mantel with warm lighting")'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={
              disabled ||
              isGenerating ||
              !referenceImage ||
              (questionnaireStarted && !questionnaireState.isComplete)
            }
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          {isGenerating ? (
            <Button
              onClick={handleAbort}
              className="h-[60px] px-4"
              style={{
                backgroundColor: "#dc2626",
                color: colors.white,
              }}
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={
                disabled ||
                !inputValue.trim() ||
                !referenceImage ||
                (questionnaireStarted && !questionnaireState.isComplete)
              }
              className="h-[60px] px-4"
              style={{
                backgroundColor:
                  !disabled &&
                  inputValue.trim() &&
                  referenceImage &&
                  (!questionnaireStarted || questionnaireState.isComplete)
                    ? colors.smartBlue
                    : colors.backgroundLight,
                color:
                  !disabled &&
                  inputValue.trim() &&
                  referenceImage &&
                  (!questionnaireStarted || questionnaireState.isComplete)
                    ? colors.white
                    : colors.grayText,
              }}
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Usage Info */}
        <div
          className="flex-shrink-0 flex items-center justify-between text-xs"
          style={{ color: colors.grayText }}
        >
          <span>Provider: OpenAI • Model: {openaiModel.replace("-", " ")}</span>
          <span>Aspect: {aspectRatio}</span>
        </div>
      </CardContent>
    </Card>
  );
}
