"use client";

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useShopContext } from "../ShopContext";
import { useShopStatus } from "@/hooks/useShopStatus";
import {
  Loader2,
  Sparkles,
  FileText,
  Megaphone,
  Zap,
  Clock,
  DollarSign,
  TrendingUp,
  PenTool,
  ChevronRight,
  Crown,
  ArrowRight,
  Gift,
  CheckCircle,
  HourglassIcon,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HotTakesCard } from "@/app/components/HotTakesCard";

export const dynamic = "force-dynamic";

// Subscription info interface
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
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  color: "blue" | "green" | "amber" | "purple";
}) {
  const colorStyles = {
    blue: {
      iconBg: "rgba(0, 102, 204, 0.1)",
      iconColor: "#0066cc",
      valueColor: "#0066cc",
    },
    green: {
      iconBg: "rgba(34, 197, 94, 0.1)",
      iconColor: "#16a34a",
      valueColor: "#16a34a",
    },
    amber: {
      iconBg: "rgba(245, 158, 11, 0.1)",
      iconColor: "#d97706",
      valueColor: "#d97706",
    },
    purple: {
      iconBg: "rgba(139, 92, 246, 0.1)",
      iconColor: "#7c3aed",
      valueColor: "#7c3aed",
    },
  };

  // eslint-disable-next-line security/detect-object-injection
  const styles = colorStyles[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p
            className="text-2xl font-bold"
            style={{ color: styles.valueColor }}
          >
            {value}
          </p>
          <p className="text-xs text-gray-400 mt-1">{subtext}</p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: styles.iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: styles.iconColor }} />
        </div>
      </div>
    </div>
  );
}

// Free plan feature limits
const FREE_PLAN_LIMITS = {
  productDescriptions: 15,
  adDescriptions: 10,
};

// Usage stats interface
interface UsageStats {
  productDescriptions: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  ads: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  plan: string;
  periodStart: string;
  periodEnd: string;
}

