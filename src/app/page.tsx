"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Zap, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Root route handler
 * Determines user type and onboarding status, then redirects accordingly:
 * - Shopify hosted install redirect → /api/auth/shopify (to complete OAuth)
 * - First-time store users → /welcome
 * - Returning store users → /dashboard
 * - Coaches → /coach/login (or /bhb if authenticated)
 */
export default function RootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const determineRoute = async () => {
      try {
        // Get shop parameter from URL
        const shop = searchParams?.get("shop");
        const hmac = searchParams?.get("hmac");
        const timestamp = searchParams?.get("timestamp");
        const host = searchParams?.get("host");

        // SHOPIFY HOSTED INSTALL FLOW DETECTION
        // When Shopify redirects after install via hosted OAuth, it sends these params to application_url
        // We need to kick off proper OAuth to get the access token
        if (shop && hmac && timestamp) {
          console.log("[Root] Detected Shopify install redirect - initiating OAuth flow");
          console.log("[Root] Shop:", shop, "Has HMAC:", !!hmac, "Has Host:", !!host);

          // Redirect to our OAuth initiation endpoint
          // This will generate proper state, store it, and redirect to Shopify OAuth
          // IMPORTANT: Use window.location.href for API routes - router.replace can't handle them
          const normalizedShop = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;
          window.location.href = `/api/auth/shopify?shop=${normalizedShop}`;
          return;
        }

        if (!shop) {
          // No shop parameter - redirect to login page
          console.log("[Root] No shop parameter, redirecting to login");
          router.replace("/auth/login");
          return;
        }

        // Check onboarding status for store users
        const response = await fetch("/api/onboarding/status", {
          headers: {
            Authorization: `Bearer ${shop}`,
          },
        });

        if (!response.ok) {
          // Shop not found or error - redirect to welcome for new setup
          console.log("[Root] Shop not found, redirecting to welcome");
          router.replace(`/welcome?shop=${shop}`);
          return;
        }

        const data = await response.json();

        if (data.success && data.data) {
          const { onboarding_completed, user_type } = data.data;

          if (user_type === "coach") {
            // Coach user - redirect to coach portal
            console.log(
              "[Root] Coach user detected, redirecting to coach login",
            );
            router.replace("/coach/login");
            return;
          }

          // Store user - check onboarding status
          if (onboarding_completed) {
            console.log("[Root] Onboarding complete, redirecting to dashboard");
            router.replace(`/dashboard?shop=${shop}`);
          } else {
            console.log(
              "[Root] Onboarding not complete, redirecting to welcome",
            );
            router.replace(`/welcome?shop=${shop}`);
          }
        } else {
          // Default to welcome for store users
          router.replace(`/welcome?shop=${shop}`);
        }
      } catch (error) {
        console.error("[Root] Error determining route:", error);
        setError("Failed to load. Please try again.");
        setIsLoading(false);
      }
    };

    determineRoute();
  }, [router, searchParams]);

  // Error state
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background:
            "linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)",
        }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
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

          {/* Error Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(220, 38, 38, 0.1)" }}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Something Went Wrong
              </h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)",
      }}
    >
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
            }}
          >
            <Zap className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
          <p className="text-white/80 text-sm">Loading Thunder Text...</p>
        </div>
      </div>
    </div>
  );
}
