"use client";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { isImageGenerationEnabled } from "@/lib/feature-flags";
import { Lock } from "lucide-react";
import Link from "next/link";

// Import the main component
import ImageGenerationPageContent from "./ImageGenerationPage";

export default function ImageGenerationPage() {
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
