/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
// Q1: logger import removed - now handled in hooks

// Q1: Custom hooks extracted for cleaner state management
import { useBusinessInterview } from "@/hooks/useBusinessInterview";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { usePolicySummary } from "@/hooks/usePolicySummary";

// Quick answer options for AI coaching questions (all answers must be 20+ words to meet min_words requirement)
const QUICK_ANSWER_OPTIONS: Record<string, { label: string; value: string }[]> =
  {
    discount_comfort: [
      {
        label: "Rarely discount",
        value:
          "I rarely discount my products and prefer to maintain full price positioning. I focus on communicating value and quality rather than competing on price, as I believe discounting can devalue my brand.",
      },
      {
        label: "Sometimes discount",
        value:
          "I occasionally run sales and promotions, maybe a few times per season or for special occasions like holidays and end-of-season clearances. I try to be strategic about when and how much I discount.",
      },
      {
        label: "Frequently discount",
        value:
          "I frequently run promotions and sales throughout the year. Discounts are a regular part of my marketing strategy to move inventory, attract new customers, and keep my audience engaged with fresh offers.",
      },
    ],
    inventory_size: [
      {
        label: "Small (under 100)",
        value:
          "I have a small, carefully curated inventory with fewer than 100 SKUs total. I focus on quality over quantity and prefer to offer a thoughtfully selected collection that my customers will love.",
      },
      {
        label: "Medium (100-500)",
        value:
          "I have a medium-sized inventory with around 100 to 500 products in my store. This gives me a nice balance of variety for my customers without being overwhelming to manage.",
      },
      {
        label: "Large (500+)",
        value:
          "I have a large inventory with over 500 products available in my store. Wide selection is important to my business model, as I want customers to find exactly what they are looking for.",
      },
    ],
    time_availability: [
      {
        label: "Very limited (1-2 hrs/day)",
        value:
          "I have very limited time and can only dedicate about 1-2 hours per day to my boutique. It is a side hustle alongside my other responsibilities, so I need to be efficient with my time.",
      },
      {
        label: "Moderate (3-5 hrs/day)",
        value:
          "I have moderate availability and spend about 3-5 hours daily on my boutique business. It is a significant part of my day but not quite full-time yet, so I balance it with other commitments.",
      },
      {
        label: "Flexible (6+ hrs/day)",
        value:
          "I have a flexible schedule and dedicate 6 or more hours daily to my boutique. It is my primary focus and main source of income, so I have plenty of time to implement new strategies and ideas.",
      },
    ],
    quarterly_goal: [
      {
        label: "Increase sales",
        value:
          "My main goal this quarter is to increase overall sales revenue and grow my customer base significantly. I want to focus on acquiring new customers while also encouraging repeat purchases from my existing loyal customers.",
      },
      {
        label: "Clear inventory",
        value:
          "My primary focus this quarter is clearing out slow-moving inventory and making room for fresh new products. I need to move older stock to free up cash flow and shelf space for upcoming seasonal items.",
      },
      {
        label: "Build brand awareness",
        value:
          "This quarter I want to focus on building brand awareness and establishing a stronger presence in my market. I want more people to know about my boutique and what makes it special and unique.",
      },
      {
        label: "Improve margins",
        value:
          "My goal this quarter is to improve profit margins by optimizing my pricing strategy, being more selective about discounting, and potentially finding better suppliers or negotiating better wholesale rates.",
      },
    ],
    // policies_summary: Removed - users need to provide their specific policy URLs and details
  };
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShop } from "@/hooks/useShop";

