/**
 * TypeScript declarations for the Shopify App Bridge CDN global
 */

interface ShopifyIdTokenResult {
  // The session token JWT
  token: string
}

interface ShopifyGlobal {
  // Get the current session token (ID token)
  idToken(): Promise<string>

  // Display toast notifications
  toast: {
    show(message: string, options?: { duration?: number; isError?: boolean }): void
  }

  // Resource picker
  resourcePicker(options: { type: string; multiple?: boolean }): Promise<unknown[]>

  // Navigation
  navigate(url: string): void

  // Config
  config: {
    apiKey: string
    shop: string
    host: string
    locale: string
  }
}

declare global {
  interface Window {
    shopify?: ShopifyGlobal
  }
}

export {}