"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShop } from "@/hooks/useShop";

/**
 * Redirect page - Settings have been merged into the unified Brand Voice page
 */
export default function SettingsRedirect() {
  const router = useRouter();
  const { shopId } = useShop();

  useEffect(() => {
    if (shopId) {
      router.replace(`/stores/${shopId}/brand-voice`);
    }
  }, [shopId, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Redirecting to Brand Voice...</p>
    </div>
  );
}
