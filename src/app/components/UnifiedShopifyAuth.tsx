"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  Suspense,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge/utilities";
import type { ClientApplication } from "@shopify/app-bridge";

interface ShopifyAuthContextType {
  isAuthenticated: boolean;
  isEmbedded: boolean;
  shop: string | null;
  host: string | null;
  isLoading: boolean;
  error: string | null;
  sessionToken: string | null;
  app: ClientApplication | null;
  refreshToken: () => Promise<void>;
}

const ShopifyAuthContext = createContext<ShopifyAuthContextType>({
  isAuthenticated: false,
  isEmbedded: false,
  shop: null,
  host: null,
  isLoading: true,
  error: null,
  sessionToken: null,
  app: null,
  refreshToken: async () => {},
});

export const useShopifyAuth = () => useContext(ShopifyAuthContext);

interface UnifiedShopifyAuthProps {
  children: ReactNode;
}

function UnifiedShopifyAuthContent({ children }: UnifiedShopifyAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shop, setShop] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [app, setApp] = useState<ClientApplication | null>(null);
  const searchParams = useSearchParams();

  // Use ref to track if initialization has been attempted
  const initializationAttempted = useRef(false);

  // Debug: Track component mount/unmount
  useEffect(() => {
    console.log("🚀 UnifiedShopifyAuth component MOUNTED");
    return () => {
      console.log("💥 UnifiedShopifyAuth component UNMOUNTING");
    };
  }, []);

  // Debug: Track searchParams changes
  useEffect(() => {
    console.log("🔍 searchParams changed:", {
      shop: searchParams?.get("shop"),
      host: searchParams?.get("host"),
      embedded: searchParams?.get("embedded"),
    });
  }, [searchParams]);

  // Determine if we're in embedded context
  const isEmbedded =
    typeof window !== "undefined" &&
    (window.top !== window.self || searchParams?.get("embedded") === "1");

  // Function to refresh session token
  const refreshToken = useCallback(async () => {
    if (!app) return;

    try {
      const newToken = await getSessionToken(app);
      if (newToken) {
        setSessionToken(newToken);
        sessionStorage.setItem("shopify_session_token", newToken);
        console.log("🔄 Session token refreshed");
      }
    } catch (err) {
      console.error("❌ Token refresh failed:", err);
    }
  }, [app]);

  // Initialize authentication
  const initializeAuth = useCallback(async () => {
    try {
      const shopParam = searchParams?.get("shop");
      const hostParam = searchParams?.get("host");

      if (!shopParam) {
        console.error("❌ Missing shop parameter");
        setError("Missing shop parameter");
        setIsLoading(false);
        return;
      }

      setShop(shopParam);
      setHost(hostParam);

      // Check if test store (allow non-embedded access)
      const isTestStore = shopParam.includes("zunosai-staging-test-store");

      if (!isEmbedded && !isTestStore) {
        console.error(
          "❌ App must be accessed through Shopify admin (embedded context)",
        );
        setError("This app must be accessed through your Shopify admin panel");
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // For test store in non-embedded mode
      if (!isEmbedded && isTestStore) {
        console.log("✅ Test store detected in non-embedded mode");
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Embedded context - initialize App Bridge
      console.log("✅ Embedded context detected, initializing App Bridge");

      const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

      if (!apiKey) {
        console.error("❌ NEXT_PUBLIC_SHOPIFY_API_KEY not configured");
        setError("App configuration error: API key missing");
        setIsLoading(false);
        return;
      }

      if (!hostParam) {
        console.error("❌ Missing host parameter required for App Bridge");
        setError("Missing host parameter");
        setIsLoading(false);
        return;
      }

      // Create App Bridge instance
      console.log("🔧 Creating App Bridge instance...", {
        apiKey: apiKey.substring(0, 10) + "...",
        host: hostParam,
        shop: shopParam,
      });

      const appInstance = createApp({
        apiKey: apiKey,
        host: hostParam,
        forceRedirect: false,
      });

      setApp(appInstance);

      // Get initial session token
      console.log("🔑 Getting session token from App Bridge...");

      let token: string | undefined;
      try {
        token = await getSessionToken(appInstance);
      } catch (tokenErr) {
        console.error("❌ Failed to get session token:", tokenErr);

        // If token retrieval fails, the user needs to go through OAuth
        // Redirect to Shopify OAuth to establish session
        const oauthUrl = `https://${shopParam}/admin/oauth/authorize?client_id=${apiKey}&scope=${process.env.SHOPIFY_SCOPES || "read_products,write_products"}&redirect_uri=${encodeURIComponent(window.location.origin + "/api/auth/callback")}`;

        console.log("🔄 Redirecting to OAuth to establish session...");
        window.top!.location.href = oauthUrl;
        return;
      }

      if (!token) {
        console.error("❌ Session token is empty");
        setError("Failed to get session token");
        setIsLoading(false);
        return;
      }

      console.log("✅ Got session token successfully");
      setSessionToken(token);
      sessionStorage.setItem("shopify_session_token", token);
      sessionStorage.setItem("shopify_shop", shopParam);

      // Set up global session token getter for API calls
      // This allows authenticatedFetch() to always get fresh tokens
      if (appInstance) {
        window.getShopifySessionToken = async () => {
          try {
            const freshToken = await getSessionToken(appInstance);
            if (freshToken) {
              sessionStorage.setItem("shopify_session_token", freshToken);
              return freshToken;
            }
            // If no fresh token, try to get from storage
            const storedToken = sessionStorage.getItem("shopify_session_token");
            if (storedToken) {
              return storedToken;
            }
            throw new Error("No session token available");
          } catch (error) {
            console.error("Failed to get fresh session token:", error);
            const storedToken = sessionStorage.getItem("shopify_session_token");
            if (!storedToken) {
              throw new Error("No session token available");
            }
            return storedToken;
          }
        };
        console.log("✅ Global session token getter configured");
      }

      // Exchange token with backend for access token
      console.log("🔄 Exchanging session token for access token...");

      const response = await fetch("/api/shopify/token-exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionToken: token,
          shop: shopParam,
        }),
      });

      console.log("📥 Token exchange response status:", response.status);

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error("❌ Token exchange failed:", {
          status: response.status,
          error: result.error,
          details: result.details,
        });

        let errorMessage = "Authentication failed";
        if (response.status === 401) {
          errorMessage =
            "Invalid session token. Please try reinstalling the app.";
        } else if (response.status === 403) {
          errorMessage = "Token exchange forbidden. Check app configuration.";
        } else if (result.error) {
          errorMessage = result.error;
        }

        setError(errorMessage);
        setIsAuthenticated(false);
      } else {
        console.log("✅ Authentication successful");
        setIsAuthenticated(true);
        setIsLoading(false); // Set loading to false immediately after successful auth

        // Set up automatic token refresh every 50 seconds
        const refreshInterval = setInterval(async () => {
          await refreshToken();
        }, 50000);

        // Cleanup on unmount
        return () => {
          clearInterval(refreshInterval);
          // Clean up global session token getter
          if (window.getShopifySessionToken) {
            delete window.getShopifySessionToken;
          }
        };
      }
    } catch (error) {
      console.error("❌ Authentication initialization error:", error);
      setError(
        error instanceof Error ? error.message : "Authentication failed",
      );
      setIsAuthenticated(false);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isEmbedded]);

  useEffect(() => {
    // Only initialize once per component instance - use ref to prevent re-runs
    if (
      !initializationAttempted.current &&
      !isAuthenticated &&
      !error &&
      isLoading
    ) {
      initializationAttempted.current = true;
      initializeAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debug: Log auth state changes
  useEffect(() => {
    console.log("🔐 Auth state changed:", {
      isAuthenticated,
      shop,
      isLoading,
      error: error?.substring(0, 50),
    });
  }, [isAuthenticated, shop, isLoading, error]);

  return (
    <ShopifyAuthContext.Provider
      value={{
        isAuthenticated,
        isEmbedded,
        shop,
        host,
        isLoading,
        error,
        sessionToken,
        app,
        refreshToken,
      }}
    >
      {children}
    </ShopifyAuthContext.Provider>
  );
}

// Wrapper with Suspense for Next.js 13+
export function UnifiedShopifyAuth({ children }: UnifiedShopifyAuthProps) {
  return (
    <Suspense
      fallback={
        <ShopifyAuthContext.Provider
          value={{
            isAuthenticated: false,
            isEmbedded: false,
            shop: null,
            host: null,
            isLoading: true,
            error: null,
            sessionToken: null,
            app: null,
            refreshToken: async () => {},
          }}
        >
          <div style={{ padding: "20px", textAlign: "center" }}>
            <h2>Loading Shopify App...</h2>
          </div>
        </ShopifyAuthContext.Provider>
      }
    >
      <UnifiedShopifyAuthContent>{children}</UnifiedShopifyAuthContent>
    </Suspense>
  );
}
