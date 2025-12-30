"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BrandProfileForm } from "@/features/ai-coaches";
import {
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { useOptionalShopContext } from "@/app/stores/[shopId]/ShopContext";

export default function CoachOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Try to get shop context from ShopProvider (when accessed via /stores/[shopId]/ai-coaches/onboarding)
  const shopContext = useOptionalShopContext();

  const [shopId, setShopId] = useState<string | null>(
    shopContext?.shopId || null,
  );
  const [shopDomain, setShopDomain] = useState<string | null>(
    shopContext?.shopDomain || null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(!!shopContext);
  const [authLoading, setAuthLoading] = useState(!shopContext);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get shop info from context, URL params, or API
  useEffect(() => {
    // If we have shop context from provider, we're already authenticated
    if (shopContext) {
      setShopId(shopContext.shopId);
      setShopDomain(shopContext.shopDomain);
      setIsAuthenticated(true);
      setAuthLoading(false);
      return;
    }

    const initShop = async () => {
      const shop = searchParams.get("shop");

      if (shop) {
        setShopDomain(shop);
        setIsAuthenticated(true);
        setAuthLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/shop/me");
        if (res.ok) {
          const data = await res.json();
          if (data.domain) {
            setShopDomain(data.domain);
            setIsAuthenticated(true);
          }
          if (data.id) {
            setShopId(data.id);
          }
        }
      } catch (e) {
        logger.error("Failed to fetch shop:", e as Error, {
          component: "ai-coaches",
        });
      }

      setAuthLoading(false);
    };

    initShop();
  }, [shopContext, searchParams]);

  // Check premium access
  useEffect(() => {
    const checkAccess = async () => {
      if (!shopDomain) return;

      try {
        const response = await fetch("/api/ai-coaches/brand-profile", {
          headers: {
            Authorization: `Bearer ${shopDomain}`,
          },
        });

        if (response.status === 403) {
          setError(
            "AI Coaches require a Professional or Enterprise plan. Please upgrade to access this feature.",
          );
        }
      } catch (err) {
        logger.error("Failed to check access:", err as Error, {
          component: "ai-coaches",
        });
      }
    };

    if (shopDomain && isAuthenticated) {
      checkAccess();
    }
  }, [shopDomain, isAuthenticated]);

  // Build URL with store path or legacy query param
  const buildUrl = (path: string) => {
    if (shopId && pathname?.startsWith("/stores/")) {
      return `/stores/${shopId}${path}`;
    }
    return `${path}${shopDomain ? `?shop=${shopDomain}` : ""}`;
  };

  const handleBack = () => {
    router.push(buildUrl("/ai-coaches"));
  };

  const handleComplete = () => {
    setSetupComplete(true);
  };

  // Loading state
  if (authLoading) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent
              className="flex items-center justify-center"
              style={{ padding: "80px" }}
            >
              <div
                className="flex flex-col items-center"
                style={{ gap: "16px" }}
              >
                <RefreshCw
                  className="h-8 w-8 animate-spin"
                  style={{ color: "#0066cc" }}
                />
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Loading...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !shopDomain) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <Alert
            variant="destructive"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <AlertCircle className="h-4 w-4" style={{ color: "#991b1b" }} />
            <AlertTitle
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#991b1b",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                marginBottom: "4px",
              }}
            >
              Authentication Required
            </AlertTitle>
            <AlertDescription
              style={{
                fontSize: "14px",
                color: "#991b1b",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Please access this page from your Shopify admin.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Error state (premium required)
  if (error) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <Alert
            variant="destructive"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <AlertCircle className="h-4 w-4" style={{ color: "#991b1b" }} />
            <AlertTitle
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#991b1b",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                marginBottom: "4px",
              }}
            >
              Upgrade Required
            </AlertTitle>
            <AlertDescription
              style={{
                fontSize: "14px",
                color: "#991b1b",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Setup complete state
  if (setupComplete) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "600px" }}>
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent
              className="flex flex-col items-center"
              style={{ padding: "48px" }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                }}
              >
                <CheckCircle
                  className="h-10 w-10"
                  style={{ color: "#166534" }}
                />
              </div>

              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "8px",
                  textAlign: "center",
                }}
              >
                Coaches Activated!
              </h2>

              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "32px",
                  textAlign: "center",
                  maxWidth: "400px",
                }}
              >
                Your AI coaches have been personalized with your brand profile.
                They&apos;re ready to help with decisions, promotions,
                inventory, customer service, and operations.
              </p>

              <Button
                onClick={handleBack}
                style={{
                  background: "#0066cc",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "12px 32px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  border: "none",
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Using Coaches
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col items-center"
      style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
    >
      <div className="w-full" style={{ maxWidth: "800px" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <Button
            variant="ghost"
            onClick={handleBack}
            style={{
              padding: "8px",
              marginBottom: "16px",
              color: "#6b7280",
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Coaches
          </Button>

          <div
            className="flex items-center"
            style={{ gap: "12px", marginBottom: "8px" }}
          >
            <Sparkles className="h-8 w-8" style={{ color: "#0066cc" }} />
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                margin: 0,
              }}
            >
              Coach Setup
            </h1>
          </div>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Personalize your AI coaches by providing information about your
            business
          </p>
        </div>

        {/* Info Card */}
        <Alert
          style={{
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "#0369a1" }} />
          <AlertTitle
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#0369a1",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              marginBottom: "4px",
            }}
          >
            How It Works
          </AlertTitle>
          <AlertDescription
            style={{
              fontSize: "13px",
              color: "#0369a1",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            This information helps your AI coaches give personalized advice that
            matches your business style, policies, and goals. The more complete
            your profile, the better your coaches will perform.
          </AlertDescription>
        </Alert>

        {/* Form */}
        <BrandProfileForm
          shopDomain={shopDomain}
          onComplete={handleComplete}
          onProfileUpdate={() => {
            // Optionally refresh data
          }}
          onClose={() => {
            // Close action - just dismiss the success state, stay on page
            // The form component handles resetting the success state
          }}
          onReturnToCoaches={() => {
            router.push(buildUrl("/ai-coaches"));
          }}
        />
      </div>
    </div>
  );
}
