'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Zap } from 'lucide-react';
import { useShop } from '@/hooks/useShop';

/**
 * Redirect /create-ad to /aie (Ad Intelligence Engine)
 * Maintains backward compatibility with dashboard links
 */
export default function CreateAdRedirect() {
  const router = useRouter();
  const { shop } = useShop();

  useEffect(() => {
    if (shop) {
      router.replace(`/aie?shop=${shop}`);
    } else {
      router.replace('/aie');
    }
  }, [router, shop]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
        >
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#0066cc' }} />
          <p className="text-sm text-gray-500">Redirecting to Ad Creator...</p>
        </div>
      </div>
    </div>
  );
}
