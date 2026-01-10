"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SampleUpload, SampleList } from "@/features/content-center";
import { VoiceAnalysisLoader } from "@/components/ui/loading/VoiceAnalysisLoader";
import {
  Sparkles,
  FileText,
  Wand2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useShop } from "@/hooks/useShop";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { ONBOARDING_STEPS } from "@/types/onboarding";
import { logger } from "@/lib/logger";

type VoiceStep = "intro" | "upload" | "generating" | "review";

interface VoiceProfile {
  profile: {
    profile_text: string;
  };
  samples_analyzed: number;
  generation_time_ms: number;
}

export default function OnboardingVoicePage() {
  const router = useRouter();
  const { shopId } = useShop();
  const { progress, advanceToStep, markStepCompleted } = useOnboardingProgress();

  const [currentStep, setCurrentStep] = useState<VoiceStep>("intro");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProfile, setGeneratedProfile] = useState<VoiceProfile | null>(
    null
  );

  // Check if voice profile already exists
  useEffect(() => {
    if (progress?.voiceProfileCompleted) {
      // Already completed, skip to review or advance
      setCurrentStep("review");
    }
  }, [progress]);

  const handleNext = () => {
    if (currentStep === "intro") {
      setCurrentStep("upload");
    } else if (currentStep === "upload") {
      setCurrentStep("generating");
      generateProfile();
    }
  };

  const handleBack = () => {
    if (currentStep === "intro") {
      router.push(`/stores/${shopId}/onboarding/profile`);
    } else if (currentStep === "upload") {
      setCurrentStep("intro");
    }
  };

  const generateProfile = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/content-center/voice/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedProfile(data.data);
        setCurrentStep("review");
      } else {
        throw new Error(data.error || "Failed to generate profile");
      }
    } catch (error) {
      logger.error("Profile generation error:", error as Error, {
        component: "onboarding-voice",
      });
      alert("Failed to generate voice profile. Please try again.");
      setCurrentStep("upload");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async () => {
    // Mark voice profile as completed and advance
    await markStepCompleted("voiceProfile");
    await advanceToStep(ONBOARDING_STEPS.BUSINESS_INTERVIEW);
    router.push(`/stores/${shopId}/onboarding/interview`);
  };

  return (
    <div className="space-y-6">
      {/* Intro Step */}
      {currentStep === "intro" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Create Your Brand Voice Profile</CardTitle>
            <CardDescription className="text-base mt-2">
              Upload writing samples so AI can match your unique style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Upload Your Writing Samples</h3>
                  <p className="text-sm text-gray-500">
                    Share 3-10 examples of your best writing. We&apos;ll analyze your
                    unique style, tone, and voice.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <Wand2 className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI Analyzes Your Voice</h3>
                  <p className="text-sm text-gray-500">
                    Our AI identifies patterns in your writing - from sentence
                    structure to vocabulary choices.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Generate On-Brand Content</h3>
                  <p className="text-sm text-gray-500">
                    Create blogs, ads, and product descriptions that sound
                    authentically like you.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">What makes a good writing sample?</p>
              <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                <li>500-5000 words of original content you wrote</li>
                <li>Examples that represent your authentic voice</li>
                <li>Blog posts, emails, or product descriptions work great</li>
                <li>Avoid AI-generated or heavily edited content</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Upload Samples
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Step */}
      {currentStep === "upload" && (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Upload Your Writing Samples</CardTitle>
              <CardDescription>
                Upload at least 3 samples (500-5000 words each) to create your voice
                profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SampleUpload
                onUploadSuccess={() => setRefreshTrigger((prev) => prev + 1)}
              />
            </CardContent>
          </Card>

          <SampleList refreshTrigger={refreshTrigger} />

          <div className="flex gap-4">
            <Button
              onClick={() => setCurrentStep("intro")}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1">
              Generate Voice Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Generating Step */}
      {currentStep === "generating" && (
        <VoiceAnalysisLoader isLoading={isGenerating} estimatedTimeSeconds={30} />
      )}

      {/* Review Step */}
      {currentStep === "review" && (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Your Voice Profile is Ready!</CardTitle>
                  <CardDescription>
                    Review your brand voice profile below. You can edit it anytime from
                    your settings.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {generatedProfile ? (
                <>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm">
                      {generatedProfile.profile.profile_text}
                    </pre>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Generated from {generatedProfile.samples_analyzed} samples
                    </span>
                    <span>•</span>
                    <span>
                      {Math.round(generatedProfile.generation_time_ms / 1000)}s
                      generation time
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Your voice profile was created earlier. You can view and edit it in
                    Content Center settings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              onClick={() => setCurrentStep("upload")}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Re-upload Samples
            </Button>
            <Button onClick={handleContinue} className="flex-1">
              Continue to Interview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
