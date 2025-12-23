"use client";

import { createContext, useContext, ReactNode } from "react";

export interface ShopContextValue {
  shopId: string;
  shopDomain: string | null;
}

const ShopContext = createContext<ShopContextValue | null>(null);

interface ShopProviderProps {
  children: ReactNode;
  shopId: string;
  shopDomain: string | null;
}

export function ShopProvider({ children, shopId, shopDomain }: ShopProviderProps) {
  return (
    <ShopContext.Provider value={{ shopId, shopDomain }}>
      {children}
    </ShopContext.Provider>
  );
}

/**
 * Hook to get shop context - throws if not in provider
 *
 * Use this when you REQUIRE shop context (e.g., in wrapper pages under /stores/[shopId]/)
 */
export function useShopContext() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShopContext must be used within a ShopProvider");
  }
  return context;
}

/**
 * Hook to optionally get shop context - returns null if not in provider
 *
 * Use this when shop context is optional (e.g., pages that work both
 * under /stores/[shopId]/ routes and legacy ?shop= routes)
 */
export function useOptionalShopContext(): ShopContextValue | null {
  return useContext(ShopContext);
}

/**
 * Hook to get the shop identifier for API calls
 * Returns shopId (UUID) which is the new standard
 * Falls back to shopDomain for backward compatibility with older APIs
 */
export function useShopIdentifier() {
  const { shopId, shopDomain } = useShopContext();
  return {
    shopId,
    shopDomain,
    // For APIs that still need ?shop= query param, use domain if available
    shopQueryParam: shopDomain || shopId,
  };
}
