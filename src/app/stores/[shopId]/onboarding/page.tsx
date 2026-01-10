"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, MessageSquare, User, CheckCircle2 } from "lucide-react";
import { useShop } from "@/hooks/useShop";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { ONBOARDING_STEPS } from "@/types/onboarding";

const features = [
  {
    icon: User,
    title: "Shop Profile",
    description: "Tell us about your business so we can tailor content to your needs",
  },
  {
    icon: Sparkles,
    title: "Brand Voice",
    description: "Upload writing samples so AI can match your unique style",
  },
  {
    icon: MessageSquare,
    title: "Business Interview",
    description: "Answer questions to help us understand your customers and goals",
  },
];

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const { shopId } = useShop();
  const { progress, isLoading, advanceToStep } = useOnboardingProgress();

  // Redirect to appropriate step if already in progress
  useEffect(() => {
    if (!isLoading && progress && progress.currentStep > ONBOARDING_STEPS.WELCOME) {
      // Resume from where they left off
      if (!progress.shopProfileCompleted) {
        router.push(`/stores/${shopId}/onboarding/profile`);
      } else if (!progress.voiceProfileCompleted) {
        router.push(`/stores/${shopId}/onboarding/voice`);
      } else if (!progress.businessProfileCompleted) {
        router.push(`/stores/${shopId}/onboarding/interview`);
      } else if (progress.onboardingCompleted) {
        router.push(`/stores/${shopId}/content-center`);
      }
    }
  }, [isLoading, progress, router, shopId]);

  const handleGetStarted = async () => {
    await advanceToStep(ONBOARDING_STEPS.SHOP_PROFILE);
    router.push(`/stores/${shopId}/onboarding/profile`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto"
          style={{
            background: "linear-gradient(135deg, #0066cc 0%, #0052a3 100%)",
          }}
        >
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Let&apos;s Get Your AI Content Engine Ready
        </h2>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Complete a quick setup to unlock AI-powered product descriptions, blog posts,
          and marketing content that sounds exactly like your brand.
        </p>
      </div>

      {/* What We&apos;ll Set Up */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Here&apos;s what we&apos;ll set up together:
        </h3>

        <div className="space-y-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isCompleted =
              progress &&
              ((index === 0 && progress.shopProfileCompleted) ||
                (index === 1 && progress.voiceProfileCompleted) ||
                (index === 2 && progress.businessProfileCompleted));

            return (
              <div
                key={feature.title}
                className={`
                  flex items-start gap-4 p-4 rounded-xl transition-colors
                  ${isCompleted ? "bg-green-50" : "bg-gray-50"}
                `}
              >
                <div
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isCompleted ? "bg-green-100" : "bg-blue-100"}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Icon className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <h4
                    className={`font-medium ${isCompleted ? "text-green-700" : "text-gray-900"}`}
                  >
                    {feature.title}
                    {isCompleted && (
                      <span className="ml-2 text-sm text-green-600">✓ Complete</span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Estimate */}
      <div className="bg-blue-50 rounded-xl p-4 text-center">
        <p className="text-blue-800">
          <span className="font-semibold">⏱️ About 5-10 minutes</span>
          <span className="text-blue-600 ml-2">
            You can pause and continue anytime
          </span>
        </p>
      </div>

      {/* CTA Button */}
      <div className="flex justify-center">
        <button
          onClick={handleGetStarted}
          className="
            inline-flex items-center gap-2 px-8 py-4 rounded-xl
            bg-blue-600 text-white font-semibold text-lg
            hover:bg-blue-700 transition-colors
            focus:outline-none focus:ring-4 focus:ring-blue-200
          "
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Skip Option */}
      <p className="text-center text-sm text-gray-500">
        Already have content?{" "}
        <button
          onClick={() => router.push(`/stores/${shopId}/content-center`)}
          className="text-blue-600 hover:underline"
        >
          Skip for now
        </button>
        {" "}(you can complete setup later)
      </p>
    </div>
  );
}
