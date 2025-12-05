'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Library,
  ArrowLeft,
  Sparkles,
  Plus,
  Eye,
  Zap,
  AlertCircle,
  RefreshCw,
  Megaphone,
  ImageOff
} from 'lucide-react';
import { AdMockupModal } from '@/components/AdMockupModal';
import { logger } from '@/lib/logger'

interface SavedAd {
  id: string;
  headline: string;
  primary_text: string;
  description?: string;
  platform: string;
  goal: string;
  variant_type?: string;
  product_id?: string;
  product_title?: string;
  product_image?: string;
  product_data?: any;
  predicted_score?: number;
  selected_length?: string;
  status: string;
  created_at: string;
}

export default function AdsLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || '';

  const [ads, setAds] = useState<SavedAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<SavedAd | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ads-library');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch ads');
      }

      setAds(data.ads);
    } catch (err: any) {
      logger.error('Error fetching ads:', err as Error, { component: 'ads-library' });
      setError(err.message || 'Failed to load ads library');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (ad: SavedAd) => {
    setSelectedAd(ad);
    setShowPreviewModal(true);
  };

  const getPlatformBadge = (platform: string) => {
    const variants: Record<string, string> = {
      meta: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      instagram: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      google: 'bg-green-100 text-green-800 hover:bg-green-200',
      tiktok: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
      pinterest: 'bg-red-100 text-red-800 hover:bg-red-200'
    };

    return (
      <Badge className={variants[platform] || 'bg-gray-100 text-gray-800'}>
        {platform.charAt(0).toUpperCase() + platform.slice(1)}
      </Badge>
    );
  };

  const getGoalBadge = (goal: string) => {
    return (
      <Badge variant="outline">
        {goal.charAt(0).toUpperCase() + goal.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-3">
                      <div className="h-6 w-20 bg-gray-200 rounded-full" />
                      <div className="h-6 w-16 bg-gray-100 rounded-full" />
                    </div>
                    <div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
                    <div className="h-4 bg-gray-100 rounded mb-2 w-full" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="w-20 h-20 bg-gray-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background: 'linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)'
        }}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Thunder Text</span>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(220, 38, 38, 0.1)' }}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Failed to Load Ads Library
              </h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  fetchAds();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)' }}
              >
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ads Library</h1>
                <p className="text-gray-500 text-sm">Browse and manage your saved ad campaigns</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
                onClick={() => router.push(`/dashboard?shop=${shop}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Link href={`/create-ad?shop=${shop}`}>
                <Button
                  style={{
                    background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                    border: 'none'
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Ad
                </Button>
              </Link>
            </div>
          </div>

          {/* Info banner */}
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(0, 102, 204, 0.05)', border: '1px solid rgba(0, 102, 204, 0.1)' }}
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: '#0066cc' }} />
            <p className="text-sm" style={{ color: '#0066cc' }}>
              Your saved ads are stored here. Preview, edit, or use them to launch new campaigns.
            </p>
          </div>
        </div>

        {/* Empty State */}
        {ads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(0, 102, 204, 0.1)' }}
            >
              <Megaphone className="w-8 h-8" style={{ color: '#0066cc' }} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No ads in your library yet</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Create your first ad campaign to get started. Your saved ads will appear here.
            </p>
            <Link href={`/create-ad?shop=${shop}`}>
              <Button
                className="h-11 px-6 text-base font-medium"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Ad
              </Button>
            </Link>
          </div>
        ) : (
          /* Ads List */
          <div className="space-y-4">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {getPlatformBadge(ad.platform)}
                      {getGoalBadge(ad.goal)}
                      {ad.predicted_score && ad.predicted_score > 0 && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                          Score: {ad.predicted_score}/10
                        </Badge>
                      )}
                      {ad.selected_length && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                          {ad.selected_length}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {ad.headline}
                    </h3>

                    <p className="text-gray-600 text-sm">
                      {ad.primary_text.length > 150
                        ? ad.primary_text.substring(0, 150) + '...'
                        : ad.primary_text}
                    </p>

                    {ad.product_title && (
                      <p className="text-sm text-gray-500">
                        Product: {ad.product_title}
                      </p>
                    )}

                    <p className="text-xs text-gray-400">
                      Created {formatDate(ad.created_at)}
                    </p>
                  </div>

                  {ad.product_image ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={ad.product_image}
                        alt={ad.product_title || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <ImageOff className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button
                    onClick={() => handlePreview(ad)}
                    variant="outline"
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Ad
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {selectedAd && (
          <AdMockupModal
            open={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedAd(null);
            }}
            variant={{
              headline: selectedAd.headline,
              primary_text: selectedAd.primary_text,
              description: selectedAd.description,
              variant_type: selectedAd.variant_type,
              predicted_score: selectedAd.predicted_score,
              selected_length: selectedAd.selected_length
            }}
            platform={selectedAd.platform}
            goal={selectedAd.goal}
            productData={selectedAd.product_data}
            previewOnly={true}
          />
        )}
      </main>
    </div>
  );
}