export default function BrandVoicePage() {
  const router = useRouter();

  // Use the unified shop hook for authentication
  const { shopId, shopDomain, hasShop, isLoading: authLoading } = useShop();

  // Helper to build store-based URLs
  const buildUrl = (path: string) => {
    if (shopId) {
      return `/stores/${shopId}${path}`;
    }
    return path;
  };

  // Q1: Use extracted custom hooks for cleaner state management
  const {
    profile,
    profileLoading,
    isGeneratingProfile,
    isRegenerating,
    showProfileSuccess,
    setProfile,
    setProfileLoading,
    setShowProfileSuccess: _setShowProfileSuccess,
    loadProfile,
    generateProfile,
    regenerateProfile,
  } = useBusinessProfile({ shopDomain });

  const {
    messages,
    currentInput,
    currentPrompt,
    interviewStatus,
    progress,
    totalQuestions,
    currentQuestionNumber,
    isSubmitting,
    error,
    messagesEndRef,
    hasLoadedProfile,
    setCurrentInput,
    setMessages: _setMessages,
    setInterviewStatus,
    setProgress: _setProgress,
    setCurrentPrompt: _setCurrentPrompt,
    setError,
    addAIMessage: _addAIMessage,
    addUserMessage: _addUserMessage,
    startInterview,
    submitAnswer: submitInterviewAnswer,
    resetInterview,
  } = useBusinessInterview({
    shopDomain,
    onProfileUpdate: setProfile,
  });

  // Callback for handling policy summary - needs to update currentInput
  const handlePolicySummary = useCallback(
    (summary: string, type: "return" | "shipping") => {
      const prefix = type === "return" ? "Return Policy:" : "Shipping Policy:";
      const newSummary = `${prefix} ${summary}`;

      if (currentInput.trim()) {
        setCurrentInput(`${currentInput}\n\n${newSummary}`);
      } else {
        setCurrentInput(newSummary);
      }
    },
    [currentInput, setCurrentInput]
  );

  const {
    returnPolicyUrl,
    shippingPolicyUrl,
    isSummarizingReturn,
    isSummarizingShipping,
    setReturnPolicyUrl,
    setShippingPolicyUrl,
    summarizePolicy,
    clearPolicyUrls,
  } = usePolicySummary({
    shopDomain,
    onSummaryReceived: handlePolicySummary,
    setError,
  });

  // UI-only state that doesn't need a hook
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messagesEndRef]);

  // Load profile on mount
  useEffect(() => {
    if (hasShop && shopDomain && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      loadProfile().then(({ status }) => {
        setInterviewStatus(status);
      });
    }
  }, [shopDomain, hasShop, loadProfile, hasLoadedProfile, setInterviewStatus]);

  // If not authenticated, set profileLoading to false
  useEffect(() => {
    if (!authLoading && !hasShop) {
      setProfileLoading(false);
    }
  }, [authLoading, hasShop, setProfileLoading]);

  // Q1: Submit answer with policy URL handling
  const submitAnswer = async () => {
    if (!currentInput.trim() || !currentPrompt) return;

    // For policies_summary, combine URLs with description
    let finalAnswer = currentInput;
    if (currentPrompt.prompt_key === "policies_summary") {
      const parts: string[] = [];
      if (returnPolicyUrl.trim()) {
        parts.push(`Return Policy URL: ${returnPolicyUrl.trim()}`);
      }
      if (shippingPolicyUrl.trim()) {
        parts.push(`Shipping Policy URL: ${shippingPolicyUrl.trim()}`);
      }
      if (currentInput.trim()) {
        parts.push(`Policy Details: ${currentInput.trim()}`);
      }
      finalAnswer = parts.join("\n\n");
    }

    // Submit using the hook function, and clear policy URLs on completion
    await submitInterviewAnswer(finalAnswer, () => {
      if (currentPrompt.prompt_key === "policies_summary") {
        clearPolicyUrls();
      }
    });
  };

  // Q1: Handle reset using hook function
  const handleReset = async () => {
    setIsResetting(true);
    const success = await resetInterview();
    if (success) {
      setProfile(null);
      setShowResetConfirm(false);
    }
    setIsResetting(false);
  };

  // Calculate word count (include policy URLs for policies_summary question)
  const wordCount = (() => {
    if (currentPrompt?.prompt_key === "policies_summary") {
      const parts: string[] = [];
      if (returnPolicyUrl.trim())
        parts.push(`Return Policy URL: ${returnPolicyUrl.trim()}`);
      if (shippingPolicyUrl.trim())
        parts.push(`Shipping Policy URL: ${shippingPolicyUrl.trim()}`);
      if (currentInput.trim())
        parts.push(`Policy Details: ${currentInput.trim()}`);
      const combined = parts.join(" ");
      return combined
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
    }
    return currentInput
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  })();

  // Loading state - wait for both auth and profile to load
  if (authLoading || profileLoading) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent
              className="flex items-center justify-center"
              style={{ padding: "80px" }}
            >
              <div
                className="flex flex-col items-center"
                style={{ gap: "16px" }}
              >
                <RefreshCw
                  className="h-8 w-8 animate-spin"
                  style={{ color: "#0066cc" }}
                />
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Loading...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!hasShop) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <Alert
            variant="destructive"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <AlertCircle className="h-4 w-4" style={{ color: "#cc0066" }} />
            <AlertTitle
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#991b1b",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                marginBottom: "4px",
              }}
            >
              Authentication Required
            </AlertTitle>
            <AlertDescription
              style={{
                fontSize: "14px",
                color: "#991b1b",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Please log in to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show completed profile view with options
  if (interviewStatus === "completed" && profile?.master_profile_text) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                marginBottom: "8px",
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Business Profile
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Your business profile has been created
            </p>
          </div>

          <Card
            style={{
              background: "#ffffff",
              border: "2px solid #22c55e",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent style={{ padding: "32px" }}>
              <div
                className="flex flex-col items-center"
                style={{ gap: "20px", textAlign: "center" }}
              >
                <div
                  style={{
                    background: "#dcfce7",
                    borderRadius: "50%",
                    padding: "16px",
                  }}
                >
                  <CheckCircle
                    className="h-12 w-12"
                    style={{ color: "#22c55e" }}
                  />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: "#003366",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      marginBottom: "8px",
                    }}
                  >
                    Business Profile Complete
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      lineHeight: 1.6,
                    }}
                  >
                    Your AI-powered business profile is ready and will guide all
                    AI-generated content to match your unique brand voice.
                  </p>
                </div>
                {showProfileSuccess && (
                  <Alert
                    style={{
                      background: "#dcfce7",
                      border: "1px solid #86efac",
                      borderRadius: "8px",
                      padding: "12px",
                      width: "100%",
                    }}
                  >
                    <CheckCircle
                      className="h-4 w-4"
                      style={{ color: "#22c55e" }}
                    />
                    <AlertDescription
                      style={{
                        fontSize: "14px",
                        color: "#166534",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Profile regenerated successfully! AI Coaches profile data
                      has been updated.
                    </AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert
                    variant="destructive"
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      padding: "12px",
                      width: "100%",
                    }}
                  >
                    <AlertCircle
                      className="h-4 w-4"
                      style={{ color: "#dc2626" }}
                    />
                    <AlertDescription
                      style={{
                        fontSize: "14px",
                        color: "#991b1b",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                <div
                  className="flex flex-col w-full"
                  style={{ gap: "12px", marginTop: "8px" }}
                >
                  <Button
                    onClick={() => router.push(buildUrl("/ai-coaches"))}
                    className="w-full"
                    style={{
                      background: "#0066cc",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "16px 24px",
                      fontSize: "16px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Go to AI Coaches
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(buildUrl("/brand-voice"))
                    }
                    className="w-full"
                    style={{
                      background: "#ffffff",
                      color: "#0066cc",
                      borderRadius: "8px",
                      padding: "16px 24px",
                      fontSize: "16px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "2px solid #e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    View Brand Voice
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setError(null);
                      const result = await regenerateProfile();
                      if (!result) {
                        setError("Failed to regenerate profile. Please try again.");
                      }
                    }}
                    disabled={isRegenerating}
                    className="w-full"
                    style={{
                      background: "#ffffff",
                      color: "#0066cc",
                      borderRadius: "8px",
                      padding: "16px 24px",
                      fontSize: "14px",
                      fontWeight: 500,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "1px solid #e5e7eb",
                      cursor: isRegenerating ? "not-allowed" : "pointer",
                      opacity: isRegenerating ? 0.7 : 1,
                    }}
                  >
                    {isRegenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Profile
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full"
                    style={{
                      background: "#ffffff",
                      color: "#6b7280",
                      borderRadius: "8px",
                      padding: "16px 24px",
                      fontSize: "14px",
                      fontWeight: 500,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "1px solid #e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    Start Over (Reset Interview)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reset Confirmation Dialog */}
        <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <DialogContent style={{ borderRadius: "8px" }}>
            <DialogHeader>
              <DialogTitle
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Start Over?
              </DialogTitle>
              <DialogDescription
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                This will delete all your interview answers and generated
                profile. You'll need to complete the interview again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter style={{ gap: "12px" }}>
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  borderRadius: "8px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                disabled={isResetting}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {isResetting ? "Resetting..." : "Yes, Start Over"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Welcome screen - always show mode selection if no messages loaded
  if (messages.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "1000px" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                marginBottom: "8px",
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Business Profile
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Build your comprehensive business foundation
            </p>
          </div>

          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardHeader style={{ padding: "32px" }}>
              <div
                className="flex items-center"
                style={{ gap: "12px", marginBottom: "8px" }}
              >
                <CheckCircle className="h-5 w-5" style={{ color: "#0066cc" }} />
                <CardTitle
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#003366",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Welcome to Your Business Profile Interview
                </CardTitle>
              </div>
              <CardDescription
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "16px",
                }}
              >
                Choose how you'd like to build your business profile
              </CardDescription>

              <Alert
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "16px",
                }}
              >
                <AlertCircle className="h-4 w-4" style={{ color: "#0066cc" }} />
                <AlertTitle
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#003366",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    marginBottom: "4px",
                  }}
                >
                  How It Works
                </AlertTitle>
                <AlertDescription
                  style={{
                    fontSize: "14px",
                    color: "#001429",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.5,
                  }}
                >
                  I'll ask you questions about your business, customers, and
                  goals. Answer naturally - there are no wrong answers. The AI
                  will synthesize your responses into a comprehensive profile
                  for ad generation.
                </AlertDescription>
              </Alert>

              <div
                style={{
                  background: "rgba(243, 244, 246, 0.5)",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    fontStyle: "italic",
                    color: "#6b7280",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.5,
                  }}
                >
                  "Answer naturally and conversationally. Don't worry about
                  being perfect - the goal is to capture your authentic thoughts
                  and business reality."
                </p>
              </div>
            </CardHeader>
            <CardContent style={{ padding: "32px", paddingTop: "0" }}>
              {/* Two column layout for options */}
              <div
                className="grid md:grid-cols-2"
                style={{ gap: "24px", marginBottom: "24px" }}
              >
                {/* Quick Start Option */}
                <Card
                  className="relative"
                  style={{
                    border: "2px solid #0066cc",
                    background:
                      "linear-gradient(135deg, rgba(0, 102, 204, 0.05) 0%, #ffffff 100%)",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      top: "-12px",
                      right: "16px",
                      background: "#0066cc",
                      color: "#ffffff",
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    RECOMMENDED
                  </div>
                  <CardHeader style={{ padding: "24px" }}>
                    <CardTitle
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#0066cc",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        marginBottom: "4px",
                      }}
                    >
                      Quick Start
                    </CardTitle>
                    <CardDescription
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      12 essential questions in ~8-10 minutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent style={{ padding: "0 24px 24px 24px" }}>
                    <div style={{ marginBottom: "16px" }}>
                      {[
                        "Perfect for running ads & AI coaches quickly",
                        "Captures brand voice, customer insights & operations",
                        "Can expand to full profile later",
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start"
                          style={{ gap: "8px", marginBottom: "8px" }}
                        >
                          <CheckCircle
                            className="flex-shrink-0"
                            style={{
                              width: "16px",
                              height: "16px",
                              color: "#0066cc",
                              marginTop: "2px",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "14px",
                              color: "#001429",
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => startInterview("quick_start")}
                      disabled={isSubmitting}
                      style={{
                        background: "#0066cc",
                        color: "#ffffff",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {isSubmitting ? "Starting..." : "Start Quick Interview"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Full Interview Option */}
                <Card
                  style={{
                    border: "2px solid #e5e7eb",
                    background: "#ffffff",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <CardHeader style={{ padding: "24px" }}>
                    <CardTitle
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#003366",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        marginBottom: "4px",
                      }}
                    >
                      Full Interview
                    </CardTitle>
                    <CardDescription
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      19 comprehensive questions in ~15-20 minutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent style={{ padding: "0 24px 24px 24px" }}>
                    <div style={{ marginBottom: "16px" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#003366",
                          marginBottom: "12px",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        What You'll Create:
                      </p>
                      {[
                        "Comprehensive Business Profile - Your complete story, positioning, and unique value",
                        "Ideal Customer Insights - Deep understanding of who you serve and their needs",
                        "Brand Voice Guidelines - How to communicate authentically across all channels",
                        "Strategic Foundation - Clear vision and messaging framework",
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start"
                          style={{ gap: "8px", marginBottom: "8px" }}
                        >
                          <CheckCircle
                            className="flex-shrink-0"
                            style={{
                              width: "16px",
                              height: "16px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "14px",
                              color: "#001429",
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => startInterview("full")}
                      disabled={isSubmitting}
                      style={{
                        background: "#ffffff",
                        color: "#0066cc",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        border: "2px solid #0066cc",
                        cursor: "pointer",
                      }}
                    >
                      {isSubmitting ? "Starting..." : "Start Full Interview"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Interview in progress
  return (
    <div
      className="w-full flex flex-col items-center"
      style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
    >
      <div className="w-full" style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              marginBottom: "8px",
              color: "#003366",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Brand Voice Interview
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent style={{ padding: "24px" }}>
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: "16px" }}
              >
                <Badge
                  variant="secondary"
                  style={{
                    background: "#f3f4f6",
                    color: "#003366",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Question {currentQuestionNumber} of {totalQuestions}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResetting}
                  style={{
                    background: "#ffffff",
                    color: "#0066cc",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    border: "2px solid #e5e7eb",
                    cursor: "pointer",
                  }}
                >
                  {isResetting ? "Resetting..." : "Start Over"}
                </Button>
              </div>
              <Progress value={progress} style={{ marginBottom: "8px" }} />
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {Math.round(progress)}% Complete
              </p>
            </CardContent>
          </Card>

          {error && (
            <Alert
              variant="destructive"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <AlertCircle className="h-4 w-4" style={{ color: "#cc0066" }} />
              <AlertTitle
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#991b1b",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "4px",
                }}
              >
                Error
              </AlertTitle>
              <AlertDescription
                style={{
                  fontSize: "14px",
                  color: "#991b1b",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent style={{ padding: "24px" }}>
              <div
                style={{
                  minHeight: "400px",
                  maxHeight: "500px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {messages.map((msg, index) => {
                  // Check if this is the last AI message and has quick answer options
                  const isLastAIMessage =
                    msg.type === "ai" && index === messages.length - 1;
                  const quickOptions = msg.prompt_key
                    ? QUICK_ANSWER_OPTIONS[msg.prompt_key]
                    : null;
                  const showQuickAnswers =
                    isLastAIMessage &&
                    quickOptions &&
                    currentPrompt?.prompt_key === msg.prompt_key;

                  return (
                    <div
                      key={msg.id}
                      className="flex"
                      style={{
                        justifyContent:
                          msg.type === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "85%",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          background:
                            msg.type === "user" ? "#0066cc" : "#f3f4f6",
                          color: msg.type === "user" ? "#ffffff" : "#001429",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "14px",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            lineHeight: 1.5,
                          }}
                        >
                          {msg.content}
                        </p>

                        {/* Quick answer buttons for AI coaching questions */}
                        {showQuickAnswers && (
                          <div
                            style={{
                              marginTop: "12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                marginBottom: "4px",
                              }}
                            >
                              Quick answers (or type your own below):
                            </p>
                            {quickOptions.map((option, optIndex) => (
                              <button
                                key={optIndex}
                                onClick={() => setCurrentInput(option.value)}
                                disabled={isSubmitting}
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "6px",
                                  padding: "8px 12px",
                                  fontSize: "13px",
                                  fontFamily:
                                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                  color: "#003366",
                                  cursor: isSubmitting
                                    ? "not-allowed"
                                    : "pointer",
                                  textAlign: "left",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSubmitting) {
                                    e.currentTarget.style.background =
                                      "#0066cc";
                                    e.currentTarget.style.color = "#ffffff";
                                    e.currentTarget.style.borderColor =
                                      "#0066cc";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#ffffff";
                                  e.currentTarget.style.color = "#003366";
                                  e.currentTarget.style.borderColor = "#e5e7eb";
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}

                        <p
                          style={{
                            fontSize: "12px",
                            opacity: 0.7,
                            marginTop: "8px",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {isGeneratingProfile && (
                  <div
                    className="flex"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <div
                      className="flex items-center"
                      style={{
                        background: "#f3f4f6",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        gap: "12px",
                      }}
                    >
                      <RefreshCw
                        className="h-4 w-4 animate-spin"
                        style={{ color: "#0066cc" }}
                      />
                      <p
                        style={{
                          fontSize: "14px",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          color: "#001429",
                        }}
                      >
                        Generating your Business Profile...
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* Show Generate Profile button when 100% complete */}
          {!isGeneratingProfile && !showProfileSuccess && progress >= 100 && (
            <Card
              style={{
                background: "#ffffff",
                border: "2px solid #0066cc",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              <CardContent style={{ padding: "24px" }}>
                <div
                  className="flex flex-col items-center"
                  style={{ gap: "16px", textAlign: "center" }}
                >
                  <CheckCircle
                    className="h-12 w-12"
                    style={{ color: "#0066cc" }}
                  />
                  <div>
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#003366",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        marginBottom: "8px",
                      }}
                    >
                      All Questions Complete!
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      You've answered all {totalQuestions} questions. Ready to
                      generate your Business Profile?
                    </p>
                  </div>
                  <Button
                    onClick={generateProfile}
                    disabled={isGeneratingProfile}
                    className="w-full"
                    style={{
                      background: isGeneratingProfile ? "#93c5fd" : "#0066cc",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "16px 24px",
                      fontSize: "16px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "none",
                      cursor: isGeneratingProfile ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {isGeneratingProfile && (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    )}
                    {isGeneratingProfile
                      ? "Generating Your Profile..."
                      : "Generate Business Profile"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Generated Success State */}
          {showProfileSuccess && (
            <Card
              style={{
                background: "#ffffff",
                border: "2px solid #22c55e",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              <CardContent style={{ padding: "32px" }}>
                <div
                  className="flex flex-col items-center"
                  style={{ gap: "20px", textAlign: "center" }}
                >
                  <div
                    style={{
                      background: "#dcfce7",
                      borderRadius: "50%",
                      padding: "16px",
                    }}
                  >
                    <CheckCircle
                      className="h-12 w-12"
                      style={{ color: "#22c55e" }}
                    />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        color: "#003366",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        marginBottom: "8px",
                      }}
                    >
                      Business Profile Created!
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        lineHeight: 1.6,
                      }}
                    >
                      Your AI-powered business profile is ready. It will guide
                      all AI-generated content to match your unique brand voice
                      and messaging.
                    </p>
                  </div>
                  <div
                    className="flex flex-col w-full"
                    style={{ gap: "12px", marginTop: "8px" }}
                  >
                    <Button
                      onClick={() => router.push(buildUrl("/ai-coaches"))}
                      className="w-full"
                      style={{
                        background: "#0066cc",
                        color: "#ffffff",
                        borderRadius: "8px",
                        padding: "16px 24px",
                        fontSize: "16px",
                        fontWeight: 600,
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Go to AI Coaches
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(buildUrl("/brand-voice"))
                      }
                      className="w-full"
                      style={{
                        background: "#ffffff",
                        color: "#0066cc",
                        borderRadius: "8px",
                        padding: "16px 24px",
                        fontSize: "16px",
                        fontWeight: 600,
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        border: "2px solid #e5e7eb",
                        cursor: "pointer",
                      }}
                    >
                      View Brand Voice
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show answer input when interview in progress */}
          {!isGeneratingProfile && currentPrompt && progress < 100 && (
            <Card
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              <CardContent style={{ padding: "24px" }}>
                {/* Special input for policies_summary question */}
                {currentPrompt.prompt_key === "policies_summary" ? (
                  <>
                    <div style={{ marginBottom: "20px" }}>
                      <Label
                        htmlFor="return-policy-url"
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#003366",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        Return Policy URL{" "}
                        <span style={{ color: "#6b7280", fontWeight: 400 }}>
                          (optional)
                        </span>
                      </Label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Input
                          id="return-policy-url"
                          type="url"
                          value={returnPolicyUrl}
                          onChange={(e) => setReturnPolicyUrl(e.target.value)}
                          placeholder="https://yourstore.com/policies/refund-policy"
                          disabled={isSubmitting || isSummarizingReturn}
                          style={{
                            flex: 1,
                            padding: "12px",
                            fontSize: "14px",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            background: "#ffffff",
                            color: "#001429",
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => summarizePolicy("return")}
                          disabled={
                            isSubmitting ||
                            isSummarizingReturn ||
                            !returnPolicyUrl.trim()
                          }
                          style={{
                            background:
                              isSubmitting ||
                              isSummarizingReturn ||
                              !returnPolicyUrl.trim()
                                ? "#e5e7eb"
                                : "#0066cc",
                            color: "#ffffff",
                            borderRadius: "8px",
                            padding: "12px 16px",
                            fontSize: "14px",
                            fontWeight: 600,
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            border: "none",
                            cursor:
                              isSubmitting ||
                              isSummarizingReturn ||
                              !returnPolicyUrl.trim()
                                ? "not-allowed"
                                : "pointer",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {isSummarizingReturn && (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          )}
                          {isSummarizingReturn ? "Summarizing..." : "Summarize"}
                        </Button>
                      </div>
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <Label
                        htmlFor="shipping-policy-url"
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#003366",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        Shipping Policy URL{" "}
                        <span style={{ color: "#6b7280", fontWeight: 400 }}>
                          (optional)
                        </span>
                      </Label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Input
                          id="shipping-policy-url"
                          type="url"
                          value={shippingPolicyUrl}
                          onChange={(e) => setShippingPolicyUrl(e.target.value)}
                          placeholder="https://yourstore.com/policies/shipping-policy"
                          disabled={isSubmitting || isSummarizingShipping}
                          style={{
                            flex: 1,
                            padding: "12px",
                            fontSize: "14px",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            background: "#ffffff",
                            color: "#001429",
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => summarizePolicy("shipping")}
                          disabled={
                            isSubmitting ||
                            isSummarizingShipping ||
                            !shippingPolicyUrl.trim()
                          }
                          style={{
                            background:
                              isSubmitting ||
                              isSummarizingShipping ||
                              !shippingPolicyUrl.trim()
                                ? "#e5e7eb"
                                : "#0066cc",
                            color: "#ffffff",
                            borderRadius: "8px",
                            padding: "12px 16px",
                            fontSize: "14px",
                            fontWeight: 600,
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            border: "none",
                            cursor:
                              isSubmitting ||
                              isSummarizingShipping ||
                              !shippingPolicyUrl.trim()
                                ? "not-allowed"
                                : "pointer",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {isSummarizingShipping && (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          )}
                          {isSummarizingShipping
                            ? "Summarizing..."
                            : "Summarize"}
                        </Button>
                      </div>
                    </div>
                    <div style={{ marginBottom: "16px" }}>
                      <Label
                        htmlFor="policy-details"
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#003366",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        Policy Summary
                      </Label>
                      <Textarea
                        id="policy-details"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Describe your return and shipping policies. For example: We offer 30-day returns for unworn items with tags. Free shipping on orders over $75, otherwise $7.99 flat rate. Most orders ship within 2-3 business days."
                        rows={5}
                        disabled={isSubmitting}
                        style={{
                          width: "100%",
                          padding: "12px",
                          fontSize: "14px",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          background: "#ffffff",
                          color: "#001429",
                          lineHeight: 1.5,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: "16px" }}>
                    <Label
                      htmlFor="answer"
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#003366",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Your Answer
                    </Label>
                    <Textarea
                      id="answer"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder="Type your answer here..."
                      rows={5}
                      disabled={isSubmitting}
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "14px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        background: "#ffffff",
                        color: "#001429",
                        lineHeight: 1.5,
                      }}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    <span
                      style={{
                        color:
                          wordCount < (currentPrompt.min_words || 0)
                            ? "#cc0066"
                            : "#6b7280",
                        fontWeight:
                          wordCount < (currentPrompt.min_words || 0)
                            ? 600
                            : 400,
                      }}
                    >
                      {wordCount} words
                    </span>
                    {currentPrompt.min_words && (
                      <span style={{ marginLeft: "4px" }}>
                        (minimum {currentPrompt.min_words})
                      </span>
                    )}
                  </p>
                  <Button
                    onClick={submitAnswer}
                    disabled={isSubmitting || !currentInput.trim()}
                    style={{
                      background:
                        isSubmitting || !currentInput.trim()
                          ? "#e5e7eb"
                          : "#0066cc",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "none",
                      cursor:
                        isSubmitting || !currentInput.trim()
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {isSubmitting ? "Submitting..." : "Continue"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <DialogContent
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              padding: "32px",
            }}
          >
            <DialogHeader style={{ marginBottom: "24px" }}>
              <DialogTitle
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "8px",
                }}
              >
                Reset Interview?
              </DialogTitle>
              <DialogDescription
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  lineHeight: 1.5,
                }}
              >
                This will delete all your current responses and restart the
                interview. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <Alert
              variant="destructive"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <AlertCircle className="h-4 w-4" style={{ color: "#cc0066" }} />
              <AlertTitle
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#991b1b",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "4px",
                }}
              >
                Warning
              </AlertTitle>
              <AlertDescription
                style={{
                  fontSize: "14px",
                  color: "#991b1b",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                You will lose all progress (
                {currentPrompt?.question_number || 0} questions completed). Are
                you sure?
              </AlertDescription>
            </Alert>
            <DialogFooter
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  background: "#ffffff",
                  color: "#0066cc",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  border: "2px solid #e5e7eb",
                  cursor: "pointer",
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={isResetting}
                style={{
                  background: isResetting ? "#e5e7eb" : "#cc0066",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  border: "none",
                  cursor: isResetting ? "not-allowed" : "pointer",
                }}
              >
                {isResetting ? "Resetting..." : "Yes, Start Over"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
