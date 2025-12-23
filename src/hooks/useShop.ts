"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  useOptionalShopContext,
  type ShopContextValue,
} from "@/app/stores/[shopId]/ShopContext";

/**
 * Unified Shop Hook
 *
 * This hook provides consistent shop resolution across the entire application.
 * It resolves shop information from multiple sources in priority order:
 *
 * 1. ShopContext (for /stores/[shopId]/... routes) - highest priority
 * 2. URL query params (for legacy ?shop= routes)
 * 3. Session (for authenticated users without explicit shop param)
 *
 * Usage:
 * ```tsx
 * const { shopId, shopDomain, shop, isLoading } = useShop();
 * // `shop` is the best available identifier for API calls
 * ```
 *
 * This hook NEVER throws - it gracefully handles missing shop information.
 */
export function useShop() {
  // Try to get from ShopContext (UUID routes)
  // useOptionalShopContext returns null if not in a ShopProvider
  const contextValue: ShopContextValue | null = useOptionalShopContext();

  // Get from URL query params (legacy routes)
  const searchParams = useSearchParams();
  const shopFromParams = searchParams?.get("shop");
  const authenticatedParam = searchParams?.get("authenticated");

  // Get from session (authenticated users)
  const { data: session, status: sessionStatus } = useSession();
  const shopIdFromSession = session?.user?.id;
  const shopDomainFromSession = session?.user?.shopDomain;

  // Resolve shop information with priority:
  // 1. ShopContext (UUID routes) - most authoritative
  // 2. URL params (legacy routes) - explicit user intent
  // 3. Session (fallback for authenticated users)

  const shopId = contextValue?.shopId || shopIdFromSession || null;

  const shopDomain =
    contextValue?.shopDomain ||  // From context (UUID route)
    shopFromParams ||             // From URL params (legacy)
    shopDomainFromSession ||      // From session
    null;

  // `shop` is the best identifier for API calls that expect ?shop= param
  // Prefer domain over UUID for backward compatibility with APIs
  const shop = shopDomain || shopId || null;

  // Determine routing mode
  const isUuidRouting = !!contextValue;
  const isLegacyRouting = !contextValue && !!shopFromParams;
  const isAuthenticated = authenticatedParam === "true" || !!session;

  // Loading state - only true during initial session load
  const isLoading = sessionStatus === "loading";

  // Whether we have valid shop information
  const hasShop = !!shop;

  return {
    // Primary identifiers
    shopId,
    shopDomain,

    // Best identifier for API calls (prefers domain for legacy API compatibility)
    shop,

    // Routing mode indicators
    isUuidRouting,
    isLegacyRouting,
    isAuthenticated,

    // State
    isLoading,
    hasShop,

    // Raw sources (for debugging)
    _sources: {
      fromContext: !!contextValue,
      fromParams: !!shopFromParams,
      fromSession: !!shopDomainFromSession,
    },
  };
}

/**
 * Hook to get shop for API calls
 *
 * Returns the shop domain string suitable for ?shop= query parameters.
 * Returns null if no shop is available.
 */
export function useShopForApi(): string | null {
  const { shop } = useShop();
  return shop;
}

/**
 * Hook to require shop - throws if not available
 *
 * Use this in pages that absolutely require shop information.
 * For a gentler approach, use useShop() and handle null cases.
 */
export function useRequiredShop() {
  const shopData = useShop();

  if (!shopData.isLoading && !shopData.hasShop) {
    throw new Error(
      "Shop information is required but not available. " +
      "Ensure you're on a shop route or have an authenticated session."
    );
  }

  return shopData;
}