// Free Plan Usage Card Component
function PlanUsageCard({
  shopId,
  usage,
}: {
  shopId: string;
  subscription: SubscriptionInfo | null;
  usage?: UsageStats;
}) {
  const productDescUsed = usage?.productDescriptions.used ?? 0;
  const adDescUsed = usage?.ads.used ?? 0;
  const productDescTotal =
    usage?.productDescriptions.limit ?? FREE_PLAN_LIMITS.productDescriptions;
  const adDescTotal = usage?.ads.limit ?? FREE_PLAN_LIMITS.adDescriptions;
  const productPercent = usage?.productDescriptions.percentUsed ?? 0;
  const adPercent = usage?.ads.percentUsed ?? 0;

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg"
      style={{
        background:
          "linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 50%, #0ea5e9 100%)",
        border: "2px solid #0ea5e9",
      }}
    >
      <div className="p-5 bg-white/90 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-sky-400 to-sky-600">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sky-900">Free Plan</h3>
              <p className="text-xs text-sky-700">Limited features included</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800 border border-sky-300">
            Free
          </span>
        </div>

        {/* Product Descriptions Usage */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-sky-900">
              Product Descriptions
            </span>
            <span className="text-sm font-bold text-sky-800">
              {productDescUsed} / {productDescTotal}
            </span>
          </div>
          <div className="w-full h-2.5 bg-sky-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${productPercent}%`,
                background:
                  productPercent > 80
                    ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                    : "linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%)",
              }}
            />
          </div>
        </div>

        {/* Ad Descriptions Usage */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-sky-900">
              Ad Descriptions
            </span>
            <span className="text-sm font-bold text-sky-800">
              {adDescUsed} / {adDescTotal}
            </span>
          </div>
          <div className="w-full h-2.5 bg-sky-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${adPercent}%`,
                background:
                  adPercent > 80
                    ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                    : "linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%)",
              }}
            />
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-white font-medium text-sm">
                Upgrade for unlimited power
              </p>
              <p className="text-amber-100 text-xs mt-0.5">
                Get 5,000+ credits/month + 14-day free trial
              </p>
            </div>
            <Link href={`/stores/${shopId}/settings/billing`}>
              <Button
                size="sm"
                className="bg-white hover:bg-gray-100 text-amber-600 font-medium shadow-md"
              >
                <Crown className="w-4 h-4 mr-1" />
                Upgrade
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Active Plan Card
function ActivePlanCard({
  shopId,
  subscription,
  usage,
}: {
  shopId: string;
  subscription: SubscriptionInfo;
  usage?: UsageStats;
}) {
  const planName = subscription.plan === "pro" ? "Pro" : "Starter";
  const isPro = subscription.plan === "pro";

  const productUsed = usage?.productDescriptions.used ?? 0;
  const productLimit =
    usage?.productDescriptions.limit ?? (isPro ? 5000 : 2000);
  const adsUsed = usage?.ads.used ?? 0;
  const adsLimit = usage?.ads.limit ?? (isPro ? 1000 : 300);
  const productPercent = usage?.productDescriptions.percentUsed ?? 0;
  const adsPercent = usage?.ads.percentUsed ?? 0;
  const maxPercent = Math.max(productPercent, adsPercent);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg"
      style={{
        background: isPro
          ? "linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)"
          : "linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #3b82f6 100%)",
        border: isPro ? "2px solid #f59e0b" : "2px solid #3b82f6",
      }}
    >
      <div className="p-5 bg-white/90 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isPro
                  ? "bg-gradient-to-br from-amber-400 to-amber-600"
                  : "bg-gradient-to-br from-blue-400 to-blue-600"
              }`}
            >
              {isPro ? (
                <Crown className="w-5 h-5 text-white" />
              ) : (
                <Zap className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3
                className={`font-semibold ${isPro ? "text-amber-900" : "text-blue-900"}`}
              >
                {planName} Plan
              </h3>
              <p
                className={`text-xs ${isPro ? "text-amber-700" : "text-blue-700"}`}
              >
                {subscription.price?.interval === "annual"
                  ? "Annual"
                  : "Monthly"}{" "}
                billing
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              isPro
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "bg-blue-100 text-blue-800 border border-blue-300"
            }`}
          >
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        </div>

        {/* Product Descriptions Usage */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-sm font-medium ${isPro ? "text-amber-900" : "text-blue-900"}`}
            >
              Product Descriptions
            </span>
            <span
              className={`text-sm font-bold ${isPro ? "text-amber-800" : "text-blue-800"}`}
            >
              {productUsed.toLocaleString()} / {productLimit.toLocaleString()}
            </span>
          </div>
          <div
            className={`w-full h-2.5 rounded-full overflow-hidden ${isPro ? "bg-amber-200" : "bg-blue-200"}`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(productPercent, 100)}%`,
                background:
                  productPercent > 80
                    ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                    : isPro
                      ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"
                      : "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)",
              }}
            />
          </div>
        </div>

        {/* Ads Usage */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-sm font-medium ${isPro ? "text-amber-900" : "text-blue-900"}`}
            >
              Ads
            </span>
            <span
              className={`text-sm font-bold ${isPro ? "text-amber-800" : "text-blue-800"}`}
            >
              {adsUsed.toLocaleString()} / {adsLimit.toLocaleString()}
            </span>
          </div>
          <div
            className={`w-full h-2.5 rounded-full overflow-hidden ${isPro ? "bg-amber-200" : "bg-blue-200"}`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(adsPercent, 100)}%`,
                background:
                  adsPercent > 80
                    ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                    : isPro
                      ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"
                      : "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p
              className={`text-xs ${isPro ? "text-amber-700" : "text-blue-700"}`}
            >
              {maxPercent}% used this month
            </p>
            {subscription.currentPeriodEnd && (
              <p
                className={`text-xs ${isPro ? "text-amber-700" : "text-blue-700"}`}
              >
                Renews {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
        </div>

        {/* Upgrade CTA for Starter plan at 90%+ */}
        {!isPro && maxPercent >= 90 && (
          <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg mb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-white font-medium text-sm">
                  {maxPercent >= 100
                    ? "You've reached your limit!"
                    : "Running low on usage!"}
                </p>
                <p className="text-amber-100 text-xs mt-0.5">
                  Upgrade to Pro for 5,000 products & 1,000 ads/month
                </p>
              </div>
              <Link href={`/stores/${shopId}/settings/billing`}>
                <Button
                  size="sm"
                  className="bg-white hover:bg-gray-100 text-amber-600 font-medium shadow-md"
                >
                  <Crown className="w-4 h-4 mr-1" />
                  Upgrade
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Manage Plan Link */}
        <div
          className={`p-3 rounded-lg ${isPro ? "bg-amber-50" : "bg-blue-50"}`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-sm ${isPro ? "text-amber-800" : "text-blue-800"}`}
            >
              {usage?.productDescriptions.remaining.toLocaleString() ?? 0}{" "}
              products remaining
            </p>
            <Link href={`/stores/${shopId}/settings/billing`}>
              <Button
                size="sm"
                variant="ghost"
                className={
                  isPro
                    ? "text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                    : "text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                }
              >
                Manage Plan
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pending Plan Card - for subscriptions awaiting activation
function PendingPlanCard({
  shopId,
  subscription,
}: {
  shopId: string;
  subscription: SubscriptionInfo;
}) {
  const planName = subscription.plan === "pro" ? "Pro" : "Starter";
  const isPro = subscription.plan === "pro";

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg"
      style={{
        background: isPro
          ? "linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)"
          : "linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #3b82f6 100%)",
        border: isPro ? "2px solid #f59e0b" : "2px solid #3b82f6",
      }}
    >
      <div className="p-5 bg-white/90 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isPro
                  ? "bg-gradient-to-br from-amber-400 to-amber-600"
                  : "bg-gradient-to-br from-blue-400 to-blue-600"
              }`}
            >
              {isPro ? (
                <Crown className="w-5 h-5 text-white" />
              ) : (
                <Zap className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3
                className={`font-semibold ${isPro ? "text-amber-900" : "text-blue-900"}`}
              >
                {planName} Plan
              </h3>
              <p
                className={`text-xs ${isPro ? "text-amber-700" : "text-blue-700"}`}
              >
                Subscription pending
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
            <HourglassIcon className="w-3 h-3" />
            Pending
          </span>
        </div>

        {/* Pending Status Message */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <HourglassIcon className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">
                Awaiting activation
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Your {planName} subscription is being processed. This usually
                takes a few moments. If you just completed checkout, please
                refresh the page.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => window.location.reload()}
            size="sm"
            className={
              isPro
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }
          >
            <Loader2 className="w-3 h-3 mr-1" />
            Refresh Status
          </Button>
          <Link href={`/stores/${shopId}/settings/billing`}>
            <Button
              size="sm"
              variant="outline"
              className={
                isPro
                  ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                  : "border-blue-300 text-blue-700 hover:bg-blue-50"
              }
            >
              View Billing
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Cancelled Plan Card - for subscriptions that have been cancelled
function CancelledPlanCard({
  shopId,
  subscription,
}: {
  shopId: string;
  subscription: SubscriptionInfo;
}) {
  const planName = subscription.plan === "pro" ? "Pro" : "Starter";
  const isPro = subscription.plan === "pro";

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg"
      style={{
        background:
          "linear-gradient(135deg, #fee2e2 0%, #fca5a5 50%, #ef4444 100%)",
        border: "2px solid #ef4444",
      }}
    >
      <div className="p-5 bg-white/90 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isPro
                  ? "bg-gradient-to-br from-amber-400 to-amber-600"
                  : "bg-gradient-to-br from-blue-400 to-blue-600"
              }`}
            >
              {isPro ? (
                <Crown className="w-5 h-5 text-white" />
              ) : (
                <Zap className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{planName} Plan</h3>
              <p className="text-xs text-gray-500">Subscription cancelled</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        </div>

        {/* Cancelled Status Message */}
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-900">
                Subscription Cancelled
              </p>
              <p className="text-xs text-red-700 mt-1">
                Your {planName} subscription has been cancelled. You&apos;re now
                on the Free plan with limited features. Resubscribe anytime to
                restore full access.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href={`/stores/${shopId}/settings/billing`}>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Zap className="w-3 h-3 mr-1" />
              Resubscribe
            </Button>
          </Link>
          <Link href={`/stores/${shopId}/settings/billing`}>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              View Billing
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Feature Tile Component
function FeatureTile({
  icon: Icon,
  title,
  description,
  href,
  variant = "default",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  variant?: "default" | "primary";
}) {
  const isPrimary = variant === "primary";

  return (
    <Link
      href={href}
      className={`block w-full text-left p-5 rounded-xl border transition-all group ${
        isPrimary
          ? "bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 hover:from-blue-700 hover:to-blue-800"
          : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isPrimary
              ? "bg-white/20"
              : "bg-gradient-to-br from-blue-50 to-blue-100"
          }`}
        >
          <Icon
            className={`w-6 h-6 ${isPrimary ? "text-white" : "text-blue-600"}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3
              className={`font-semibold ${
                isPrimary ? "text-white" : "text-gray-900"
              }`}
            >
              {title}
            </h3>
            <ChevronRight
              className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                isPrimary ? "text-white/70" : "text-gray-400"
              }`}
            />
          </div>
          <p
            className={`text-sm mt-1 ${
              isPrimary ? "text-white/80" : "text-gray-500"
            }`}
          >
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Usage Limit Banner
function UsageLimitBanner({
  shopId,
  usage,
  currentPlan,
}: {
  shopId: string;
  usage: UsageStats;
  currentPlan: string;
}) {
  const productPercent = usage.productDescriptions.percentUsed;
  const adPercent = usage.ads.percentUsed;
  const maxPercent = Math.max(productPercent, adPercent);

  if (maxPercent < 90 || currentPlan === "pro") {
    return null;
  }

  const isAtLimit = maxPercent >= 100;
  const limitType =
    productPercent >= adPercent ? "product descriptions" : "ads";
  const nextPlan = currentPlan === "free" ? "Starter" : "Pro";
  const nextPlanLimit =
    currentPlan === "free"
      ? productPercent >= adPercent
        ? "2,000"
        : "300"
      : productPercent >= adPercent
        ? "5,000"
        : "1,000";

  return (
    <div
      className={`rounded-xl p-4 mb-6 border-2 ${
        isAtLimit
          ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-300"
          : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAtLimit ? "bg-red-100" : "bg-amber-100"
            }`}
          >
            {isAtLimit ? (
              <TrendingUp
                className={`w-5 h-5 ${isAtLimit ? "text-red-600" : "text-amber-600"}`}
              />
            ) : (
              <Zap
                className={`w-5 h-5 ${isAtLimit ? "text-red-600" : "text-amber-600"}`}
              />
            )}
          </div>
          <div>
            <p
              className={`font-semibold ${isAtLimit ? "text-red-800" : "text-amber-800"}`}
            >
              {isAtLimit
                ? `You've reached your ${limitType} limit!`
                : `You're at ${maxPercent}% of your ${limitType} limit`}
            </p>
            <p
              className={`text-sm ${isAtLimit ? "text-red-600" : "text-amber-600"}`}
            >
              Upgrade to {nextPlan} for {nextPlanLimit} {limitType}/month
            </p>
          </div>
        </div>
        <Link href={`/stores/${shopId}/settings/billing`}>
          <Button
            className={`${
              isAtLimit
                ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
            } text-white font-medium shadow-md`}
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Stats interface
interface DashboardStats {
  productsGenerated: number;
  adsCreated: number;
  timeSavedMinutes: number;
  timeSavedDisplay: string;
  estimatedSavings: number;
  usage?: UsageStats;
}

function DashboardContent() {
  const { shopId, shopDomain } = useShopContext();
  const { data: _session, status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null,
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    productsGenerated: 0,
    adsCreated: 0,
    timeSavedMinutes: 0,
    timeSavedDisplay: "0 min",
    estimatedSavings: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Use shop domain for display, fall back to shopId
  const shop = shopDomain || shopId;

  // Check if shop is still connected to Shopify
  useShopStatus({
    shop: shopDomain || undefined,
    redirectOnDisconnect: !!shopDomain,
  });

  const storeName = shopDomain
    ? decodeURIComponent(shopDomain).replace(".myshopify.com", "")
    : "Your Store";

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!shop) {
        setSubscriptionLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/billing/status?shop=${encodeURIComponent(shop)}`,
        );
        const data = await response.json();

        if (data.success && data.subscription) {
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, [shop]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!shop) {
        setStatsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/shop/stats?shop=${encodeURIComponent(shop)}`,
        );
        const data = await response.json();

        if (data.success && data.data) {
          setStats({
            productsGenerated: data.data.productsGenerated || 0,
            adsCreated: data.data.adsCreated || 0,
            timeSavedMinutes: data.data.timeSavedMinutes || 0,
            timeSavedDisplay: data.data.timeSavedDisplay || "0 min",
            estimatedSavings: data.data.estimatedSavings || 0,
            usage: data.data.usage || undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [shop]);

  // Determine if user is on a paid plan
  const isPaidPlan =
    subscription?.plan === "starter" || subscription?.plan === "pro";
  const isActivePaid = isPaidPlan && subscription?.status === "active";
  const isPendingPaid = isPaidPlan && subscription?.status === "pending";
  const isCancelledPaid = isPaidPlan && subscription?.status === "cancelled";

  // Show loading while session is being fetched
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
            }}
          >
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2
              className="h-5 w-5 animate-spin"
              style={{ color: "#0066cc" }}
            />
            <p className="text-sm text-gray-500">Loading Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // No shop state - only show after session is loaded
  if (!shop) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background:
            "linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)",
        }}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Thunder Text</span>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(0, 102, 204, 0.1)" }}
              >
                <Sparkles className="w-8 h-8" style={{ color: "#0066cc" }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Authentication Required
              </h1>
              <p className="text-gray-500 mb-6">
                Please install Thunder Text from your Shopify admin panel to
                access the dashboard.
              </p>
              <Link href="/">
                <Button
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                    border: "none",
                  }}
                >
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {storeName}
            </h1>
            <p className="text-gray-500 mt-1">
              Create compelling product descriptions and ads with AI
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={FileText}
            label="Products Generated"
            value={statsLoading ? "..." : stats.productsGenerated.toString()}
            subtext="this month"
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Time Saved"
            value={statsLoading ? "..." : stats.timeSavedDisplay}
            subtext="vs. manual writing"
            color="green"
          />
          <StatCard
            icon={DollarSign}
            label="Estimated Savings"
            value={
              statsLoading
                ? "..."
                : `$${stats.estimatedSavings.toLocaleString()}`
            }
            subtext="Based on avg. copywriter rate"
            color="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="Ads Created"
            value={statsLoading ? "..." : stats.adsCreated.toString()}
            subtext="this month"
            color="purple"
          />
        </div>

        {/* Usage Limit Warning Banner */}
        {!statsLoading && stats.usage && (
          <UsageLimitBanner
            shopId={shopId}
            usage={stats.usage}
            currentPlan={stats.usage.plan}
          />
        )}

        {/* Hot Takes - Full Width */}
        <div className="mb-8">
          <HotTakesCard />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <FeatureTile
              icon={Sparkles}
              title="Create New Product"
              description="Upload images and generate compelling product descriptions instantly"
              href={`/stores/${shopId}/create-pd`}
              variant="primary"
            />

            <FeatureTile
              icon={PenTool}
              title="Enhance Existing Product"
              description="Improve your current product descriptions with AI optimization"
              href={`/stores/${shopId}/enhance`}
            />

            <FeatureTile
              icon={Megaphone}
              title="Create Social Media Ad"
              description="Generate high-converting ad copy for Facebook, Instagram & more"
              href={`/stores/${shopId}/aie`}
            />
          </div>
        </div>

        {/* Plan Card */}
        {!subscriptionLoading && (
          <div className="mt-8">
            {isActivePaid && subscription ? (
              <ActivePlanCard
                shopId={shopId}
                subscription={subscription}
                usage={stats.usage}
              />
            ) : isPendingPaid && subscription ? (
              <PendingPlanCard shopId={shopId} subscription={subscription} />
            ) : isCancelledPaid && subscription ? (
              <CancelledPlanCard shopId={shopId} subscription={subscription} />
            ) : (
              <PlanUsageCard
                shopId={shopId}
                subscription={subscription}
                usage={stats.usage}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
              }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <Loader2
                className="h-5 w-5 animate-spin"
                style={{ color: "#0066cc" }}
              />
              <p className="text-sm text-gray-500">Loading Dashboard...</p>
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
