"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useShopifyAuth } from "../components/UnifiedShopifyAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, AlertCircle } from "lucide-react";

export default function EmbeddedApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    isAuthenticated,
    isEmbedded: _isEmbedded,
    shop,
    isLoading,
    error,
  } = useShopifyAuth();

  useEffect(() => {
    if (isAuthenticated && shop) {
      const params = new URLSearchParams({
        shop,
        authenticated: "true",
        host: searchParams?.get("host") || "",
        embedded: "1",
      });
      router.push(`/products?${params.toString()}`);
    }
  }, [isAuthenticated, shop, searchParams, router]);

  // Missing shop parameter
  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(220, 38, 38, 0.1)" }}
              >
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Missing Shop Parameter
              </h2>
              <p className="text-gray-500 text-sm">
                Please access this app through your Shopify Admin panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center gap-5">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
                }}
              >
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Connecting to Shopify
                </h2>
                <p className="text-gray-500 text-sm">
                  Please wait while we establish a secure connection...
                </p>
              </div>
              <Loader2
                className="h-6 w-6 animate-spin"
                style={{ color: "#0066cc" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(220, 38, 38, 0.1)" }}
              >
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Error
              </h2>
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center gap-5">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
                }}
              >
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Thunder Text
                </h2>
                <p className="text-gray-500 text-sm">
                  Redirecting you to your products...
                </p>
              </div>
              <Loader2
                className="h-6 w-6 animate-spin"
                style={{ color: "#0066cc" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default - authenticating
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center gap-5">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
              }}
            >
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authenticating
              </h2>
              <p className="text-gray-500 text-sm">
                Please wait while we connect to Shopify...
              </p>
            </div>
            <Loader2
              className="h-6 w-6 animate-spin"
              style={{ color: "#0066cc" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
