"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useShop } from "@/hooks/useShop";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { ONBOARDING_STEPS } from "@/types/onboarding";
import type {
  ChatMessage,
  InterviewPrompt,
  BusinessProfile,
  InterviewStatus,
} from "@/types/business-profile";
import { logger } from "@/lib/logger";

type InterviewStep = "intro" | "interview" | "generating" | "complete";

export default function OnboardingInterviewPage() {
  const router = useRouter();
  const { shopId, shopDomain } = useShop();
  const { progress, advanceToStep, markStepCompleted } = useOnboardingProgress();

  const [currentStep, setCurrentStep] = useState<InterviewStep>("intro");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState<InterviewPrompt | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>("not_started");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interviewProgress, setInterviewProgress] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedProfile = useRef(false);
  const generatingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if business profile already exists
  useEffect(() => {
    if (progress?.businessProfileCompleted) {
      setCurrentStep("complete");
    }
  }, [progress]);

  // Timer for showing long wait message during profile generation
  useEffect(() => {
    if (currentStep === "generating") {
      // Show additional message after 45 seconds
      generatingTimerRef.current = setTimeout(() => {
        setShowLongWaitMessage(true);
      }, 45000);
    } else {
      // Clear timer and reset message when not generating
      if (generatingTimerRef.current) {
        clearTimeout(generatingTimerRef.current);
        generatingTimerRef.current = null;
      }
      setShowLongWaitMessage(false);
    }

    return () => {
      if (generatingTimerRef.current) {
        clearTimeout(generatingTimerRef.current);
      }
    };
  }, [currentStep]);

  // Load existing profile if any
  useEffect(() => {
    if (shopDomain && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      loadProfile();
    }
  }, [shopDomain]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/business-profile", {
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
          setInterviewStatus(data.data.profile.interview_status);
          setInterviewProgress(data.data.progress.percentage_complete);

          if (data.data.progress.next_prompt) {
            setCurrentPrompt(data.data.progress.next_prompt);
          }

          // If interview completed with profile, show complete state
          if (
            data.data.profile.interview_status === "completed" &&
            data.data.profile.master_profile_text
          ) {
            setCurrentStep("complete");
          }
          // If interview in progress, resume it
          else if (data.data.profile.interview_status === "in_progress") {
            setCurrentStep("interview");
            // Set questions answered based on current progress
            const answered = Math.round(
              (data.data.progress.percentage_complete / 100) *
              (data.data.progress.total_questions || 12)
            );
            setQuestionsAnswered(answered);
            setTotalQuestions(data.data.progress.total_questions || 12);
            if (data.data.progress.next_prompt) {
              addAIMessage(data.data.progress.next_prompt.question_text);
            }
          }
        }
      }
    } catch (error) {
      logger.error("Failed to load profile:", error as Error, {
        component: "onboarding-interview",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startInterview = async (mode: "full" | "quick_start" = "quick_start") => {
    if (!shopDomain) {
      setError("Shop domain not found. Please try again.");
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
        setProfile(data.data.profile);
        setCurrentPrompt(data.data.first_prompt);
        setInterviewStatus("in_progress");
        setTotalQuestions(data.data.total_questions || (mode === "quick_start" ? 12 : 19));
        setQuestionsAnswered(0);
        setCurrentStep("interview");

        const timeEstimate = mode === "quick_start" ? "8-10 minutes" : "15-20 minutes";
        addAIMessage(
          `Great! Let's learn about your business. This ${mode === "quick_start" ? "quick" : "comprehensive"} interview will take about ${timeEstimate}. Answer naturally - there are no wrong answers!`
        );

        setTimeout(() => {
          addAIMessage(data.data.first_prompt.question_text);
        }, 1500);
      } else {
        setError(data.error || "Failed to start interview");
      }
    } catch (error) {
      logger.error("Failed to start interview:", error as Error, {
        component: "onboarding-interview",
      });
      setError("Failed to start interview. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentInput.trim() || !currentPrompt) return;

    const wordCount = currentInput.trim().split(/\s+/).length;
    if (currentPrompt.min_words && wordCount < currentPrompt.min_words) {
      setError(
        `Please provide at least ${currentPrompt.min_words} words (current: ${wordCount})`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

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
        setInterviewProgress(data.data.progress.percentage_complete);
        setQuestionsAnswered((prev) => prev + 1);

        if (data.data.interview_complete) {
          setTimeout(() => {
            addAIMessage("Excellent! You've completed all questions. 🎉");
          }, 800);

          setTimeout(() => {
            addAIMessage(
              "Now I'll analyze your responses to create your comprehensive Business Profile. This will take about 30-60 seconds..."
            );
          }, 2000);

          setTimeout(() => {
            generateProfile();
          }, 3000);
        } else if (data.data.next_prompt) {
          setCurrentPrompt(data.data.next_prompt);

          setTimeout(() => {
            addAIMessage(data.data.next_prompt.question_text);
          }, 1000);
        }
      } else {
        setError(data.error || "Failed to submit answer");
      }
    } catch (error) {
      logger.error("Failed to submit answer:", error as Error, {
        component: "onboarding-interview",
      });
      setError("Failed to submit answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateProfile = async () => {
    setIsGeneratingProfile(true);
    setCurrentStep("generating");

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
        setCurrentStep("complete");
      } else {
        setError(data.error || "Failed to generate profile");
        setCurrentStep("interview");
        addAIMessage(
          "I encountered an issue generating your profile. Let me try again..."
        );
      }
    } catch (error) {
      logger.error("Failed to generate profile:", error as Error, {
        component: "onboarding-interview",
      });
      setError("Failed to generate profile. Please try again.");
      setCurrentStep("interview");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const addAIMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      type: "ai",
      content,
      timestamp: new Date(),
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

  const handleBack = () => {
    if (currentStep === "intro") {
      router.push(`/stores/${shopId}/onboarding/voice`);
    }
  };

  const handleContinue = async () => {
    await markStepCompleted("businessProfile");
    await advanceToStep(ONBOARDING_STEPS.COMPLETE);
    router.push(`/stores/${shopId}/onboarding/complete`);
  };

  const wordCount = currentInput
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Step */}
      {currentStep === "intro" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">Business Profile Interview</CardTitle>
            <CardDescription className="text-base mt-2">
              Answer questions about your business to help AI create better content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">How It Works</AlertTitle>
              <AlertDescription className="text-blue-700">
                I'll ask you questions about your business, customers, and goals.
                Answer naturally - there are no wrong answers. The AI will use your
                responses to create personalized content.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Quick Start Option */}
              <Card className="border-2 border-blue-500 bg-blue-50/50 relative">
                <div className="absolute -top-3 right-4 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  RECOMMENDED
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Start
                  </CardTitle>
                  <CardDescription>
                    12 essential questions in ~8-10 minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Captures key business info for AI content</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Perfect for getting started quickly</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Can expand later if needed</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => startInterview("quick_start")}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        Start Quick Interview
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Full Interview Option */}
              <Card className="border-2 border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-600" />
                    Full Interview
                  </CardTitle>
                  <CardDescription>
                    19 comprehensive questions in ~15-20 minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span>Deep dive into your business identity</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span>Detailed customer insights</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span>Complete brand voice guidelines</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => startInterview("full")}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      "Start Full Interview"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interview Step */}
      {currentStep === "interview" && (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary">
                  Question {questionsAnswered + 1} of {totalQuestions}
                </Badge>
                <span className="text-sm text-gray-500">
                  {Math.round(interviewProgress)}% Complete
                </span>
              </div>
              <Progress value={interviewProgress} className="h-2" />
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="min-h-[300px] max-h-[400px] overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 ${
                        msg.type === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {isGeneratingProfile && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <p className="text-sm">Generating your Business Profile...</p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {!isGeneratingProfile && currentPrompt && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <Textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={4}
                  disabled={isSubmitting}
                  className="mb-4"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) {
                      submitAnswer();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    <span
                      className={
                        wordCount < (currentPrompt.min_words || 0)
                          ? "text-red-500 font-medium"
                          : ""
                      }
                    >
                      {wordCount} words
                    </span>
                    {currentPrompt.min_words && (
                      <span className="ml-1">(minimum {currentPrompt.min_words})</span>
                    )}
                  </p>
                  <Button
                    onClick={submitAnswer}
                    disabled={isSubmitting || !currentInput.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Generating Step */}
      {currentStep === "generating" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Creating Your Business Profile</h3>
              <p className="text-gray-500 text-center max-w-md">
                Analyzing your responses to build a comprehensive profile that will
                guide all AI-generated content for your brand...
              </p>
              <div className="pt-4 text-sm text-gray-400">
                This usually takes 30-60 seconds
              </div>
              {showLongWaitMessage && (
                <Alert className="mt-4 max-w-md bg-blue-50 border-blue-200">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Almost there! Your profile is being finalized. This is taking a bit longer than usual, but we're making sure everything is perfect.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {currentStep === "complete" && (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Business Profile Complete!</CardTitle>
                  <CardDescription>
                    Your business profile will guide all AI-generated content
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {profile?.master_profile_text ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm max-h-[300px] overflow-y-auto">
                    {profile.profile_summary || profile.master_profile_text.slice(0, 500) + "..."}
                  </pre>
                  <p className="text-sm text-gray-500 mt-4">
                    You can view and edit your full profile in Brand Voice settings.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Your business profile was created earlier. You can view and edit
                    it in Brand Voice settings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              onClick={() => setCurrentStep("intro")}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retake Interview
            </Button>
            <Button onClick={handleContinue} className="flex-1">
              Complete Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
