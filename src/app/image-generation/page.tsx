"use client";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { isImageGenerationEnabled } from "@/lib/feature-flags";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

// Import the main component
import ImageGenerationPageContent from "./ImageGenerationPage";

export default function ImageGenerationPage() {
  // Check if image generation is enabled
  if (!isImageGenerationEnabled()) {
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
            Image generation is currently not available. This feature is in
            development and will be enabled in a future release.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <ImageGenerationPageContent />;
}
