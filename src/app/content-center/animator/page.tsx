"use client";

import { ProductAnimator } from "@/features/content-center";
import { isVideoGenerationEnabled } from "@/lib/feature-flags";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AnimatorPage() {
  // Check if video generation is enabled
  if (!isVideoGenerationEnabled()) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Feature Not Available
          </h1>
          <p className="text-gray-600 mb-8">
            Video generation is currently not available. This feature is in
            development and will be enabled in a future release.
          </p>
          <Link
            href="/content-center"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Content Center
          </Link>
        </div>
      </div>
    );
  }

  return <ProductAnimator />;
}
