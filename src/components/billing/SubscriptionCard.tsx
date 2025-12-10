"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  AlertCircle,
  Crown,
  Zap,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingModal } from "./PricingModal";

interface SubscriptionCardProps {
  shopId: string;
  shopDomain: string;
}

interface SubscriptionData {
  plan: "free" | "starter" | "pro";
  planName: string;
  price: number;
  status: string;
  periodEnd: string | null;
  usage: {
    productDescriptions: { used: number; limit: number; remaining: number };
    ads: { used: number; limit: number; remaining: number };
  };
  limits: {
    productDescriptions: number;
    ads: number;
  };
}

const PLAN_ICONS = {
  free: Zap,
  starter: Crown,
  pro: Rocket,
};

const PLAN_COLORS = {
  free: { bg: "bg-gray-100", text: "text-gray-600", accent: "#6b7280" },
  starter: { bg: "bg-blue-100", text: "text-blue-600", accent: "#2563eb" },
  pro: { bg: "bg-purple-100", text: "text-purple-600", accent: "#7c3aed" },
};

export function SubscriptionCard({
  shopId,
  shopDomain,
}: SubscriptionCardProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, shopDomain]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (shopId) params.append("shopId", shopId);
      if (shopDomain) params.append("shop", shopDomain);

      const response = await fetch(`/api/billing/subscription?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch subscription");
      }

      setSubscription(data.subscription);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load subscription",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to open billing portal",
      );
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Subscription
            </h3>
          </div>
        </div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Subscription
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
          <Button variant="outline" onClick={fetchSubscription}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!subscription) return null;

  const PlanIcon = PLAN_ICONS[subscription.plan];
  const planColors = PLAN_COLORS[subscription.plan];
  const isFreePlan = subscription.plan === "free";

  const pdPercent = Math.min(
    100,
    (subscription.usage.productDescriptions.used /
      subscription.usage.productDescriptions.limit) *
      100,
  );
  const adsPercent =
    subscription.usage.ads.limit === -1
      ? 0
      : Math.min(
          100,
          (subscription.usage.ads.used / subscription.usage.ads.limit) * 100,
        );

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" style={{ color: "#0066cc" }} />
              <h3 className="text-lg font-semibold text-gray-900">
                Subscription
              </h3>
            </div>
            {!isFreePlan && (
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  subscription.status === "active"
                    ? "bg-green-100 text-green-700"
                    : subscription.status === "canceling"
                      ? "bg-orange-100 text-orange-700"
                      : subscription.status === "past_due"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {subscription.status === "active"
                  ? "Active"
                  : subscription.status === "canceling"
                    ? "Canceling"
                    : subscription.status === "past_due"
                      ? "Past Due"
                      : subscription.status}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Plan */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${planColors.bg}`}
              >
                <PlanIcon className={`w-5 h-5 ${planColors.text}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {subscription.planName} Plan
                </p>
                <p className="text-sm text-gray-500">
                  {subscription.price === 0
                    ? "Free"
                    : `$${subscription.price}/month`}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Monthly Usage</h4>

            {/* Product Descriptions */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Product Descriptions</span>
                <span className="font-medium text-gray-900">
                  {subscription.usage.productDescriptions.used} /{" "}
                  {subscription.usage.productDescriptions.limit}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pdPercent}%`,
                    backgroundColor:
                      pdPercent >= 90
                        ? "#dc2626"
                        : pdPercent >= 75
                          ? "#f59e0b"
                          : "#2563eb",
                  }}
                />
              </div>
              {pdPercent >= 90 && (
                <p className="text-xs text-red-600 mt-1">
                  You&apos;re running low on product descriptions
                </p>
              )}
            </div>

            {/* Ads */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Ads</span>
                <span className="font-medium text-gray-900">
                  {subscription.usage.ads.used} /{" "}
                  {subscription.usage.ads.limit === -1
                    ? "∞"
                    : subscription.usage.ads.limit}
                </span>
              </div>
              {subscription.usage.ads.limit !== -1 && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${adsPercent}%`,
                      backgroundColor:
                        adsPercent >= 90
                          ? "#dc2626"
                          : adsPercent >= 75
                            ? "#f59e0b"
                            : "#7c3aed",
                    }}
                  />
                </div>
              )}
              {subscription.usage.ads.limit === -1 && (
                <div className="h-2 bg-purple-100 rounded-full" />
              )}
            </div>
          </div>

          {/* Period End Date */}
          {subscription.periodEnd && (
            <p className="text-xs text-gray-500">
              {subscription.status === "canceling"
                ? `Cancels on ${new Date(subscription.periodEnd).toLocaleDateString()}`
                : subscription.status === "active"
                  ? `Renews on ${new Date(subscription.periodEnd).toLocaleDateString()}`
                  : `Ends on ${new Date(subscription.periodEnd).toLocaleDateString()}`}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {isFreePlan ? (
              <Button
                className="w-full"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
                onClick={() => setShowPricingModal(true)}
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            ) : (
              <>
                <Button
                  className="w-full"
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                    border: "none",
                  }}
                  onClick={() => setShowPricingModal(true)}
                >
                  Change Plan
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        shopId={shopId}
        currentPlan={subscription.plan}
        usage={subscription.usage}
      />
    </>
  );
}
