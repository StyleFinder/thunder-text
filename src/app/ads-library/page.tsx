'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-oxford-navy">Ads Library</h1>
          <p className="text-gray-600 mt-1">Browse and manage your saved ad campaigns</p>
        </div>
        <Link href="/create-ad">
          <Button className="bg-smart-blue-500 hover:bg-smart-blue-600">
            Create New Ad
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-smart-blue-500" />
            </CardContent>
          </Card>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-xl font-semibold text-oxford-navy mb-2">No ads in your library yet</h3>
              <p className="text-gray-600 mb-4">Create your first ad campaign to get started</p>
              <Link href="/create-ad">
                <Button className="bg-smart-blue-500 hover:bg-smart-blue-600">
                  Create Ad
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          ads.map((ad) => (
            <Card key={ad.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {getPlatformBadge(ad.platform)}
                      {getGoalBadge(ad.goal)}
                      {ad.predicted_score && ad.predicted_score > 0 && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          Score: {ad.predicted_score}/10
                        </Badge>
                      )}
                      {ad.selected_length && (
                        <Badge variant="secondary">
                          {ad.selected_length}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-oxford-navy">
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

                  {ad.product_image && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={ad.product_image}
                        alt={ad.product_title || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Button
                    onClick={() => handlePreview(ad)}
                    variant="outline"
                    size="sm"
                  >
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
    </div>
  );
}
