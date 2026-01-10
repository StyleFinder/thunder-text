"use client";

/**
 * /stores/[shopId]/content-center/alt-text
 *
 * Alt text management page using UUID-based routing.
 * Shop context is provided by ShopProvider in the layout.
 * The underlying page uses useShop() hook for shop resolution.
 */

import { Suspense } from "react";
import { Loader2, ImageIcon } from "lucide-react";
import AltTextPage from "@/app/content-center/alt-text/page";

export const dynamic = "force-dynamic";

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
          }}
        >
          <ImageIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600 font-medium">
            Loading Alt Text Manager...
          </span>
        </div>
      </div>
    </div>
  );
}

export default function StoreAltTextPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AltTextPage />
    </Suspense>
  );
}
