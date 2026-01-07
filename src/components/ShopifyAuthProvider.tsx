"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";

interface AuthContextType {
  isAuthenticated: boolean;
  shop: string | null;
  isLoading: boolean;
  error: string | null;
  performTokenExchange: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  shop: null,
  isLoading: true,
  error: null,
  performTokenExchange: async () => {},
});

export const useShopifyAuth = () => useContext(AuthContext);

interface ShopifyAuthProviderProps {
  children: ReactNode;
}

export function ShopifyAuthProvider({ children }: ShopifyAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shop, setShop] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const searchParams = useSearchParams();

  const performTokenExchange = async () => {
    // Prevent multiple simultaneous token exchanges
    if (isExchanging) {
      return;
    }

    try {
      setIsExchanging(true);

      const shopParam = searchParams?.get("shop");
      if (!shopParam) {
        setIsLoading(false);
        setIsExchanging(false);
        return;
      }

      setShop(shopParam);

      // Check if we're in an embedded context
      const isEmbedded =
        searchParams?.get("embedded") === "1" || window.top !== window.self;

      if (!isEmbedded) {
        // For non-embedded contexts (like direct URL access),
        // we'll rely on the authenticated=true parameter
        const authenticated = searchParams?.get("authenticated") === "true";
        setIsAuthenticated(authenticated);
        setIsLoading(false);
        setIsExchanging(false);
        return;
      }

      // Check if App Bridge is already loaded or loading
      if (window.shopify && typeof window.shopify.idToken === "function") {
        try {
          // Use existing shopify global
          if (!document.querySelector('meta[name="shopify-api-key"]')) {
            const metaTag = document.createElement("meta");
            metaTag.name = "shopify-api-key";
            metaTag.content = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!;
            document.head.appendChild(metaTag);
          }

          const sessionToken = await window.shopify.idToken();

          if (!sessionToken) {
            throw new Error("Failed to get session token from Shopify");
          }

          // Exchange session token for access token
          const response = await fetch("/api/shopify/token-exchange", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionToken,
              shop: shopParam,
            }),
          });

          const result = await response.json();

          if (result.success) {
            setIsAuthenticated(true);
            setError(null);
          } else {
            logger.error(
              `Token exchange failed: ${result.error}`,
              new Error(result.error),
              { component: "ShopifyAuthProvider" },
            );
            setError(result.error || "Authentication failed");
            setIsAuthenticated(false);
          }
        } catch (err) {
          logger.error("❌ Error during token exchange:", err as Error, {
            component: "ShopifyAuthProvider",
          });
          setError(err instanceof Error ? err.message : "Authentication error");
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
          setIsExchanging(false);
        }
        return;
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector(
        'script[src="https://cdn.shopify.com/shopifycloud/app-bridge.js"]',
      );
      if (existingScript) {
        setIsLoading(false);
        setIsExchanging(false);
        return;
      }

      // Load Shopify App Bridge
      const script = document.createElement("script");
      script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
      // Don't use async to avoid App Bridge warnings
      script.async = false;

      script.onload = async () => {
        try {
          // Check if shopify global is available (new App Bridge CDN version)
          if (typeof window.shopify === "undefined") {
            throw new Error("Shopify App Bridge not loaded correctly");
          }

          // For the new App Bridge from CDN, we need to use the meta tag approach
          // Create meta tag with API key if it doesn't exist
          if (!document.querySelector('meta[name="shopify-api-key"]')) {
            const metaTag = document.createElement("meta");
            metaTag.name = "shopify-api-key";
            metaTag.content = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!;
            document.head.appendChild(metaTag);
          }

          // Use shopify.idToken() directly for session token
          const sessionToken = await window.shopify.idToken();

          if (!sessionToken) {
            throw new Error("Failed to get session token from Shopify");
          }

          // Exchange session token for access token
          const response = await fetch("/api/shopify/token-exchange", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionToken,
              shop: shopParam,
            }),
          });

          const result = await response.json();

          if (result.success) {
            setIsAuthenticated(true);
            setError(null);
          } else {
            logger.error(
              `Token exchange failed: ${result.error}`,
              new Error(result.error),
              { component: "ShopifyAuthProvider" },
            );
            setError(result.error || "Authentication failed");
            setIsAuthenticated(false);
          }
        } catch (err) {
          logger.error("❌ Error during token exchange:", err as Error, {
            component: "ShopifyAuthProvider",
          });
          setError(err instanceof Error ? err.message : "Authentication error");
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
          setIsExchanging(false);
        }
      };

      script.onerror = () => {
        logger.error("Failed to load Shopify App Bridge");
        setError("Failed to load Shopify App Bridge");
        setIsLoading(false);
        setIsExchanging(false);
      };

      document.head.appendChild(script);
    } catch (err) {
      logger.error("Authentication error", err as Error, {
        component: "ShopifyAuthProvider",
      });
      setError(err instanceof Error ? err.message : "Authentication failed");
      setIsAuthenticated(false);
      setIsLoading(false);
      setIsExchanging(false);
    }
  };

  useEffect(() => {
    // Only perform token exchange once on mount
    // This prevents re-triggers from searchParams changes
    const timeoutId = setTimeout(() => {
      performTokenExchange();
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        shop,
        isLoading,
        error,
        performTokenExchange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Window.shopify type is defined in src/types/shopify-global.d.ts
