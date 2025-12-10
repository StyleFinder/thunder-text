"use client";

import { useState } from "react";
import {
  X,
  Check,
  Loader2,
  Zap,
  Crown,
  Rocket,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  currentPlan: "free" | "starter" | "pro";
  usage?: {
    productDescriptions: { used: number; limit: number };
    ads: { used: number; limit: number };
  };
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Zap,
    description: "Get started with Thunder Text",
    features: [
      "30 product descriptions/month",
      "30 ads/month",
      "Basic AI templates",
      "Shopify integration",
    ],
    limits: {
      productDescriptions: 30,
      ads: 30,
    },
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 19,
    icon: Crown,
    description: "For growing stores",
    features: [
      "2,000 product descriptions/month",
      "300 ads/month",
      "All AI templates",
      "Brand voice customization",
      "Priority support",
    ],
    limits: {
      productDescriptions: 2000,
      ads: 300,
    },
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 34,
    icon: Rocket,
    description: "For high-volume stores",
    features: [
      "5,000 product descriptions/month",
      "Unlimited ads",
      "All AI templates",
      "Brand voice customization",
      "Priority support",
      "API access",
    ],
    limits: {
      productDescriptions: 5000,
      ads: -1,
    },
    popular: false,
  },
];

export function PricingModal({
  isOpen,
  onClose,
  shopId,
  currentPlan,
  usage,
}: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingPlan, setConfirmingPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlanData = PLANS.find((p) => p.id === currentPlan)!;
  const selectedPlanData = confirmingPlan
    ? PLANS.find((p) => p.id === confirmingPlan)
    : null;
  const isUpgrade = selectedPlanData
    ? selectedPlanData.price > currentPlanData.price
    : false;
  const isExistingSubscriber = currentPlan !== "free";

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlan) return;

    // Free plan is only available if user is downgrading from a paid plan
    if (planId === "free" && !isExistingSubscriber) return;

    // Validate shopId before proceeding
    if (!shopId) {
      setError(
        "Unable to identify your shop. Please refresh the page and try again.",
      );
      return;
    }

    // If user is an existing subscriber, show confirmation first
    if (isExistingSubscriber) {
      setConfirmingPlan(planId);
      setError(null);
    } else {
      // New subscriber - go directly to checkout
      processCheckout(planId);
    }
  };

  const handleConfirmChange = () => {
    if (confirmingPlan) {
      processCheckout(confirmingPlan);
    }
  };

  const handleCancelConfirmation = () => {
    setConfirmingPlan(null);
    setError(null);
  };

  const processCheckout = async (planId: string) => {
    setLoading(planId);
    setError(null);

    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          shopId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create checkout");
      }

      // Check if subscription was updated directly (existing subscription modified)
      if (data.updated) {
        // Redirect to settings page with success message
        window.location.href = data.redirectUrl;
        return;
      }

      // New subscription - redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Invalid response from server");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  };

  // Confirmation View for existing subscribers
  if (confirmingPlan && selectedPlanData) {
    const priceDifference = selectedPlanData.price - currentPlanData.price;
    const CurrentIcon = currentPlanData.icon;
    const NewIcon = selectedPlanData.icon;
    const isCancellation = confirmingPlan === "free";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleCancelConfirmation}
        />

        {/* Confirmation Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {isCancellation
                ? "Cancel Subscription"
                : `Confirm Plan ${isUpgrade ? "Upgrade" : "Change"}`}
            </h2>
            <button
              onClick={handleCancelConfirmation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Plan Comparison */}
            <div className="flex items-center justify-between gap-4">
              {/* Current Plan */}
              <div className="flex-1 p-4 bg-gray-50 rounded-xl text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gray-200 flex items-center justify-center">
                  <CurrentIcon className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">Current</p>
                <p className="font-semibold text-gray-900">
                  {currentPlanData.name}
                </p>
                <p className="text-lg font-bold text-gray-700">
                  ${currentPlanData.price}/mo
                </p>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>

              {/* New Plan */}
              <div
                className={`flex-1 p-4 rounded-xl text-center ${
                  isCancellation
                    ? "bg-red-50 border-2 border-red-200"
                    : isUpgrade
                      ? "bg-blue-50 border-2 border-blue-200"
                      : "bg-orange-50 border-2 border-orange-200"
                }`}
              >
                <div
                  className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                    isCancellation
                      ? "bg-red-200"
                      : isUpgrade
                        ? "bg-blue-200"
                        : "bg-orange-200"
                  }`}
                >
                  <NewIcon
                    className={`w-6 h-6 ${
                      isCancellation
                        ? "text-red-600"
                        : isUpgrade
                          ? "text-blue-600"
                          : "text-orange-600"
                    }`}
                  />
                </div>
                <p className="text-sm text-gray-500">New</p>
                <p className="font-semibold text-gray-900">
                  {selectedPlanData.name}
                </p>
                <p
                  className={`text-lg font-bold ${
                    isCancellation
                      ? "text-red-600"
                      : isUpgrade
                        ? "text-blue-600"
                        : "text-orange-600"
                  }`}
                >
                  {isCancellation ? "Free" : `$${selectedPlanData.price}/mo`}
                </p>
              </div>
            </div>

            {/* Billing Info */}
            <div
              className={`p-4 rounded-lg ${
                isCancellation
                  ? "bg-red-50"
                  : isUpgrade
                    ? "bg-blue-50"
                    : "bg-orange-50"
              }`}
            >
              <h4 className="font-medium text-gray-900 mb-2">
                {isCancellation ? "What Happens Next" : "Billing Summary"}
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {isCancellation ? (
                  <>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Your subscription will be{" "}
                        <strong>
                          cancelled at the end of your current billing period
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>
                        You&apos;ll <strong>keep access</strong> to premium
                        features until then
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>
                        After that, you&apos;ll be moved to the{" "}
                        <strong>Free plan</strong> with limited features
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        You can <strong>resubscribe anytime</strong> to regain
                        premium access
                      </span>
                    </li>
                  </>
                ) : isUpgrade ? (
                  <>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        You&apos;ll be charged a prorated amount of{" "}
                        <strong>${priceDifference}</strong> for the remainder of
                        your billing cycle
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Your new features will be available immediately
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Future billing will be{" "}
                        <strong>${selectedPlanData.price}/month</strong>
                      </span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>
                        You&apos;ll receive a prorated credit of{" "}
                        <strong>${Math.abs(priceDifference)}</strong> on your
                        next invoice
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Your limits will be reduced immediately</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Future billing will be{" "}
                        <strong>${selectedPlanData.price}/month</strong>
                      </span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Limit Changes */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Limit Changes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product Descriptions</span>
                  <span
                    className={
                      isCancellation
                        ? "text-red-600 font-medium"
                        : isUpgrade
                          ? "text-green-600 font-medium"
                          : "text-orange-600 font-medium"
                    }
                  >
                    {currentPlanData.limits.productDescriptions.toLocaleString()}{" "}
                    →{" "}
                    {selectedPlanData.limits.productDescriptions.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ads</span>
                  <span
                    className={
                      isCancellation
                        ? "text-red-600 font-medium"
                        : isUpgrade
                          ? "text-green-600 font-medium"
                          : "text-orange-600 font-medium"
                    }
                  >
                    {currentPlanData.limits.ads === -1
                      ? "Unlimited"
                      : currentPlanData.limits.ads.toLocaleString()}{" "}
                    →{" "}
                    {selectedPlanData.limits.ads === -1
                      ? "Unlimited"
                      : selectedPlanData.limits.ads.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancelConfirmation}
              disabled={loading !== null}
            >
              {isCancellation ? "Keep Subscription" : "Cancel"}
            </Button>
            <Button
              className={`flex-1 ${
                isCancellation
                  ? "bg-red-600 hover:bg-red-700"
                  : isUpgrade
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-orange-600 hover:bg-orange-700"
              } text-white`}
              onClick={handleConfirmChange}
              disabled={loading !== null}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isCancellation ? (
                "Cancel Subscription"
              ) : (
                `Confirm ${isUpgrade ? "Upgrade" : "Change"}`
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Plan Selection View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Choose Your Plan
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Select the plan that best fits your needs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-6 transition-all ${
                  plan.popular
                    ? "border-blue-500 shadow-lg shadow-blue-100"
                    : "border-gray-200 hover:border-gray-300"
                } ${isCurrentPlan ? "bg-blue-50/50" : "bg-white"}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.popular ? "bg-blue-100" : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        plan.popular ? "text-blue-600" : "text-gray-600"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <Button
                  className={`w-full ${
                    isCurrentPlan
                      ? "bg-gray-100 text-gray-600 cursor-default hover:bg-gray-100"
                      : plan.popular
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : plan.id === "free" && isExistingSubscriber
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : plan.id === "free"
                            ? "bg-gray-100 text-gray-600 cursor-default hover:bg-gray-100"
                            : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                  disabled={
                    isCurrentPlan ||
                    (plan.id === "free" && !isExistingSubscriber) ||
                    loading !== null
                  }
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : plan.id === "free" && isExistingSubscriber ? (
                    "Downgrade to Free"
                  ) : plan.id === "free" ? (
                    "Free Plan"
                  ) : plan.price > currentPlanData.price ? (
                    `Upgrade to ${plan.name}`
                  ) : (
                    `Switch to ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Current Usage (if provided) */}
        {usage && (
          <div className="px-6 pb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-3">Current Usage</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    Product Descriptions
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{
                          width: `${Math.min(100, (usage.productDescriptions.used / usage.productDescriptions.limit) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {usage.productDescriptions.used}/
                      {usage.productDescriptions.limit}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Ads</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{
                          width:
                            usage.ads.limit === -1
                              ? 0
                              : `${Math.min(100, (usage.ads.used / usage.ads.limit) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {usage.ads.used}/
                      {usage.ads.limit === -1 ? "∞" : usage.ads.limit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            All plans include a 14-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
