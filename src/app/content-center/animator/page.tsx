"use client";

import { useSession } from "next-auth/react";
import { ProductAnimator } from "@/features/content-center";
import { isVideoGenerationEnabled } from "@/lib/feature-flags";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function AnimatorPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  // Check if video generation is enabled (requires admin role)
  if (!isVideoGenerationEnabled(userRole)) {
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
            Product Animator is an admin-only feature. Please contact your
            administrator if you need access to video generation.
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
