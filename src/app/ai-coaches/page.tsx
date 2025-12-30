"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CoachCard } from "@/features/ai-coaches";
import {
  RefreshCw,
  AlertCircle,
  Settings,
  Download,
  Sparkles,
} from "lucide-react";
import type { CoachListItem, CoachKey } from "@/types/ai-coaches";
import { logger } from "@/lib/logger";
import { useOptionalShopContext } from "@/app/stores/[shopId]/ShopContext";

export default function AICoachesPage() {
  const router = useRouter();
  const pathname = usePathname();

  // Try to get shop context from ShopProvider (when accessed via /stores/[shopId]/ai-coaches)
  const shopContext = useOptionalShopContext();

  const [coaches, setCoaches] = useState<CoachListItem[]>([]);
  const [profileComplete, setProfileComplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(
    shopContext?.shopId || null,
  );
  const [shopDomain, setShopDomain] = useState<string | null>(
    shopContext?.shopDomain || null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(!!shopContext);
  const [authLoading, setAuthLoading] = useState(!shopContext);

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
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const shop = params.get("shop");

        if (shop) {
          setShopDomain(shop);
          setIsAuthenticated(true);
          setAuthLoading(false);
          return;
        }
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
  }, [shopContext]);

  // Build the base path for navigation (store-based or legacy)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getBasePath = () => {
    if (shopId && pathname?.startsWith("/stores/")) {
      return `/stores/${shopId}/ai-coaches`;
    }
    return "/ai-coaches";
  };

  // Build URL with shop param for legacy routes
  const buildUrl = (path: string) => {
    if (shopId && pathname?.startsWith("/stores/")) {
      return `/stores/${shopId}${path}`;
    }
    return `${path}${shopDomain ? `?shop=${shopDomain}` : ""}`;
  };

  // Get the shop identifier for API calls
  const shopIdentifier = shopDomain || shopId;

  // Load coaches list
  useEffect(() => {
    const loadCoaches = async () => {
      if (!shopIdentifier) return;

      try {
        const response = await fetch(
          `/api/ai-coaches?shop=${encodeURIComponent(shopIdentifier)}`,
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
            setError(
              "AI Coaches require a Professional or Enterprise plan. Please upgrade to access this feature.",
            );
          } else {
            throw new Error(data.error || "Failed to load coaches");
          }
          return;
        }

        if (data.success) {
          setCoaches(data.data.coaches);
          setProfileComplete(data.data.profile_complete);
          setMissingFields(data.data.missing_fields || []);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load coaches";
        setError(errorMessage);
        logger.error("Failed to load coaches:", err as Error, {
          component: "ai-coaches",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (shopIdentifier && isAuthenticated) {
      loadCoaches();
    }
  }, [shopIdentifier, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !shopIdentifier)) {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, shopIdentifier]);

  // Determine the correct setup route based on which fields are missing
  // Fields from Quick Interview (business-profile): brand_tone, target_customer, words_to_use, words_to_avoid
  // Fields from Coach Onboarding: discount_comfort_level, owner_time_constraint, inventory_size, etc.
  const getSetupRoute = () => {
    const interviewFields = [
      "brand_tone",
      "target_customer",
      "words_to_use",
      "words_to_avoid",
    ];
    const needsInterview = missingFields.some((field) =>
      interviewFields.includes(field),
    );

    if (needsInterview) {
      return "/business-profile";
    }
    return "/ai-coaches/onboarding";
  };

  const handleCoachClick = (coachKey: CoachKey) => {
    const coach = coaches.find((c) => c.coach_key === coachKey);
    if (coach?.is_rendered) {
      router.push(buildUrl(`/ai-coaches/${coachKey}`));
    } else {
      // Use intelligent routing based on what's missing
      router.push(buildUrl(getSetupRoute()));
    }
  };

  const handleQuickAction = (coachKey: CoachKey, starter: string) => {
    const basePath =
      shopId && pathname?.startsWith("/stores/")
        ? `/stores/${shopId}/ai-coaches/${coachKey}`
        : `/ai-coaches/${coachKey}`;
    const searchParams = new URLSearchParams();
    if (!pathname?.startsWith("/stores/") && shopDomain) {
      searchParams.set("shop", shopDomain);
    }
    searchParams.set("starter", encodeURIComponent(starter));
    router.push(`${basePath}?${searchParams.toString()}`);
  };

  const handleDownloadBuilderPack = async () => {
    if (!shopIdentifier) return;

    try {
      window.open(
        `/api/ai-coaches/builder-pack?shop=${encodeURIComponent(shopIdentifier)}&download=true`,
        "_blank",
      );
    } catch (err) {
      logger.error("Failed to download builder pack:", err as Error, {
        component: "ai-coaches",
      });
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
      >
        <div className="w-full" style={{ maxWidth: "1200px" }}>
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
                  className="animate-spin"
                  style={{ width: "32px", height: "32px", color: "#0066cc" }}
                />
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Loading AI Coaches...
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
            <AlertCircle
              style={{ width: "16px", height: "16px", color: "#991b1b" }}
            />
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
            <AlertCircle
              style={{ width: "16px", height: "16px", color: "#991b1b" }}
            />
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

  const renderedCount = coaches.filter((c) => c.is_rendered).length;

  return (
    <div
      className="w-full flex flex-col items-center"
      style={{ padding: "32px", background: "#fafaf9", minHeight: "100vh" }}
    >
      <div className="w-full" style={{ maxWidth: "1200px" }}>
        {/* Header */}
        <div
          className="flex items-start justify-between"
          style={{ marginBottom: "32px" }}
        >
          <div>
            <div
              className="flex items-center"
              style={{ gap: "12px", marginBottom: "8px" }}
            >
              <Sparkles
                style={{ width: "32px", height: "32px", color: "#0066cc" }}
              />
              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  margin: 0,
                }}
              >
                AI Coaches
              </h1>
            </div>
            <p
              style={{
                fontSize: "16px",
                color: "#6b7280",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Your personalized boutique advisors, trained on your brand
            </p>
          </div>

          <div className="flex" style={{ gap: "12px" }}>
            <Button
              variant="outline"
              onClick={() => router.push(buildUrl("/ai-coaches/onboarding"))}
              style={{
                background: "#ffffff",
                color: "#0066cc",
                borderRadius: "8px",
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                border: "1px solid #e5e7eb",
              }}
            >
              <Settings
                style={{ width: "16px", height: "16px", marginRight: "8px" }}
              />
              Profile Settings
            </Button>

            {renderedCount > 0 && (
              <Button
                variant="outline"
                onClick={handleDownloadBuilderPack}
                style={{
                  background: "#ffffff",
                  color: "#0066cc",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  border: "1px solid #e5e7eb",
                }}
              >
                <Download
                  style={{ width: "16px", height: "16px", marginRight: "8px" }}
                />
                Builder Pack
              </Button>
            )}
          </div>
        </div>

        {/* Profile Incomplete Warning */}
        {!profileComplete && (
          <Alert
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <AlertCircle
              style={{ width: "16px", height: "16px", color: "#d97706" }}
            />
            <AlertTitle
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#92400e",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                marginBottom: "4px",
              }}
            >
              Complete Your Profile
            </AlertTitle>
            <AlertDescription
              style={{
                fontSize: "13px",
                color: "#92400e",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              {missingFields.length > 0 ? (
                <>Missing: {missingFields.join(", ")}. </>
              ) : (
                <>Some profile fields are incomplete. </>
              )}
              <Button
                variant="link"
                onClick={() => router.push(buildUrl(getSetupRoute()))}
                style={{
                  padding: 0,
                  height: "auto",
                  color: "#d97706",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Complete setup
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Coaches Grid */}
        <div
          className="grid md:grid-cols-2 lg:grid-cols-3"
          style={{ gap: "24px" }}
        >
          {coaches.map((coach) => (
            <CoachCard
              key={coach.coach_key}
              coachKey={coach.coach_key}
              isRendered={coach.is_rendered}
              conversationStarters={coach.conversation_starters}
              lastConversationAt={coach.last_conversation_at}
              onClick={() => handleCoachClick(coach.coach_key)}
              onQuickAction={(starter) =>
                handleQuickAction(coach.coach_key, starter)
              }
            />
          ))}
        </div>

        {/* Empty State */}
        {coaches.length === 0 && (
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent
              className="flex flex-col items-center justify-center"
              style={{ padding: "80px" }}
            >
              <Sparkles
                style={{
                  width: "48px",
                  height: "48px",
                  color: "#d1d5db",
                  marginBottom: "16px",
                }}
              />
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#374151",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "8px",
                }}
              >
                No coaches available
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "24px",
                }}
              >
                Complete your brand profile to unlock AI Coaches.
              </p>
              <Button
                onClick={() => router.push(buildUrl(getSetupRoute()))}
                style={{
                  background: "#0066cc",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  border: "none",
                }}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
