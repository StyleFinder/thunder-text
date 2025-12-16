"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  RefreshCw,
  Store,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

export default function ShopifyDisconnectedPage() {
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = () => {
    setIsReconnecting(true);
    // Use Shopify's hosted OAuth install flow
    const clientId =
      process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ||
      "613bffa12a51873c2739ae67163a72e2";
    window.location.href = `https://admin.shopify.com/oauth/install?client_id=${clientId}`;
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
            }}
          >
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Thunder Text</span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Warning Icon */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-amber-100">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Shopify Disconnected
            </h1>
            <p className="text-gray-500">
              Your Thunder Text app has been uninstalled from Shopify.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-amber-800 mb-2">What happened?</h3>
            <p className="text-sm text-amber-700">
              The Thunder Text app was uninstalled from your Shopify store. To
              continue generating product descriptions and syncing with your
              store, you&apos;ll need to reinstall the app.
            </p>
          </div>

          {/* Data Safety Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-2">
              Your data is safe
            </h3>
            <p className="text-sm text-blue-700">
              Your account, generated descriptions, and settings are preserved.
              Once you reconnect, everything will be restored.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="w-full h-12 text-base font-medium bg-[#008060] hover:bg-[#006e52]"
            >
              {isReconnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Store className="w-4 h-4 mr-2" />
                  Reconnect Shopify Store
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full h-11"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Need help?{" "}
            <a
              href="mailto:support@thundertext.app"
              className="text-blue-500 hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
