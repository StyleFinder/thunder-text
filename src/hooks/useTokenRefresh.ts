/* eslint-disable no-restricted-imports -- Hook intentionally wraps app-layer context */
/**
 * React hook for handling token refresh on the client side
 * Monitors token expiration and triggers refresh when needed
 */
"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAppBridge } from "@/app/components/AppBridgeProvider";
import { logger } from "@/lib/logger";

export function useTokenRefresh() {
  const { shop, app } = useAppBridge();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /**
   * Check if token needs refresh
   */
  const checkTokenExpiration = useCallback(async () => {
    if (!shop || !app) return;

    try {
      // Check token status from our API
      const response = await fetch(
        `/api/shopify/auth/token-status?shop=${shop}`,
      );
      const data = await response.json();

      if (data.needsRefresh && !isRefreshingRef.current) {
        await refreshToken();
      } else if (data.expiresIn) {
        // Schedule next check 5 minutes before expiry
        const nextCheck = Math.max((data.expiresIn - 300) * 1000, 60000);
        scheduleNextCheck(nextCheck);
      }
    } catch (error) {
      logger.error("❌ Failed to check token status:", error as Error, {
        component: "useTokenRefresh",
      });
      // Retry in 5 minutes
      scheduleNextCheck(5 * 60 * 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, app]);

  /**
   * Refresh the access token
   */
  const refreshToken = useCallback(async () => {
    if (!app || !shop || isRefreshingRef.current) return;

    isRefreshingRef.current = true;

    try {
      // Get fresh session token from App Bridge
      const sessionToken = await app.idToken();

      if (!sessionToken) {
        throw new Error("Failed to get session token from App Bridge");
      }

      // Send to our backend for token exchange
      const response = await fetch("/api/shopify/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ shop }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Token refresh failed");
      }

      // Update stored session token
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("shopify_session_token", sessionToken);
      }

      // Schedule next check in 23 hours (for 24-hour tokens)
      scheduleNextCheck(23 * 60 * 60 * 1000);
    } catch (error) {
      logger.error("❌ Token refresh failed:", error as Error, {
        component: "useTokenRefresh",
      });

      // Retry in 1 minute
      setTimeout(() => {
        isRefreshingRef.current = false;
        refreshToken();
      }, 60000);
    } finally {
      isRefreshingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, shop]);

  /**
   * Schedule the next token check
   */
  const scheduleNextCheck = useCallback(
    (delay: number) => {
      // Clear existing timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      // Schedule new check
      refreshTimerRef.current = setTimeout(() => {
        checkTokenExpiration();
      }, delay);
    },
    [checkTokenExpiration],
  );

  /**
   * Set up token refresh monitoring
   */
  useEffect(() => {
    if (!shop || !app) return;

    // Initial check after 1 second
    const initialTimer = setTimeout(() => {
      checkTokenExpiration();
    }, 1000);

    // Also check on visibility change (when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkTokenExpiration();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearTimeout(initialTimer);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [shop, app, checkTokenExpiration]);

  return {
    refreshToken,
    isRefreshing: isRefreshingRef.current,
  };
}
