"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Loader2,
  Zap,
  FileText,
  Languages,
  Sparkles,
  MessageSquare,
  Image,
  Search,
  Settings,
  Headphones,
  Video,
  Check,
  Crown,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type BillingInterval = "monthly" | "annual";

interface PlanFeature {
  icon: React.ElementType;
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  credits: string;
  bulkGeneration: string;
  features: PlanFeature[];
  highlighted?: boolean;
  badge?: string;
}

// Plans matching the existing system: free, starter, pro
// Optimized for 70%+ profit margin based on AI costs:
// - Product descriptions: $0.0008/each (gpt-4o-mini vision)
// - Ads: $0.002/each (gpt-4o-mini)
// - Images: $0.01/each (gpt-image-1 standard)
const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 19,
    annualPrice: 190,
    credits: "2,500 Product Descriptions",
    bulkGeneration: "500 Ads & Social Posts • 200 AI Images",
    features: [
      { icon: FileText, text: "AI Generated Descriptions, Titles, & Meta", included: true },
      { icon: Languages, text: "Multi-Language Support", included: true },
      { icon: Languages, text: "Translate to any language", included: true },
      { icon: Settings, text: "Custom Instructions", included: true },
      { icon: Image, text: "AI Image Alt Text Generator", included: true },
      { icon: Headphones, text: "Standard Email Support", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 34,
    annualPrice: 340,
    credits: "4,500 Product Descriptions",
    bulkGeneration: "1,000 Ads & Social Posts • 400 AI Images",
    highlighted: true,
    badge: "Most Popular",
    features: [
      { icon: FileText, text: "AI Generated Descriptions, Titles, & Meta", included: true },
      { icon: Languages, text: "Multi-Language Support", included: true },
      { icon: Languages, text: "Translate to any language", included: true },
      { icon: Settings, text: "Advanced Custom Instructions", included: true },
      { icon: Image, text: "AI Image Generation (400/month)", included: true },
      { icon: MessageSquare, text: "Generate Ads, Captions & Social Content", included: true },
      { icon: Image, text: "Generate using product images", included: true },
      { icon: Search, text: "Generate descriptions with web search", included: true },
      { icon: FileText, text: "Generate using product meta data", included: true },
      { icon: Sparkles, text: "Formatted Descriptions (custom formats)", included: true },
      { icon: Video, text: "Priority Video/Voice Support", included: true },
    ],
  },
];

// Plan tier icons with colors
function PlanIcon({ plan }: { plan: string }) {
  const styles: Record<string, { bg: string; ring: string }> = {
    free: { bg: "bg-gray-100", ring: "ring-gray-300" },
    starter: { bg: "bg-blue-100", ring: "ring-blue-300" },
    pro: { bg: "bg-amber-400", ring: "ring-amber-500" },
  };

  const style = styles[plan] || styles.free;

  return (
    <div className={`w-12 h-12 rounded-full ${style.bg} ring-4 ${style.ring} flex items-center justify-center`}>
      {plan === "pro" ? (
        <Crown className="w-6 h-6 text-amber-700" />
      ) : plan === "starter" ? (
        <Zap className="w-6 h-6 text-blue-600" />
      ) : (
        <Gift className="w-6 h-6 text-gray-500" />
      )}
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState<string | null>(null);

  useEffect(() => {
    const shop = searchParams?.get("shop");
    if (shop) {
      setShopDomain(shop);
    }
  }, [searchParams]);

  const handleSelectPlan = async (planId: string) => {
    if (!shopDomain) {
      console.error("No shop domain found");
      return;
    }

    setIsLoading(true);
    setSelectedPlan(planId);

    try {
      // Call API to handle plan selection
      const response = await fetch("/api/billing/select-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          billingInterval,
          shopDomain,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.redirectUrl) {
          // Redirect to Shopify's pricing page for paid plans
          window.location.href = data.redirectUrl;
        } else if (data.dashboardUrl) {
          // Free trial - redirect to dashboard
          router.push(data.dashboardUrl);
        }
      } else {
        console.error("Failed to select plan:", data.error);
        setIsLoading(false);
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error("Error selecting plan:", error);
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleFreeTrial = async () => {
    if (!shopDomain) {
      console.error("No shop domain found");
      return;
    }

    setIsLoading(true);
    setSelectedPlan("free");

    try {
      const response = await fetch("/api/billing/select-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: "free",
          shopDomain,
        }),
      });

      const data = await response.json();

      if (data.success && data.dashboardUrl) {
        router.push(data.dashboardUrl);
      } else {
        console.error("Failed to start free trial:", data.error);
        setIsLoading(false);
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error("Error starting free trial:", error);
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  if (!shopDomain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">Thunder Text</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
          <p className="text-gray-600">Select a plan to get started with AI-powered product descriptions</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingInterval === "monthly"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                billingInterval === "annual"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Check className="w-4 h-4" />
              Annual (Save 17%)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-all ${
                plan.highlighted ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100"
              }`}
            >
              {/* Plan Header */}
              <div className="flex items-start gap-4 mb-6">
                <PlanIcon plan={plan.id} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                    {plan.badge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        <Sparkles className="w-3 h-3" />
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="text-3xl font-bold text-gray-900">
                      ${billingInterval === "monthly" ? plan.monthlyPrice : Math.round(plan.annualPrice / 12)}
                    </span>
                    <span className="text-gray-500">/ month</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    ${billingInterval === "monthly" ? plan.monthlyPrice * 12 : plan.annualPrice}/year
                  </p>
                </div>
              </div>

              {/* Select Button */}
              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isLoading}
                className={`w-full mb-6 ${
                  plan.highlighted
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
              >
                {isLoading && selectedPlan === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Get Started with {plan.name}
              </Button>

              {/* Credits */}
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{plan.credits}</span>
                  <Check className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{plan.bulkGeneration}</span>
                  <Check className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 border-t pt-4">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <feature.icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature.text}</span>
                    <Check className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Free Trial Option */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
            <div className="flex items-center gap-4">
              <PlanIcon plan="free" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Free Trial</h3>
                <p className="text-2xl font-bold text-gray-900">$0<span className="text-base font-normal text-gray-500">/ 14 days</span></p>
              </div>
              <Button
                onClick={handleFreeTrial}
                disabled={isLoading}
                variant="outline"
                className="border-gray-300"
              >
                {isLoading && selectedPlan === "free" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Start Free Trial
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500 text-center">
              14-day free trial with full access to all features. No credit card required.
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-400 mt-8">
          All plans include a 14-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
