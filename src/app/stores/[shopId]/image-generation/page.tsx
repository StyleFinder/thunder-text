"use client";

/**
 * /stores/[shopId]/image-generation
 *
 * Image Generation page using UUID-based routing.
 * Shop context is provided by ShopProvider in the layout.
 * The underlying page uses useShop() hook for shop resolution.
 */

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isImageGenerationEnabled } from "@/lib/feature-flags";
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
  const params = useParams();
  const shopId = params?.shopId as string;
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  // Check if image generation is enabled (requires admin role)
  if (!isImageGenerationEnabled(userRole)) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Admin Access Required
          </h1>
          <p className="text-gray-600 mb-8">
            Image generation is an admin-only feature. Please contact your
            administrator if you need access to this functionality.
          </p>
          <Link
            href={shopId ? `/stores/${shopId}/dashboard` : "/dashboard"}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImageGenerationPage />
    </Suspense>
  );
}
