/**
 * useBusinessProfile Hook
 *
 * Q1: Extracted from business-profile/page.tsx to manage profile state
 * Handles profile loading, generation, and regeneration
 */

import { useState, useCallback } from "react";
import type { BusinessProfile, InterviewStatus } from "@/types/business-profile";
import { logger } from "@/lib/logger";

interface UseBusinessProfileOptions {
  shopDomain: string | null;
}

interface UseBusinessProfileReturn {
  // State
  profile: BusinessProfile | null;
  profileLoading: boolean;
  isGeneratingProfile: boolean;
  isRegenerating: boolean;
  showProfileSuccess: boolean;

  // Actions
  setProfile: (profile: BusinessProfile | null) => void;
  setProfileLoading: (loading: boolean) => void;
  setShowProfileSuccess: (show: boolean) => void;
  loadProfile: () => Promise<{
    profile: BusinessProfile | null;
    status: InterviewStatus;
  }>;
  generateProfile: () => Promise<BusinessProfile | null>;
  regenerateProfile: () => Promise<BusinessProfile | null>;
}

export function useBusinessProfile({
  shopDomain,
}: UseBusinessProfileOptions): UseBusinessProfileReturn {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);

  const loadProfile = useCallback(async (): Promise<{
    profile: BusinessProfile | null;
    status: InterviewStatus;
  }> => {
    if (!shopDomain) {
      setProfileLoading(false);
      return { profile: null, status: "not_started" };
    }

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
          return {
            profile: data.data.profile,
            status: data.data.profile.interview_status || "not_started",
          };
        }
      }
      return { profile: null, status: "not_started" };
    } catch (err) {
      logger.error("Failed to load profile:", err as Error, {
        component: "useBusinessProfile",
      });
      return { profile: null, status: "not_started" };
    } finally {
      setProfileLoading(false);
    }
  }, [shopDomain]);

  const generateProfile = useCallback(async (): Promise<BusinessProfile | null> => {
    if (!shopDomain) return null;

    setIsGeneratingProfile(true);

    try {
      const response = await fetch("/api/business-profile/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data?.profile) {
        setProfile(data.data.profile);
        setShowProfileSuccess(true);
        return data.data.profile;
      } else {
        logger.error("Failed to generate profile:", new Error(data.error), {
          component: "useBusinessProfile",
        });
        return null;
      }
    } catch (err) {
      logger.error("Failed to generate profile:", err as Error, {
        component: "useBusinessProfile",
      });
      return null;
    } finally {
      setIsGeneratingProfile(false);
    }
  }, [shopDomain]);

  const regenerateProfile = useCallback(async (): Promise<BusinessProfile | null> => {
    if (!shopDomain) return null;

    setIsRegenerating(true);

    try {
      const response = await fetch("/api/business-profile/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.data?.profile) {
        setProfile(data.data.profile);
        setShowProfileSuccess(true);
        // Hide success message after 2 seconds
        setTimeout(() => {
          setShowProfileSuccess(false);
        }, 2000);
        return data.data.profile;
      } else {
        const errorMessage = data.error || "Failed to regenerate profile";
        logger.error("Failed to regenerate profile:", new Error(errorMessage), {
          component: "useBusinessProfile",
        });
        return null;
      }
    } catch (err) {
      logger.error("Failed to regenerate profile:", err as Error, {
        component: "useBusinessProfile",
      });
      return null;
    } finally {
      setIsRegenerating(false);
    }
  }, [shopDomain]);

  return {
    profile,
    profileLoading,
    isGeneratingProfile,
    isRegenerating,
    showProfileSuccess,
    setProfile,
    setProfileLoading,
    setShowProfileSuccess,
    loadProfile,
    generateProfile,
    regenerateProfile,
  };
}
