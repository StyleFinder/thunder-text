"use client";

/**
 * /stores/[shopId]/image-generation
 *
 * Image Generation page using UUID-based routing.
 * Shop context is provided by ShopProvider in the layout.
 * The underlying page uses useShop() hook for shop resolution.
 */

import { Suspense } from "react";
import { Loader2, Sparkles } from "lucide-react";
import ImageGenerationPage from "@/app/image-generation/ImageGenerationPage";

export const dynamic = "force-dynamic";

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0066cc 0%, #cc0066 100%)",
          }}
        >
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-3">
          <Loader2
            className="h-5 w-5 animate-spin"
            style={{ color: "#0066cc" }}
          />
          <p className="text-sm text-gray-500">Loading Image Generation...</p>
        </div>
      </div>
    </div>
  );
}

export default function StoreImageGenerationPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImageGenerationPage />
    </Suspense>
  );
}
