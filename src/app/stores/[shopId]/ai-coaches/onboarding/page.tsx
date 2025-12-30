"use client";

/**
 * /stores/[shopId]/ai-coaches/onboarding
 *
 * AI Coaches brand profile onboarding using UUID-based routing.
 * Shop context is provided by ShopProvider in the layout.
 */

import { Suspense } from "react";
import { Loader2, Bot } from "lucide-react";
import OnboardingPage from "@/app/ai-coaches/onboarding/page";

export const dynamic = "force-dynamic";

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0066cc 0%, #0052a3 100%)",
          }}
        >
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-3">
          <Loader2
            className="h-5 w-5 animate-spin"
            style={{ color: "#0066cc" }}
          />
          <p className="text-sm text-gray-500">Loading Profile Setup...</p>
        </div>
      </div>
    </div>
  );
}

export default function StoreOnboardingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OnboardingPage />
    </Suspense>
  );
}
