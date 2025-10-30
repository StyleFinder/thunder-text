"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Send,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useShopifyAuth } from "@/app/components/UnifiedShopifyAuth";
import type {
  ChatMessage,
  InterviewPrompt,
  BusinessProfile,
  InterviewStatus,
} from "@/types/business-profile";

export default function StoreProfilePage() {
  const {
    shop: shopDomain,
    isAuthenticated,
    isLoading: authLoading,
  } = useShopifyAuth();

  // Debug: Log auth values on every render
  console.log("🎭 StoreProfilePage render:", {
    shopDomain,
    isAuthenticated,
    authLoading,
  });

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState<InterviewPrompt | null>(
    null,
  );
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [interviewStatus, setInterviewStatus] =
    useState<InterviewStatus>("not_started");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasLoadedProfile = useRef(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showCompletionState = () => {
    // Clear chat and show completion UI
    setMessages([]);
    setInterviewStatus("completed");
  };

  const loadProfile = async () => {
    try {
      console.log(
        "📡 Fetching /api/business-profile with shopDomain:",
        shopDomain,
      );
      const response = await fetch("/api/business-profile", {
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      console.log("📥 API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ API response data:", data);
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
          setInterviewStatus(data.data.profile.interview_status);
          setProgress(data.data.progress.percentage_complete);

          // Set current prompt if available and add to chat
          if (data.data.progress.next_prompt) {
            setCurrentPrompt(data.data.progress.next_prompt);

            // Add the prompt as an AI message to the chat
            const prompt = data.data.progress.next_prompt;
            const message: ChatMessage = {
              id: Date.now().toString() + Math.random(),
              type: "ai",
              content: prompt.question_text,
              timestamp: new Date(),
              prompt_key: prompt.prompt_key,
              question_number: prompt.question_number,
            };
            setMessages([message]);
          }

          // If profile is complete, show completion message
          if (
            data.data.profile.interview_status === "completed" &&
            data.data.profile.master_profile_text
          ) {
            showCompletionState();
          }
        }
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("❌ API error response:", errorData);
      }
    } catch (error) {
      console.error("❌ Failed to load profile:", error);
    }
  };

  // Load profile on mount (prevent duplicate calls)
  useEffect(() => {
    console.log("🔄 useEffect triggered:", {
      shopDomain,
      isAuthenticated,
      hasLoaded: hasLoadedProfile.current,
    });
    if (shopDomain && isAuthenticated && !hasLoadedProfile.current) {
      console.log("✅ Loading profile - First time only");
      hasLoadedProfile.current = true;
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopDomain, isAuthenticated]);

  const startInterview = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/business-profile/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.data.profile);
        setCurrentPrompt(data.data.first_prompt);
        setInterviewStatus("in_progress");

        // Add welcome message
        addAIMessage(
          "Hi! I'm here to learn about your business so we can create content that truly represents your brand. This conversation will take about 15-20 minutes. Ready to get started?",
        );

        // Add first question after delay
        setTimeout(() => {
          addAIMessage(
            data.data.first_prompt.question_text,
            data.data.first_prompt.prompt_key,
          );

          // Add help text if available
          if (data.data.first_prompt.help_text) {
            setTimeout(() => {
              addSystemMessage(`💡 ${data.data.first_prompt.help_text}`);
            }, 1000);
          }
        }, 1500);
      } else {
        setError(data.error || "Failed to start interview");
      }
    } catch (error) {
      console.error("Failed to start interview:", error);
      setError("Failed to start interview. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentInput.trim() || !currentPrompt) return;

    // Validate word count
    const wordCount = currentInput.trim().split(/\s+/).length;
    if (currentPrompt.min_words && wordCount < currentPrompt.min_words) {
      setError(
        `Please provide at least ${currentPrompt.min_words} words (current: ${wordCount})`,
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Add user message to chat
    addUserMessage(currentInput);
    const userAnswer = currentInput;
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
          response_text: userAnswer,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProgress(data.data.progress.percentage_complete);

        // Check if interview is complete
        if (data.data.interview_complete) {
          // Add completion message
          setTimeout(() => {
            addAIMessage("Excellent! You've completed all 21 questions. 🎉");
          }, 800);

          setTimeout(() => {
            addAIMessage(
              "Now I'll analyze your responses to create your comprehensive Business Profile. This will take about 30-60 seconds...",
            );
          }, 2000);

          // Generate profile
          setTimeout(() => {
            generateProfile();
          }, 3000);
        } else if (data.data.next_prompt) {
          // Move to next question
          setCurrentPrompt(data.data.next_prompt);

          setTimeout(() => {
            addAIMessage(
              data.data.next_prompt.question_text,
              data.data.next_prompt.prompt_key,
            );

            // Add help text if available
            if (data.data.next_prompt.help_text) {
              setTimeout(() => {
                addSystemMessage(`💡 ${data.data.next_prompt.help_text}`);
              }, 1000);
            }
          }, 1000);
        }
      } else {
        setError(data.error || "Failed to submit answer");
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      setError("Failed to submit answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateProfile = async () => {
    setIsGeneratingProfile(true);

    try {
      const response = await fetch("/api/business-profile/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.data.profile);
        setInterviewStatus("completed");

        setTimeout(() => {
          addAIMessage("Your Business Profile is complete! 🎊");
        }, 500);

        setTimeout(() => {
          addAIMessage(
            "This profile will now guide all AI-generated content to match your unique business identity, voice, and messaging.",
          );
        }, 1500);

        setTimeout(() => {
          showCompletionState();
        }, 3000);
      } else {
        setError(data.error || "Failed to generate profile");
        addAIMessage(
          "I encountered an issue generating your profile. Let me try again...",
        );
      }
    } catch (error) {
      console.error("Failed to generate profile:", error);
      setError("Failed to generate profile. Please try again.");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  // Helper functions to add messages
  const addAIMessage = (content: string, promptKey?: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      type: "ai",
      content,
      timestamp: new Date(),
      prompt_key: promptKey,
    };
    setMessages((prev) => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      type: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const addSystemMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      type: "system",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitAnswer();
    }
  };

  // Handle reset functionality
  const handleReset = async () => {
    setIsResetting(true);
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
        // Clear all local state
        setMessages([]);
        setInterviewStatus("not_started");
        setProgress(0);
        setCurrentPrompt(null);
        setProfile(null);
        setCurrentInput("");
        setShowResetConfirm(false);

        // Force reload profile to get fresh state
        hasLoadedProfile.current = false;
        await loadProfile();
      } else {
        setError(data.error || "Failed to reset interview");
      }
    } catch (error) {
      console.error("Failed to reset interview:", error);
      setError("Failed to reset interview. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  // Calculate word count
  const wordCount = currentInput
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  // Loading state
  if (authLoading) {
    console.log("🔄 Rendering: Auth Loading state");
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !shopDomain) {
    console.log("🚫 Rendering: Not Authenticated", {
      isAuthenticated,
      shopDomain,
    });
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="ml-2">
            <p className="text-sm font-medium text-red-800">
              Authentication Required
            </p>
            <p className="text-sm text-red-700 mt-1">
              Please access this page from your Shopify admin.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  console.log("✅ Rendering: Main content", {
    interviewStatus,
    hasProfile: !!profile,
  });

  // Profile completed state
  if (interviewStatus === "completed" && profile?.master_profile_text) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Store Profile</h1>
          </div>
          <p className="text-gray-600">Your comprehensive business profile</p>
        </div>

        {/* Completion Card */}
        <Card className="border-green-200 bg-green-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  Profile Complete!
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  Your Business Profile is ready and will guide all AI-generated
                  content to match your unique brand.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-green-600 text-green-700 hover:bg-green-100"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-600 text-green-700 hover:bg-green-100"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Edit Responses
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Summary Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Summary</CardTitle>
            <CardDescription>
              Generated from your 21-question interview • Version{" "}
              {profile.profile_version}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {profile.profile_summary ||
                  profile.master_profile_text?.substring(0, 500) + "..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not started state
  if (interviewStatus === "not_started" && messages.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Store Profile</h1>
          </div>
          <p className="text-gray-600">
            Build your comprehensive business foundation
          </p>
        </div>

        {/* Introduction Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Welcome to Your Business Profile Interview
            </CardTitle>
            <CardDescription>
              A 15-20 minute conversation that creates your business foundation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                What You&apos;ll Create:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Comprehensive Business Profile</strong> - Your
                    complete story, positioning, and unique value
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Ideal Customer Insights</strong> - Deep
                    understanding of who you serve and their needs
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Brand Voice Guidelines</strong> - How to communicate
                    authentically across all channels
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Strategic Foundation</strong> - Clear vision and
                    messaging framework
                  </span>
                </li>
              </ul>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-blue-900">
                  How It Works
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  I&apos;ll ask you 21 questions about your business, customers,
                  and goals. Answer naturally and conversationally - there are
                  no wrong answers. The AI will then synthesize your responses
                  into a comprehensive profile that guides all future content
                  generation.
                </p>
              </div>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 italic">
                &quot;Answer naturally and conversationally. Don&apos;t worry
                about being perfect - the goal is to capture your authentic
                thoughts and business reality. Take your time with each
                question.&quot;
              </p>
            </div>

            <Button
              onClick={startInterview}
              disabled={isSubmitting}
              size="lg"
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Interview...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Interview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Interview in progress
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header with Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Store Profile Interview
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              Question {currentPrompt?.question_number || 0} of 21
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              disabled={isResetting}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {Math.round(progress)}% Complete
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Chat Messages */}
      <Card className="mb-6 h-[500px] overflow-y-auto">
        <CardContent className="space-y-4 p-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-4 ${
                  msg.type === "user"
                    ? "bg-blue-600 text-white"
                    : msg.type === "system"
                      ? "bg-amber-50 border border-amber-200 text-amber-900"
                      : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
                <span className="text-xs opacity-70 mt-2 block">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}

          {/* Generating indicator */}
          {isGeneratingProfile && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-700">
                    Generating your Business Profile...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Input Area */}
      {!isGeneratingProfile && currentPrompt && (
        <Card>
          <CardContent className="p-4">
            {currentPrompt.context_text && (
              <p className="text-sm text-gray-600 mb-3 italic">
                {currentPrompt.context_text}
              </p>
            )}
            <Textarea
              ref={textareaRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Type your answer here... (Cmd/Ctrl + Enter to submit)"
              rows={5}
              className="mb-3"
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span
                  className={
                    wordCount < (currentPrompt.min_words || 0)
                      ? "text-amber-600 font-medium"
                      : ""
                  }
                >
                  {wordCount} words
                </span>
                {currentPrompt.min_words && (
                  <span className="text-gray-400 ml-1">
                    (minimum {currentPrompt.min_words})
                  </span>
                )}
              </div>
              <Button
                onClick={submitAnswer}
                disabled={isSubmitting || !currentInput.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Continue
                    <Send className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Interview?</DialogTitle>
            <DialogDescription>
              This will delete all your current responses and restart the
              interview from the beginning. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You will lose all progress ({currentPrompt?.question_number || 0}{" "}
              questions completed). Are you sure you want to start over?
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Yes, Start Over
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
