"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChatInterface } from "@/features/ai-coaches";
import { RefreshCw, AlertCircle } from "lucide-react";
import { COACH_KEYS, CoachKey } from "@/types/ai-coaches";
import { logger } from "@/lib/logger";
import { useOptionalShopContext } from "@/app/stores/[shopId]/ShopContext";

interface PageProps {
  params: Promise<{ coachKey: string }>;
}

export default function CoachChatPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Try to get shop context from ShopProvider (when accessed via /stores/[shopId]/ai-coaches/[coachKey])
  const shopContext = useOptionalShopContext();

  const [shopId, setShopId] = useState<string | null>(
    shopContext?.shopId || null,
  );
  const [shopDomain, setShopDomain] = useState<string | null>(
    shopContext?.shopDomain || null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(!!shopContext);
  const [authLoading, setAuthLoading] = useState(!shopContext);
  const [coachReady, setCoachReady] = useState(false);
  const [conversationStarters, setConversationStarters] = useState<string[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  const coachKey = resolvedParams.coachKey as CoachKey;
  const starterFromUrl = searchParams.get("starter");
  const conversationIdFromUrl = searchParams.get("conversation");

  // Validate coach key
  const isValidCoach = COACH_KEYS.includes(coachKey);

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

  // Load coach details
  useEffect(() => {
    const loadCoach = async () => {
      if (!shopDomain || !isValidCoach) return;

      try {
        const response = await fetch(`/api/ai-coaches/${coachKey}`, {
          headers: {
            Authorization: `Bearer ${shopDomain}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
            setError("AI Coaches require a Pro plan.");
          } else if (data.code === "PROFILE_INCOMPLETE") {
            // Redirect to onboarding - use store-based URL if available
            const onboardingUrl =
              shopId && pathname?.startsWith("/stores/")
                ? `/stores/${shopId}/ai-coaches/onboarding`
                : `/ai-coaches/onboarding?shop=${shopDomain}`;
            router.push(onboardingUrl);
            return;
          } else {
            throw new Error(data.error || "Failed to load coach");
          }
          return;
        }

        if (data.success) {
          setCoachReady(true);
          setConversationStarters(
            data.data.coach.rendered_conversation_starters || [],
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load coach";
        setError(errorMessage);
        logger.error("Failed to load coach:", err as Error, {
          component: "ai-coaches",
        });
      }
    };

    if (shopDomain && isAuthenticated) {
      loadCoach();
    }
  }, [
    shopDomain,
    isAuthenticated,
    coachKey,
    isValidCoach,
    router,
    shopId,
    pathname,
  ]);

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

  const handleConversationCreated = (conversationId: string) => {
    // Update URL with conversation ID for potential refresh handling
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("conversation", conversationId);
    window.history.replaceState({}, "", newUrl.toString());
  };

  // Loading state
  if (authLoading) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "900px" }}>
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

  // Invalid coach key
  if (!isValidCoach) {
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
              Invalid Coach
            </AlertTitle>
            <AlertDescription
              style={{
                fontSize: "14px",
                color: "#991b1b",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              The coach &quot;{coachKey}&quot; does not exist.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Error state
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
              Error
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

  // Loading coach
  if (!coachReady) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "900px" }}>
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
                  Loading coach...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine initial starters - use URL starter if provided, otherwise conversation starters
  const initialStarters = starterFromUrl
    ? [
        decodeURIComponent(starterFromUrl),
        ...conversationStarters.filter(
          (s) => s !== decodeURIComponent(starterFromUrl),
        ),
      ]
    : conversationStarters;

  return (
    <div
      className="w-full flex flex-col items-center"
      style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
    >
      <div className="w-full" style={{ maxWidth: "900px" }}>
        <Card
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          }}
        >
          <ChatInterface
            coachKey={coachKey}
            shopDomain={shopDomain}
            conversationId={conversationIdFromUrl}
            initialStarters={initialStarters}
            onBack={handleBack}
            onConversationCreated={handleConversationCreated}
          />
        </Card>
      </div>
    </div>
  );
}
