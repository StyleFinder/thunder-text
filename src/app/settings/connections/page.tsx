"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import {
  Loader2,
  ShoppingBag,
  Facebook,
  Search,
  Music,
  Pin,
  Mail,
  Send,
  Zap,
  MessageSquare,
  Settings2,
} from "lucide-react";
import { AdAccountSelectorModal } from "@/components/AdAccountSelectorModal";

interface Connection {
  provider: string;
  connected: boolean;
  lastConnected: string | null;
  metadata: any;
}

interface ConnectionsResponse {
  success: boolean;
  connections: Connection[];
  error?: string;
}

interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  status: number;
}

// Provider display information with Lucide icons
const PROVIDER_INFO: Record<
  string,
  { name: string; description: string; Icon: any }
> = {
  shopify: {
    name: "Shopify",
    description: "Your e-commerce store platform",
    Icon: ShoppingBag,
  },
  meta: {
    name: "Meta (Facebook & Instagram)",
    description: "Run and manage Facebook and Instagram ad campaigns",
    Icon: Facebook,
  },
  google: {
    name: "Google Ads",
    description: "Manage Google Search and Display campaigns",
    Icon: Search,
  },
  tiktok: {
    name: "TikTok Ads",
    description: "Create and track TikTok advertising campaigns",
    Icon: Music,
  },
  pinterest: {
    name: "Pinterest Ads",
    description: "Reach customers through Pinterest advertising",
    Icon: Pin,
  },
  klaviyo: {
    name: "Klaviyo",
    description: "Email marketing and customer engagement",
    Icon: Mail,
  },
  mailchimp: {
    name: "Mailchimp",
    description: "Email marketing automation platform",
    Icon: Send,
  },
  lightspeed: {
    name: "Lightspeed",
    description: "Point of sale and retail management system",
    Icon: Zap,
  },
  commentsold: {
    name: "CommentSold",
    description: "Live selling and social commerce platform",
    Icon: MessageSquare,
  },
};

