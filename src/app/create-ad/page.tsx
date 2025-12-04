'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

/**
 * Redirect /create-ad to /aie (Ad Intelligence Engine)
 * Maintains backward compatibility with dashboard links
 */
export default function CreateAdRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const shop = searchParams?.get('shop');

    if (shop) {
      router.replace(`/aie?shop=${shop}`);
    } else {
      router.replace('/aie');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to Ad Creator...</p>
      </div>
    </div>
  );
}
