/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useShop } from "@/hooks/useShop";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Zap,
  ArrowLeft,
  CreditCard,
  Crown,
  Gift,
  Calendar,
  ExternalLink,
  Check,
  AlertTriangle,
  RefreshCw,
  ArrowDown,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const dynamic = "force-dynamic";

interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  price?: {
    amount: string;
    interval: string;
  };
  isTest?: boolean;
  shopifySubscriptionId?: string;
}

interface ShopSubscription {
  success: boolean;
  subscription: SubscriptionInfo | null;
  error?: string;
}

// Plan configuration with features (optimized for 85%+ profit margin)
// Cost basis:
// - Product descriptions: $0.0008/each (gpt-4o-mini vision)
// - Ads: $0.002/each (gpt-4o-mini)
// - Images: $0.01/each (gpt-image-1 standard)
const PLANS = {
  free: {
    name: "Free Trial",
    monthlyPrice: 0,
    annualPrice: 0,
    credits: "Limited",
    features: [
      "30 product descriptions",
      "30 ad descriptions",
      "10 AI images",
      "14-day trial",
      "Email support",
    ],
  },
  starter: {
    name: "Starter",
    monthlyPrice: 14,
    annualPrice: 140,
    credits: "1,500 descriptions",
    features: [
      "1,500 product descriptions/month",
      "100 ads & social posts/month",
      "Product titles & meta descriptions",
      "SEO-friendly descriptions",
      "Image SEO (alt text)",
      "Direct Shopify import",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 34,
    annualPrice: 340,
    credits: "3,000 descriptions",
    features: [
      "3,000 product descriptions/month",
      "400 ads & social posts/month",
      "200 AI images/month",
      "All Starter features",
      "AI image generation",
      "Web search integration",
      "Priority support",
    ],
  },
};

// Plan tier icons with colors
function PlanIcon({
  plan,
  size = "default",
}: {
  plan: string;
  size?: "default" | "large";
}) {
  const styles: Record<string, { bg: string; ring: string }> = {
    free: { bg: "bg-gray-100", ring: "ring-gray-300" },
    starter: { bg: "bg-blue-100", ring: "ring-blue-300" },
    pro: {
      bg: "bg-gradient-to-br from-amber-300 to-amber-500",
      ring: "ring-amber-400",
    },
  };

  const style = styles[plan] || styles.free;
  const sizeClasses = size === "large" ? "w-16 h-16" : "w-12 h-12";
  const iconSize = size === "large" ? "w-8 h-8" : "w-6 h-6";

  return (
    <div
      className={`${sizeClasses} rounded-full ${style.bg} ring-4 ${style.ring} flex items-center justify-center shadow-md`}
    >
      {plan === "pro" ? (
        <Crown className={`${iconSize} text-amber-700`} />
      ) : plan === "starter" ? (
        <Zap className={`${iconSize} text-blue-600`} />
      ) : (
        <Gift className={`${iconSize} text-gray-500`} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
    trialing: { bg: "bg-blue-100", text: "text-blue-700", label: "Trial" },
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
    expired: { bg: "bg-gray-100", text: "text-gray-700", label: "Expired" },
  };

  const style = statusStyles[status.toLowerCase()] || statusStyles.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

// Billing interval toggle
function BillingToggle({
  interval,
  onChange,
}: {
  interval: "monthly" | "annual";
  onChange: (interval: "monthly" | "annual") => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 p-1 bg-gray-100 rounded-lg">
      <button
        onClick={() => onChange("monthly")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
          interval === "monthly"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("annual")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
          interval === "annual"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Annual
        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
          Save 17%
        </span>
      </button>
    </div>
  );
}

function BillingContent() {
  const _searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { shop } = useShop();

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!shop) return;
    try {
      const response = await fetch(
        `/api/billing/status?shop=${encodeURIComponent(shop)}`,
      );
      const data: ShopSubscription = await response.json();

      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      } else {
        setError(data.error || "Failed to load subscription");
      }
    } catch (err) {
      setError("Failed to load subscription");
      logger.error("Subscription fetch error", err, { component: "billing-page" });
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [shop, fetchSubscription]);

  const handleUpgrade = async (planId: string) => {
    if (!shop) {
      toast({
        title: "Error",
        description: "Shop not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setUpgrading(true);
    setSelectedPlan(planId);
    try {
      const response = await fetch("/api/billing/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingInterval,
          shopDomain: shop,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast({
          title: "Error",
          description: `Server error (${response.status}): ${errorText || response.statusText}`,
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.success && data.dashboardUrl) {
        window.location.href = data.dashboardUrl;
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to initiate upgrade",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to process upgrade",
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const handleManageInShopify = () => {
    if (!shop) return;
    const storeHandle = shop.replace(".myshopify.com", "");
    window.open(
      `https://admin.shopify.com/store/${storeHandle}/settings/billing`,
      "_blank",
    );
  };

  const handleCancelSubscription = async () => {
    if (!shop) return;

    setCancelling(true);
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain: shop }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Subscription Cancelled",
          description:
            "Your subscription has been cancelled. You'll retain access until the end of your billing period.",
        });
        setShowCancelConfirm(false);
        // Refresh subscription data
        await fetchSubscription();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to cancel subscription",
          variant: "destructive",
        });
      }
    } catch (err) {
      logger.error("Error cancelling subscription", err, { component: "billing-page" });
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No shop specified</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Unable to Load Subscription
          </h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Button onClick={fetchSubscription} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || "free";
  const isTrialing = subscription?.status === "trialing";
  const isActive = subscription?.status === "active";
  const _isCancelled =
    subscription?.status === "cancelled" || subscription?.status === "canceled";

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                }}
              >
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Billing & Plan
                </h1>
                <p className="text-gray-500 text-sm">
                  Manage your subscription and billing
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-gray-200 hover:bg-gray-50"
              onClick={() => router.push(`/settings?shop=${shop}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Current Plan Card - Gold Branded */}
          <div
            className="rounded-xl shadow-lg overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)",
              border: "2px solid #f59e0b",
            }}
          >
            <div className="p-6 border-b border-amber-400/30 bg-gradient-to-r from-amber-100/50 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-700" />
                  <h3 className="text-lg font-semibold text-amber-900">
                    Current Plan
                  </h3>
                </div>
                {subscription?.isTest && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    Test Mode
                  </span>
                )}
              </div>
            </div>
            <div className="p-6 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-6">
                <PlanIcon plan={currentPlan} size="large" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-2xl font-bold text-amber-900">
                      {PLANS[currentPlan as keyof typeof PLANS]?.name ||
                        "Free Trial"}
                    </h4>
                    <StatusBadge status={subscription?.status || "free"} />
                  </div>

                  {currentPlan !== "free" && (
                    <p className="text-3xl font-bold text-amber-800">
                      $
                      {subscription?.price?.interval === "annual"
                        ? PLANS[currentPlan as keyof typeof PLANS]?.annualPrice
                        : PLANS[currentPlan as keyof typeof PLANS]
                            ?.monthlyPrice}
                      <span className="text-base font-normal text-amber-700">
                        /
                        {subscription?.price?.interval === "annual"
                          ? "year"
                          : "month"}
                      </span>
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4">
                    {isTrialing && subscription?.trialEndsAt && (
                      <div className="flex items-center gap-2 text-sm bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full border border-amber-300">
                        <Calendar className="w-4 h-4" />
                        Trial ends: {formatDate(subscription.trialEndsAt)}
                      </div>
                    )}

                    {isActive && subscription?.currentPeriodEnd && (
                      <div className="flex items-center gap-2 text-sm bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full border border-amber-300">
                        <Calendar className="w-4 h-4" />
                        Next billing:{" "}
                        {formatDate(subscription.currentPeriodEnd)}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full border border-amber-300">
                      <Sparkles className="w-4 h-4" />
                      {PLANS[currentPlan as keyof typeof PLANS]?.credits ||
                        "500"}{" "}
                      credits/month
                    </div>
                  </div>

                  {/* Cancel button for paid plans */}
                  {(currentPlan === "starter" || currentPlan === "pro") &&
                    isActive && (
                      <div className="mt-4 pt-4 border-t border-amber-300/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCancelConfirm(true)}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel Subscription
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Cancel Confirmation Modal */}
          {showCancelConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Cancel Subscription?
                    </h3>
                    <p className="text-sm text-gray-500">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">
                    If you cancel your subscription:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      You&apos;ll lose access to premium features
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      Your credit balance will reset to the free tier
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      You can resubscribe at any time
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1"
                    disabled={cancelling}
                  >
                    Keep Subscription
                  </Button>
                  <Button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Yes, Cancel"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Choose Your Plan - All Plans Shown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {currentPlan === "pro" ? "Your Plan" : "Choose Your Plan"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentPlan === "pro"
                      ? "You're on our best plan with all features"
                      : "Upgrade anytime to unlock more features"}
                  </p>
                </div>
                <BillingToggle
                  interval={billingInterval}
                  onChange={setBillingInterval}
                />
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Free Plan */}
                <div
                  className={`rounded-xl border-2 p-6 transition-all ${
                    currentPlan === "free"
                      ? "border-gray-400 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <PlanIcon plan="free" />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Free Trial
                      </h4>
                      <p className="text-2xl font-bold text-gray-900">$0</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Perfect for trying out Thunder Text
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {PLANS.free.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {currentPlan === "free" ? (
                    <div className="w-full py-2.5 px-4 text-center text-sm font-medium text-gray-500 bg-gray-100 rounded-lg">
                      Current Plan
                    </div>
                  ) : (
                    <div className="w-full py-2.5 px-4 text-center text-sm font-medium text-gray-400 bg-gray-50 rounded-lg">
                      Trial Only
                    </div>
                  )}
                </div>

                {/* Starter Plan */}
                <div
                  className={`rounded-xl border-2 p-6 transition-all ${
                    currentPlan === "starter"
                      ? "border-blue-500 bg-blue-50/30"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <PlanIcon plan="starter" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Starter</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        $
                        {billingInterval === "annual"
                          ? Math.round(PLANS.starter.annualPrice / 12)
                          : PLANS.starter.monthlyPrice}
                        <span className="text-sm font-normal text-gray-500">
                          /mo
                        </span>
                      </p>
                      {billingInterval === "annual" && (
                        <p className="text-xs text-green-600">
                          ${PLANS.starter.annualPrice}/year (save $38)
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    For growing stores
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {PLANS.starter.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {currentPlan === "starter" ? (
                    <div className="w-full py-2.5 px-4 text-center text-sm font-medium text-blue-600 bg-blue-100 rounded-lg">
                      Current Plan
                    </div>
                  ) : currentPlan === "pro" ? (
                    <Button
                      onClick={() => handleUpgrade("starter")}
                      disabled={upgrading}
                      variant="outline"
                      className="w-full"
                    >
                      {upgrading && selectedPlan === "starter" ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowDown className="w-4 h-4 mr-2" />
                      )}
                      Downgrade
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade("starter")}
                      disabled={upgrading}
                      className="w-full bg-gray-900 hover:bg-gray-800"
                    >
                      {upgrading && selectedPlan === "starter" ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {currentPlan === "free" ? "Upgrade" : "Switch"} to Starter
                    </Button>
                  )}
                </div>

                {/* Pro Plan */}
                <div
                  className={`rounded-xl border-2 p-6 transition-all relative ${
                    currentPlan === "pro"
                      ? "border-amber-500 bg-amber-50/30"
                      : "border-blue-500 bg-blue-50/30"
                  }`}
                >
                  {currentPlan !== "pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <PlanIcon plan="pro" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Pro</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        $
                        {billingInterval === "annual"
                          ? Math.round(PLANS.pro.annualPrice / 12)
                          : PLANS.pro.monthlyPrice}
                        <span className="text-sm font-normal text-gray-500">
                          /mo
                        </span>
                      </p>
                      {billingInterval === "annual" && (
                        <p className="text-xs text-green-600">
                          ${PLANS.pro.annualPrice}/year (save $68)
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    For power users & agencies
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {PLANS.pro.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {currentPlan === "pro" ? (
                    <div className="w-full py-2.5 px-4 text-center text-sm font-medium text-amber-700 bg-amber-100 rounded-lg">
                      Current Plan
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade("pro")}
                      disabled={upgrading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {upgrading && selectedPlan === "pro" ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Crown className="w-4 h-4 mr-2" />
                      )}
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </div>

              {/* Plan change info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  Plan changes take effect immediately. Upgrades are prorated,
                  and you only pay the difference.
                  {currentPlan !== "free" && (
                    <span className="block mt-1 text-gray-500">
                      Need to cancel?{" "}
                      <button
                        onClick={handleManageInShopify}
                        className="text-blue-600 hover:underline"
                      >
                        Manage in Shopify
                      </button>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Questions about billing? Contact us or manage your subscription in
              Shopify.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleManageInShopify}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage in Shopify
              </Button>
              <Link href={`/settings?shop=${shop}`}>
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