export default function ConnectionsPage() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  // Get shop from URL params first, then fallback to session
  const shopFromUrl = searchParams?.get("shop");
  const shopFromSession = session?.user?.shopDomain;
  const shop = shopFromUrl || shopFromSession;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Shopify API key for OAuth install link
  const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

  // Ad account selector modal state
  const [showAdAccountSelector, setShowAdAccountSelector] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = shop
        ? `/api/settings/connections?shop=${encodeURIComponent(shop)}`
        : "/api/settings/connections";

      const response = await fetch(url);
      const data: ConnectionsResponse = await response.json();

      if (!response.ok || !data.success) {
        // Include the actual error from the API for better debugging
        const errorMessage = data.error || `HTTP ${response.status}`;
        throw new Error(`Failed to fetch connections: ${errorMessage}`);
      }

      setConnections(data.connections);
    } catch (err) {
      logger.error("Error fetching connections:", err as Error, {
        component: "connections",
      });
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    // Wait for session to load before fetching connections
    if (sessionStatus === "loading") return;

    // Only fetch if we have a shop identifier
    if (shop) {
      fetchConnections();
    } else {
      setLoading(false);
      setError("No shop identified. Please log in again.");
    }

    // Check for OAuth success messages
    const googleConnected = searchParams?.get("google_connected");
    const shopifyLinked = searchParams?.get("shopify_linked");
    const facebookConnected = searchParams?.get("facebook_connected");
    const selectAdAccounts = searchParams?.get("select_ad_accounts");
    const message = searchParams?.get("message");

    if ((googleConnected || shopifyLinked || facebookConnected) && message) {
      setSuccessMessage(message);

      // If Facebook connected with multiple ad accounts, show selector modal
      if (facebookConnected && selectAdAccounts === "true" && shop) {
        fetchAdAccounts();
      }

      // Clean URL
      window.history.replaceState(
        {},
        "",
        `/settings/connections${shop ? `?shop=${shop}` : ""}`,
      );

      // Clear message after 5 seconds (unless ad account selector is showing)
      if (selectAdAccounts !== "true") {
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, shop, searchParams, fetchConnections]);

  // Fetch ad accounts for selection
  async function fetchAdAccounts() {
    if (!shop) return;

    try {
      const response = await fetch(
        `/api/facebook/ad-accounts/select?shop=${encodeURIComponent(shop)}`,
      );
      const data = await response.json();

      if (data.success && data.ad_accounts && data.ad_accounts.length > 0) {
        setAdAccounts(data.ad_accounts);
        setShowAdAccountSelector(true);
      }
    } catch (err) {
      logger.error("Error fetching ad accounts:", err as Error, {
        component: "connections",
      });
    }
  }

  // Handle ad account selection complete
  function handleAdAccountSelectionComplete() {
    setSuccessMessage("Ad accounts configured successfully!");
    setTimeout(() => setSuccessMessage(null), 5000);
    fetchConnections(); // Refresh connections to show updated data
  }

  // Open ad account selector for existing connection
  function handleManageAdAccounts() {
    fetchAdAccounts();
  }

  function handleConnect(provider: string) {
    // For Shopify, redirect to Shopify's OAuth install page
    // This complies with requirement 2.3.1 - no manual myshopify.com URL entry
    if (provider === "shopify") {
      if (SHOPIFY_API_KEY) {
        // Use Shopify's hosted OAuth install flow - they handle store selection
        // IMPORTANT: Explicitly set redirect_uri to ensure callback goes to correct URL
        const redirectUri = encodeURIComponent(
          `${window.location.origin}/api/auth/shopify/callback`,
        );
        window.location.href = `https://admin.shopify.com/oauth/install?client_id=${SHOPIFY_API_KEY}&redirect_uri=${redirectUri}`;
      } else {
        alert("Shopify configuration error. Please contact support.");
      }
      return;
    }

    // Redirect to OAuth flow for other providers
    const oauthUrls: Record<string, string> = {
      meta: "/api/facebook/oauth/authorize",
      google: "/api/google/oauth/authorize",
      tiktok: "/api/tiktok/oauth/authorize",
    };

    /* eslint-disable security/detect-object-injection -- Safe: Object.hasOwn validates property exists */
    const baseUrl = Object.hasOwn(oauthUrls, provider)
      ? oauthUrls[provider]
      : null;
    /* eslint-enable security/detect-object-injection */
    if (baseUrl) {
      // Build OAuth URL with shop parameter
      let url = baseUrl;
      if (shop) {
        url += `?shop=${encodeURIComponent(shop)}`;

        // Add return_to parameter to redirect back to connections page
        if (provider === "google" || provider === "meta") {
          url += `&return_to=${encodeURIComponent("/settings/connections")}`;
        }
      }

      window.location.href = url;
    } else {
      alert(`OAuth flow for ${provider} not yet implemented`);
    }
  }

  async function handleDisconnect(provider: string) {
    /* eslint-disable security/detect-object-injection -- Safe: Object.hasOwn validates property exists */
    const providerName = Object.hasOwn(PROVIDER_INFO, provider)
      ? PROVIDER_INFO[provider]?.name
      : provider;
    /* eslint-enable security/detect-object-injection */
    if (!confirm(`Are you sure you want to disconnect ${providerName}?`)) {
      return;
    }

    try {
      const url = shop
        ? `/api/settings/connections/${provider}?shop=${encodeURIComponent(shop)}`
        : `/api/settings/connections/${provider}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const responseText = await response.text();
        logger.error(
          `Disconnect failed: ${response.status} - ${responseText}`,
          new Error("Disconnect failed"),
          { component: "connections" },
        );
        let errorData: any = {};
        try {
          errorData = JSON.parse(responseText);
        } catch {
          logger.debug(`Response is not JSON: ${responseText}`, {
            component: "connections",
          });
        }
        throw new Error(
          `Failed to disconnect: ${errorData.error || response.statusText}`,
        );
      }

      // Refresh connections
      await fetchConnections();
    } catch (err) {
      logger.error("Error disconnecting:", err as Error, {
        component: "connections",
      });
      alert(
        `Failed to disconnect. ${err instanceof Error ? err.message : "Please try again."}`,
      );
    }
  }

  // Show loading while session is being fetched
  if (sessionStatus === "loading" || loading) {
    return (
      <div className="w-full flex flex-col items-center bg-gray-50 min-h-screen px-4 py-8">
        <div className="w-full" style={{ maxWidth: "1200px" }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connections
            </h1>
            <p className="text-sm text-gray-600">
              Connect your platforms to unlock powerful features
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-gray-500">Loading connections...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center bg-gray-50 min-h-screen px-4 py-8">
        <div className="w-full" style={{ maxWidth: "1200px" }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connections
            </h1>
            <p className="text-sm text-gray-600">
              Connect your platforms to unlock powerful features
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">Error: {error}</p>
                <Button onClick={fetchConnections}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center bg-gray-50 min-h-screen px-4 py-8">
      <div className="w-full" style={{ maxWidth: "1200px" }}>
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/settings${shop ? `?shop=${shop}` : ""}`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connections</h1>
          <p className="text-sm text-gray-600">
            Connect your platforms to unlock powerful features
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">✓ {successMessage}</p>
          </div>
        )}

        {/* Connections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((connection) => {
            const info = PROVIDER_INFO[connection.provider];
            if (!info) return null;

            const Icon = info.Icon;

            return (
              <Card
                key={connection.provider}
                className="border-gray-200 flex flex-col"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-700" />
                      </div>
                      <CardTitle className="text-lg text-gray-900">
                        {info.name}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={connection.connected ? "default" : "secondary"}
                      className={
                        connection.connected
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {connection.connected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-600">
                    {info.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-4">
                    {/* Metadata - Account Name */}
                    {connection.connected &&
                      connection.metadata?.provider_account_name && (
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs text-gray-600">
                            Account: {connection.metadata.provider_account_name}
                          </p>
                        </div>
                      )}

                    {/* Last Connected */}
                    {connection.connected && connection.lastConnected && (
                      <p className="text-xs text-gray-500">
                        Last updated:{" "}
                        {new Date(
                          connection.lastConnected,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Action Button - Always at bottom */}
                  {connection.connected ? (
                    connection.provider === "shopify" ? (
                      <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded text-center">
                        <p className="text-xs text-gray-500">
                          Core platform - always connected
                        </p>
                      </div>
                    ) : connection.provider === "meta" ? (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          onClick={handleManageAdAccounts}
                          className="w-full"
                        >
                          <Settings2 className="mr-2 h-4 w-4" />
                          Manage Ad Accounts
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDisconnect(connection.provider)}
                          className="w-full bg-red-600 text-white hover:bg-red-700 border-red-600"
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleDisconnect(connection.provider)}
                        className="w-full bg-red-600 text-white hover:bg-red-700 border-red-600"
                      >
                        Disconnect
                      </Button>
                    )
                  ) : (
                    <Button
                      onClick={() => handleConnect(connection.provider)}
                      className="w-full bg-primary text-white"
                    >
                      Connect {info.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ad Account Selector Modal */}
      {shop && (
        <AdAccountSelectorModal
          open={showAdAccountSelector}
          onOpenChange={setShowAdAccountSelector}
          adAccounts={adAccounts}
          shop={shop}
          onComplete={handleAdAccountSelectionComplete}
        />
      )}
    </div>
  );
}
