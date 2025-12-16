/**
 * useSubscription Hook
 *
 * React hook for checking subscription status and handling upgrades.
 * Use this in components that need to show upgrade prompts or
 * restrict access based on subscription status.
 */

import { useState, useEffect, useCallback } from "react";

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isTrialing: boolean;
  trialExpired: boolean;
  trialDaysRemaining: number | null;
  status: string;
  planName: string | null;
  requiresUpgrade: boolean;
  shopifyChargeId: string | null;
  pricingPageUrl: string | null;
  shopDomain: string | null;
}

export interface UseSubscriptionResult {
  subscription: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  redirectToUpgrade: () => void;
}

/**
 * Hook to fetch and manage subscription status
 *
 * Usage:
 * ```tsx
 * const { subscription, isLoading, redirectToUpgrade } = useSubscription();
 *
 * if (subscription?.requiresUpgrade) {
 *   return <UpgradePrompt onUpgrade={redirectToUpgrade} />;
 * }
 * ```
 */
export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/billing/subscription-status");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch subscription status");
      }

      setSubscription(data.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Failed to fetch subscription:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const redirectToUpgrade = useCallback(() => {
    if (subscription?.pricingPageUrl) {
      // Open in same window to maintain Shopify admin context
      window.location.href = subscription.pricingPageUrl;
    }
  }, [subscription?.pricingPageUrl]);

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
    redirectToUpgrade,
  };
}

/**
 * Hook to show trial warning banner
 *
 * Usage:
 * ```tsx
 * const { showWarning, daysRemaining, dismiss } = useTrialWarning();
 *
 * if (showWarning) {
 *   return <TrialBanner days={daysRemaining} onDismiss={dismiss} />;
 * }
 * ```
 */
export function useTrialWarning(): {
  showWarning: boolean;
  daysRemaining: number | null;
  isTrialing: boolean;
  dismiss: () => void;
} {
  const { subscription } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Show warning when trial has 7 or fewer days remaining
  const showWarning =
    !dismissed &&
    subscription?.isTrialing === true &&
    subscription?.trialDaysRemaining !== null &&
    subscription.trialDaysRemaining <= 7;

  return {
    showWarning,
    daysRemaining: subscription?.trialDaysRemaining ?? null,
    isTrialing: subscription?.isTrialing ?? false,
    dismiss: () => setDismissed(true),
  };
}

/**
 * Check if a specific feature is available based on subscription
 *
 * @param requiredPlan - The minimum plan required ('free', 'starter', 'pro')
 * @param currentPlan - The user's current plan
 * @returns Whether the feature is available
 */
export function isFeatureAvailable(
  requiredPlan: "free" | "starter" | "pro",
  currentPlan: string | null
): boolean {
  const planHierarchy = { free: 0, starter: 1, pro: 2 };
  const required = planHierarchy[requiredPlan] ?? 0;
  const current = planHierarchy[currentPlan as keyof typeof planHierarchy] ?? 0;
  return current >= required;
}
