'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, ChevronUp, ChevronDown } from 'lucide-react';

interface HotTake {
  id: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
}

export function HotTakesCard() {
  const [hotTakes, setHotTakes] = useState<HotTake[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  useEffect(() => {
    const fetchHotTakes = async () => {
      try {
        const response = await fetch('/api/hot-takes');
        const data = await response.json();

        if (data.success) {
          setHotTakes(data.data);
        } else {
          setError('Failed to load hot takes');
        }
      } catch (err) {
        console.error('[HotTakesCard] Error fetching hot takes:', err);
        setError('Failed to load hot takes');
      } finally {
        setLoading(false);
      }
    };

    fetchHotTakes();
  }, []);

  // Auto-scroll every 5 seconds (only when auto-scrolling is enabled)
  useEffect(() => {
    if (hotTakes.length === 0 || !isAutoScrolling) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % hotTakes.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [hotTakes.length, isAutoScrolling]);

  const handlePrevious = () => {
    setIsAutoScrolling(false); // Stop auto-scrolling
    setCurrentIndex((prev) => (prev - 1 + hotTakes.length) % hotTakes.length);
  };

  const handleNext = () => {
    setIsAutoScrolling(false); // Stop auto-scrolling
    setCurrentIndex((prev) => (prev + 1) % hotTakes.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoScrolling(false); // Stop auto-scrolling
    setCurrentIndex(index);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Hot Takes</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            Loading latest tips from your coach...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || hotTakes.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Hot Takes</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            {error || 'No hot takes available yet'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentHotTake = hotTakes[currentIndex];

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Hot Takes</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
            {currentIndex + 1} of {hotTakes.length}
          </Badge>
        </div>
        <CardDescription className="text-orange-700">
          Latest ad strategy insights from your coach
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Carousel Container */}
        <div className="relative">
          {/* Current Hot Take Card */}
          <div
            key={currentHotTake.id}
            className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-orange-100 transition-all duration-500 ease-in-out"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-2">
                  {currentHotTake.title}
                </h4>
                <div
                  className="text-sm text-gray-700 mb-3 overflow-y-auto h-[4.5rem] scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-50"
                  style={{
                    lineHeight: '1.5rem',
                  }}
                >
                  {currentHotTake.content}
                </div>
                <p className="text-xs text-orange-600">
                  {new Date(currentHotTake.published_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Controls - Only show if more than 1 hot take */}
          {hotTakes.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                className="h-8 w-8 p-0 bg-white/80 hover:bg-white border-orange-200 hover:border-orange-300"
              >
                <ChevronUp className="h-4 w-4 text-orange-600" />
              </Button>

              {/* Dot Indicators */}
              <div className="flex items-center gap-1.5 px-3">
                {hotTakes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'w-6 bg-orange-600'
                        : 'w-2 bg-orange-300 hover:bg-orange-400'
                    }`}
                    aria-label={`Go to hot take ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                className="h-8 w-8 p-0 bg-white/80 hover:bg-white border-orange-200 hover:border-orange-300"
              >
                <ChevronDown className="h-4 w-4 text-orange-600" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
