'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Root route handler
 * Determines user type and onboarding status, then redirects accordingly:
 * - First-time store users → /welcome
 * - Returning store users → /dashboard
 * - Coaches → /coach/login (or /bhb if authenticated)
 */
export default function RootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const determineRoute = async () => {
      try {
        // Get shop parameter from URL
        const shop = searchParams?.get('shop');

        if (!shop) {
          // No shop parameter - assume coach trying to access
          console.log('[Root] No shop parameter, redirecting to coach login');
          router.replace('/coach/login');
          return;
        }

        // Check onboarding status for store users
        const response = await fetch('/api/onboarding/status', {
          headers: {
            'Authorization': `Bearer ${shop}`,
          },
        });

        if (!response.ok) {
          // Shop not found or error - redirect to welcome for new setup
          console.log('[Root] Shop not found, redirecting to welcome');
          router.replace(`/welcome?shop=${shop}`);
          return;
        }

        const data = await response.json();

        if (data.success && data.data) {
          const { onboarding_completed, user_type } = data.data;

          if (user_type === 'coach') {
            // Coach user - redirect to coach portal
            console.log('[Root] Coach user detected, redirecting to coach login');
            router.replace('/coach/login');
            return;
          }

          // Store user - check onboarding status
          if (onboarding_completed) {
            console.log('[Root] Onboarding complete, redirecting to dashboard');
            router.replace(`/dashboard?shop=${shop}`);
          } else {
            console.log('[Root] Onboarding not complete, redirecting to welcome');
            router.replace(`/welcome?shop=${shop}`);
          }
        } else {
          // Default to welcome for store users
          router.replace(`/welcome?shop=${shop}`);
        }
      } catch (error) {
        console.error('[Root] Error determining route:', error);
        setError('Failed to load. Please try again.');
        setIsLoading(false);
      }
    };

    determineRoute();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading Thunder Text...</p>
      </div>
    </div>
  );
}
