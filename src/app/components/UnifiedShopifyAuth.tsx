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
import { logger } from "@/lib/logger";

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
      }
    } catch (err) {
      logger.error("Token refresh failed", err as Error, {
        component: "UnifiedShopifyAuth",
        operation: "refreshToken",
      });
    }
  }, [app]);

  // Initialize authentication
  const initializeAuth = useCallback(async () => {
    try {
      const shopParam = searchParams?.get("shop");
      const hostParam = searchParams?.get("host");

      if (!shopParam) {
        logger.error(
          "Missing shop parameter",
          new Error("Shop parameter not found"),
          {
            component: "UnifiedShopifyAuth",
            operation: "initializeAuth",
          },
        );
        setError("Missing shop parameter");
        setIsLoading(false);
        return;
      }

      setShop(shopParam);
      setHost(hostParam);

      // Check if test store or manual setup store (allow non-embedded access)
      const isTestStore =
        shopParam.includes("zunosai-staging-test-store") ||
        shopParam.includes("shopstylefinder.myshopify.com");

      if (!isEmbedded && !isTestStore) {
        logger.error(
          "App must be accessed through Shopify admin",
          new Error("Not in embedded context"),
          {
            component: "UnifiedShopifyAuth",
            operation: "initializeAuth",
            shop: shopParam,
          },
        );
        setError("This app must be accessed through your Shopify admin panel");
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // For test store or manual setup in non-embedded mode
      if (!isEmbedded && isTestStore) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Embedded context - initialize App Bridge

      const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

      if (!apiKey) {
        logger.error(
          "NEXT_PUBLIC_SHOPIFY_API_KEY not configured",
          new Error("API key missing"),
          {
            component: "UnifiedShopifyAuth",
            operation: "initializeAuth",
          },
        );
        setError("App configuration error: API key missing");
        setIsLoading(false);
        return;
      }

      if (!hostParam) {
        logger.error(
          "Missing host parameter required for App Bridge",
          new Error("Host parameter missing"),
          {
            component: "UnifiedShopifyAuth",
            operation: "initializeAuth",
            shop: shopParam,
          },
        );
        setError("Missing host parameter");
        setIsLoading(false);
        return;
      }

      // Create App Bridge instance
      const appInstance = createApp({
        apiKey: apiKey,
        host: hostParam,
        forceRedirect: false,
      });

      setApp(appInstance);

      // Get initial session token

      let token: string | undefined;
      try {
        token = await getSessionToken(appInstance);
      } catch (tokenErr) {
        logger.error("Failed to get session token", tokenErr as Error, {
          component: "UnifiedShopifyAuth",
          operation: "initializeAuth",
          shop: shopParam,
        });

        // If token retrieval fails, the user needs to go through OAuth
        // Redirect to unified OAuth initiation route (handles state generation and security)
        const oauthInitUrl = `${window.location.origin}/api/auth/shopify?shop=${encodeURIComponent(shopParam)}`;

        window.top!.location.href = oauthInitUrl;
        return;
      }

      if (!token) {
        logger.error(
          "Session token is empty",
          new Error("Empty session token"),
          {
            component: "UnifiedShopifyAuth",
            operation: "initializeAuth",
            shop: shopParam,
          },
        );
        setError("Failed to get session token");
        setIsLoading(false);
        return;
      }

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
            logger.error("Failed to get fresh session token", error as Error, {
              component: "UnifiedShopifyAuth",
              operation: "getShopifySessionToken",
            });
            const storedToken = sessionStorage.getItem("shopify_session_token");
            if (!storedToken) {
              throw new Error("No session token available");
            }
            return storedToken;
          }
        };
      }

      // Exchange token with backend for access token

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

      const result = await response.json();

      if (!response.ok || !result.success) {
        logger.error(
          "Token exchange failed",
          new Error(result.error || "Token exchange failed"),
          {
            component: "UnifiedShopifyAuth",
            operation: "tokenExchange",
            status: response.status,
            details: result.details,
            shop: shopParam,
          },
        );

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
      logger.error("Authentication initialization error", error as Error, {
        component: "UnifiedShopifyAuth",
        operation: "initializeAuth",
      });
      setError(
        error instanceof Error ? error.message : "Authentication failed",
      );
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [searchParams, isEmbedded, refreshToken]);

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
  }, [isAuthenticated, error, isLoading, initializeAuth]);

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
