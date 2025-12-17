"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useNavigation } from "../hooks/useNavigation";
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
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HotTakesCard } from "../components/HotTakesCard";

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

// Plan config for usage limits
const PLAN_CREDITS: Record<string, number> = {
  free: 0, // Free plan uses feature-based limits, not credits
  starter: 5000,
  pro: 25000,
};

// Free plan feature limits
const FREE_PLAN_LIMITS = {
  productDescriptions: 15,
  adDescriptions: 10,
};

// Free Plan Usage Card Component - Shows free plan limits with upgrade prompt
function PlanUsageCard({
  shop,
}: {
  shop: string;
  subscription: SubscriptionInfo | null;
}) {
  // For now, hardcoded usage - in production this would come from API
  const productDescUsed = 3;
  const adDescUsed = 2;
  const productDescTotal = FREE_PLAN_LIMITS.productDescriptions;
  const adDescTotal = FREE_PLAN_LIMITS.adDescriptions;
  const productPercent = Math.round((productDescUsed / productDescTotal) * 100);
  const adPercent = Math.round((adDescUsed / adDescTotal) * 100);

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
            <Link href={`/settings/billing?shop=${shop}`}>
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

// Active Plan Card - Shows for paid plan users (Starter/Pro)
function ActivePlanCard({
  shop,
  subscription,
}: {
  shop: string;
  subscription: SubscriptionInfo;
}) {
  const planName = subscription.plan === "pro" ? "Pro" : "Starter";
  const isPro = subscription.plan === "pro";
  const creditsTotal = PLAN_CREDITS[subscription.plan] || 5000;
  // For now, hardcoded usage - in production this would come from API
  const creditsUsed = 847;
  const percentUsed = Math.round((creditsUsed / creditsTotal) * 100);

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

        {/* Usage Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-sm font-medium ${isPro ? "text-amber-900" : "text-blue-900"}`}
            >
              Credits Used
            </span>
            <span
              className={`text-sm font-bold ${isPro ? "text-amber-800" : "text-blue-800"}`}
            >
              {creditsUsed.toLocaleString()} / {creditsTotal.toLocaleString()}
            </span>
          </div>
          <div
            className={`w-full h-3 rounded-full overflow-hidden ${isPro ? "bg-amber-200" : "bg-blue-200"}`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentUsed}%`,
                background:
                  percentUsed > 80
                    ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                    : isPro
                      ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"
                      : "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p
              className={`text-xs ${isPro ? "text-amber-700" : "text-blue-700"}`}
            >
              {percentUsed}% used this month
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

        {/* Manage Plan Link */}
        <div
          className={`p-3 rounded-lg ${isPro ? "bg-amber-50" : "bg-blue-50"}`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-sm ${isPro ? "text-amber-800" : "text-blue-800"}`}
            >
              {(creditsTotal - creditsUsed).toLocaleString()} credits remaining
            </p>
            <Link href={`/settings/billing?shop=${shop}`}>
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

// Feature Tile Component
function FeatureTile({
  icon: Icon,
  title,
  description,
  onClick,
  variant = "default",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  variant?: "default" | "primary";
}) {
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-5 rounded-xl border transition-all group ${
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
    </button>
  );
}

// Stats interface
interface DashboardStats {
  productsGenerated: number;
  adsCreated: number;
  timeSavedMinutes: number;
  timeSavedDisplay: string;
  estimatedSavings: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { navigateTo } = useNavigation();
  const { data: session, status } = useSession();
  const [_shopId, setShopId] = useState<string | null>(null);
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

  // Get shop from URL params first, then fallback to session
  const shopFromUrl = searchParams?.get("shop");
  const shopFromSession = session?.user?.shopDomain;
  const shop = shopFromUrl || shopFromSession;

  // Check if shop is still connected to Shopify
  // This will redirect to /shopify-disconnected if the app was uninstalled
  useShopStatus({
    shop: shop || undefined,
    redirectOnDisconnect: !!shop, // Only redirect if we have a shop to check
  });

  const storeName = shop
    ? decodeURIComponent(shop).replace(".myshopify.com", "")
    : "Your Store";

  // Fetch shopId from session
  useEffect(() => {
    if (session?.user?.id) {
      setShopId(session.user.id as string);
    }
  }, [session]);

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
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
                onClick={() => navigateTo("/")}
              >
                Back to Home
              </Button>
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
              onClick={() => navigateTo("/create-pd")}
              variant="primary"
            />

            <FeatureTile
              icon={PenTool}
              title="Enhance Existing Product"
              description="Improve your current product descriptions with AI optimization"
              onClick={() => navigateTo("/enhance")}
            />

            <FeatureTile
              icon={Megaphone}
              title="Create Social Media Ad"
              description="Generate high-converting ad copy for Facebook, Instagram & more"
              onClick={() => navigateTo("/aie")}
            />
          </div>
        </div>

        {/* Plan Card - Shows different card based on subscription status */}
        {!subscriptionLoading && (
          <div className="mt-8">
            {isActivePaid && subscription ? (
              <ActivePlanCard shop={shop} subscription={subscription} />
            ) : (
              <PlanUsageCard shop={shop} subscription={subscription} />
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
