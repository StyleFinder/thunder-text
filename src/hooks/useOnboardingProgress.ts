"use client";

import { useState, useEffect, useCallback } from "react";
import { useShop } from "./useShop";
import {
  OnboardingProgress,
  OnboardingStep,
  ONBOARDING_STEPS,
  UpdateOnboardingProgressPayload,
} from "@/types/onboarding";

interface UseOnboardingProgressReturn {
  progress: OnboardingProgress | null;
  isLoading: boolean;
  error: string | null;
  refreshProgress: () => Promise<void>;
  updateProgress: (updates: UpdateOnboardingProgressPayload) => Promise<boolean>;
  advanceToStep: (step: OnboardingStep) => Promise<boolean>;
  markStepCompleted: (
    step: "shopProfile" | "voiceProfile" | "businessProfile"
  ) => Promise<boolean>;
  markOnboardingComplete: () => Promise<boolean>;
}

const DEFAULT_PROGRESS: OnboardingProgress = {
  currentStep: ONBOARDING_STEPS.NOT_STARTED,
  shopProfileCompleted: false,
  voiceProfileCompleted: false,
  businessProfileCompleted: false,
  onboardingCompleted: false,
};

/**
 * Hook to manage onboarding progress state
 *
 * Provides:
 * - Current progress state
 * - Methods to update progress
 * - Auto-refresh when shop changes
 */
export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const { shopId, isLoading: shopLoading } = useShop();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current progress
  const refreshProgress = useCallback(async () => {
    if (!shopId) {
      setProgress(DEFAULT_PROGRESS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/progress", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setProgress(data.data);
      } else {
        setError(data.error || "Failed to fetch progress");
        setProgress(DEFAULT_PROGRESS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch progress");
      setProgress(DEFAULT_PROGRESS);
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  // Update progress on server
  const updateProgress = useCallback(
    async (updates: UpdateOnboardingProgressPayload): Promise<boolean> => {
      if (!shopId) return false;

      try {
        const response = await fetch("/api/onboarding/progress", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        const data = await response.json();

        if (data.success) {
          setProgress(data.data);
          return true;
        } else {
          setError(data.error || "Failed to update progress");
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update progress");
        return false;
      }
    },
    [shopId]
  );

  // Advance to a specific step
  const advanceToStep = useCallback(
    async (step: OnboardingStep): Promise<boolean> => {
      return updateProgress({ step });
    },
    [updateProgress]
  );

  // Mark a specific step as completed
  const markStepCompleted = useCallback(
    async (
      step: "shopProfile" | "voiceProfile" | "businessProfile"
    ): Promise<boolean> => {
      const updates: UpdateOnboardingProgressPayload = {};

      switch (step) {
        case "shopProfile":
          updates.shopProfileCompleted = true;
          break;
        case "voiceProfile":
          updates.voiceProfileCompleted = true;
          break;
        case "businessProfile":
          updates.businessProfileCompleted = true;
          break;
      }

      return updateProgress(updates);
    },
    [updateProgress]
  );

  // Mark onboarding as fully complete
  const markOnboardingComplete = useCallback(async (): Promise<boolean> => {
    return updateProgress({
      step: ONBOARDING_STEPS.COMPLETE,
      shopProfileCompleted: true,
      voiceProfileCompleted: true,
      businessProfileCompleted: true,
    });
  }, [updateProgress]);

  // Fetch progress when shop changes
  useEffect(() => {
    if (!shopLoading) {
      refreshProgress();
    }
  }, [shopId, shopLoading, refreshProgress]);

  return {
    progress,
    isLoading: isLoading || shopLoading,
    error,
    refreshProgress,
    updateProgress,
    advanceToStep,
    markStepCompleted,
    markOnboardingComplete,
  };
}

/**
 * Hook to check if onboarding is required
 *
 * Returns true if the user hasn't completed all onboarding steps
 */
export function useNeedsOnboarding(): {
  needsOnboarding: boolean;
  isLoading: boolean;
} {
  const { progress, isLoading } = useOnboardingProgress();

  return {
    needsOnboarding: !progress?.onboardingCompleted,
    isLoading,
  };
}
