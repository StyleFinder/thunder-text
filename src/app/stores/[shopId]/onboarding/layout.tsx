"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { useShop } from "@/hooks/useShop";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_INFO,
  isStepCompleted,
  OnboardingStep,
} from "@/types/onboarding";

interface StepIndicatorProps {
  step: number;
  name: string;
  isActive: boolean;
  isCompleted: boolean;
  isAccessible: boolean;
  href: string;
}

function StepIndicator({
  step,
  name,
  isActive,
  isCompleted,
  isAccessible,
  href,
}: StepIndicatorProps) {
  const content = (
    <div className="flex flex-col items-center">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
          transition-all duration-200
          ${
            isCompleted
              ? "bg-green-500 text-white"
              : isActive
                ? "bg-blue-600 text-white ring-4 ring-blue-100"
                : isAccessible
                  ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  : "bg-gray-100 text-gray-400"
          }
        `}
      >
        {isCompleted ? <Check className="w-5 h-5" /> : step}
      </div>
      <span
        className={`
          mt-2 text-xs font-medium
          ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"}
        `}
      >
        {name}
      </span>
    </div>
  );

  if (isAccessible && !isActive) {
    return (
      <Link href={href} className="cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
}

function StepConnector({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div
      className={`
        flex-1 h-1 mx-2 rounded-full transition-colors duration-200
        ${isCompleted ? "bg-green-500" : "bg-gray-200"}
      `}
    />
  );
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { shopId } = useShop();
  const { progress, isLoading } = useOnboardingProgress();

  const baseUrl = `/stores/${shopId}/onboarding`;

  // Determine current step from pathname
  const getCurrentStep = (): OnboardingStep => {
    if (pathname?.endsWith("/profile")) return ONBOARDING_STEPS.SHOP_PROFILE;
    if (pathname?.endsWith("/voice")) return ONBOARDING_STEPS.BRAND_VOICE;
    if (pathname?.endsWith("/interview")) return ONBOARDING_STEPS.BUSINESS_INTERVIEW;
    if (pathname?.endsWith("/complete")) return ONBOARDING_STEPS.COMPLETE;
    return ONBOARDING_STEPS.WELCOME;
  };

  const currentStep = getCurrentStep();

  // Build step data for display
  const steps = ONBOARDING_STEP_INFO.map((info) => ({
    step: info.step,
    name: info.name,
    href: `${baseUrl}${info.path}`,
    isActive: currentStep === info.step,
    isCompleted: progress ? isStepCompleted(info.step, progress) : false,
    isAccessible:
      progress && info.step <= (progress.currentStep + 1) ? true : info.step === 1,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0066cc 0%, #0052a3 100%)",
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome to Thunder Text
              </h1>
              <p className="text-sm text-gray-500">
                Let&apos;s set up your account for the best experience
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-pulse flex items-center gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    {i < 5 && <div className="w-12 h-1 bg-gray-200 mx-2" />}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              {steps.map((step, index) => (
                <div key={step.step} className="flex items-center">
                  <StepIndicator {...step} />
                  {index < steps.length - 1 && (
                    <StepConnector isCompleted={step.isCompleted} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
