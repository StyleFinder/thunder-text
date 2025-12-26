'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger'

interface AdMockupModalProps {
  open: boolean;
  onClose: () => void;
  variant: any;
  platform: string;
  goal: string;
  shopId?: string;
  productData?: any;
  selectedProduct?: any;
  previewOnly?: boolean; // If true, hide save button
}

export function AdMockupModal({ open, onClose, variant, platform, goal, shopId, productData, selectedProduct, previewOnly = false }: AdMockupModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveCampaign = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/ads-library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          headline: variant.headline,
          primary_text: variant.primary_text,
          description: variant.description,
          platform,
          goal,
          variant_type: variant.variant_type,
          product_id: selectedProduct?.id || productData?.id,
          product_title: selectedProduct?.title || productData?.title,
          product_image: productData?.images?.[0]?.src || productData?.image,
          product_data: productData,
          predicted_score: variant.predicted_score,
          selected_length: variant.selected_length
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save ad');
      }

      // Success - close modal
      onClose();
    } catch (err: any) {
      logger.error('Error saving ad:', err as Error, { component: 'AdMockupModal' });
      setError(err.message || 'Failed to save ad to library');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMetaMockup = () => (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e4e6eb',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#e4e6eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          🏪
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#050505' }}>
            {productData?.vendor || 'Your Store'}
          </div>
          <div style={{ fontSize: '13px', color: '#65676b' }}>
            Sponsored
          </div>
        </div>
        <div style={{ color: '#65676b' }}>⋯</div>
      </div>

      {/* Primary Text */}
      <div style={{
        padding: '16px',
        fontSize: '15px',
        lineHeight: '1.3333',
        color: '#050505'
      }}>
        {variant.primary_text}
      </div>

      {/* Product Image */}
      {(productData?.images?.[0]?.src || productData?.image) && (
        <div style={{
          width: '100%',
          backgroundColor: '#f0f2f5',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0'
        }}>
          <img
            src={productData?.images?.[0]?.src || productData?.image}
            alt={productData?.images?.[0]?.alt || productData?.title}
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'contain'
            }}
          />
        </div>
      )}

      {/* Link Preview Card */}
      <div style={{
        backgroundColor: '#f0f2f5',
        padding: '12px',
        borderTop: '1px solid #e4e6eb'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#65676b',
          textTransform: 'uppercase',
          marginBottom: '4px'
        }}>
          {productData?.vendor?.toLowerCase().replace(/\s/g, '') || 'yourstore'}.com
        </div>
        <div style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#050505',
          marginBottom: '4px'
        }}>
          {variant.headline}
        </div>
        {variant.description && (
          <div style={{
            fontSize: '14px',
            color: '#65676b'
          }}>
            {variant.description}
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #e4e6eb'
      }}>
        <div style={{
          backgroundColor: '#0866ff',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '6px',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '15px'
        }}>
          Shop Now
        </div>
      </div>

      {/* Engagement Bar */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #e4e6eb',
        display: 'flex',
        justifyContent: 'space-around',
        fontSize: '13px',
        color: '#65676b'
      }}>
        <div>👍 Like</div>
        <div>💬 Comment</div>
        <div>↗️ Share</div>
      </div>
    </div>
  );

  const renderGoogleMockup = () => (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #dadce0',
      overflow: 'hidden',
      maxWidth: '600px',
      margin: '0 auto',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
    }}>
      {/* Ad Label */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dadce0'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '2px 8px',
          backgroundColor: '#fff',
          border: '1px solid #dadce0',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#5f6368'
        }}>
          Ad
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {/* Product Image */}
          {(productData?.images?.[0]?.src || productData?.image) && (
            <div style={{
              width: '120px',
              height: '120px',
              flexShrink: 0,
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#f8f9fa'
            }}>
              <img
                src={productData?.images?.[0]?.src || productData?.image}
                alt={productData?.images?.[0]?.alt || productData?.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Headline */}
            <div style={{
              fontSize: '20px',
              fontWeight: 400,
              color: '#1a0dab',
              lineHeight: '1.3',
              cursor: 'pointer'
            }}>
              {variant.headline}
            </div>

            {/* URL */}
            <div style={{
              fontSize: '14px',
              color: '#5f6368',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ color: '#202124' }}>Ad</span>
              <span>·</span>
              <span>{productData?.vendor?.toLowerCase().replace(/\s/g, '') || 'yourstore'}.com</span>
            </div>

            {/* Description */}
            <div style={{
              fontSize: '14px',
              color: '#4d5156',
              lineHeight: '1.58'
            }}>
              {variant.primary_text}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #dadce0',
        backgroundColor: '#f8f9fa'
      }}>
        <button style={{
          width: '100%',
          backgroundColor: '#1a73e8',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          padding: '10px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer'
        }}>
          Shop Now
        </button>
      </div>
    </div>
  );

  const renderTikTokMockup = () => (
    <div style={{
      backgroundColor: '#000',
      borderRadius: '12px',
      overflow: 'hidden',
      maxWidth: '400px',
      margin: '0 auto',
      aspectRatio: '9/16',
      position: 'relative',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
    }}>
      {/* Video/Image Background */}
      {productData?.image && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}>
          <img
            src={productData?.images?.[0]?.src || productData?.image}
            alt={productData?.images?.[0]?.alt || productData?.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      )}

      {/* Overlay Gradient */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        zIndex: 2
      }} />

      {/* Content Overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px',
        zIndex: 3,
        color: '#fff'
      }}>
        {/* Account Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fe2c55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🏪
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>
              {productData?.vendor || 'Your Store'}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              Sponsored
            </div>
          </div>
          <div style={{
            marginLeft: 'auto',
            backgroundColor: '#fe2c55',
            color: '#fff',
            padding: '8px 24px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600
          }}>
            Follow
          </div>
        </div>

        {/* Caption */}
        <div style={{
          fontSize: '15px',
          lineHeight: '1.4',
          marginBottom: '16px'
        }}>
          {variant.headline}
          <br />
          <br />
          {variant.primary_text}
        </div>

        {/* CTA Button */}
        <div style={{
          backgroundColor: '#fff',
          color: '#000',
          padding: '14px',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '16px'
        }}>
          Shop Now
        </div>
      </div>

      {/* Side Actions */}
      <div style={{
        position: 'absolute',
        right: '12px',
        bottom: '120px',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        alignItems: 'center',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px' }}>❤️</div>
          <div style={{ fontSize: '12px' }}>125K</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px' }}>💬</div>
          <div style={{ fontSize: '12px' }}>1.2K</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px' }}>↗️</div>
          <div style={{ fontSize: '12px' }}>Share</div>
        </div>
      </div>
    </div>
  );

  const renderInstagramMockup = () => (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #dbdbdb',
      overflow: 'hidden',
      maxWidth: '470px',
      margin: '0 auto',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #efefef',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px'
        }}>
          🏪
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>
            {productData?.vendor || 'Your Store'}
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
            Sponsored
          </div>
        </div>
        <div>⋯</div>
      </div>

      {/* Image */}
      {(productData?.images?.[0]?.src || productData?.image) && (
        <div style={{
          width: '100%',
          backgroundColor: '#fafafa',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img
            src={productData?.images?.[0]?.src || productData?.image}
            alt={productData?.images?.[0]?.alt || productData?.title}
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'contain'
            }}
          />
        </div>
      )}

      {/* Actions Bar */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '24px'
      }}>
        <div>❤️</div>
        <div>💬</div>
        <div>↗️</div>
        <div style={{ marginLeft: 'auto' }}>🔖</div>
      </div>

      {/* Caption */}
      <div style={{
        padding: '0 16px 16px',
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>
          {variant.headline}
        </div>
        <div>
          {variant.primary_text}
        </div>
      </div>

      {/* CTA Button */}
      <div style={{
        padding: '0 16px 16px'
      }}>
        <div style={{
          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          color: '#fff',
          padding: '10px',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          Shop Now
        </div>
      </div>
    </div>
  );

  const renderMockup = () => {
    switch (platform.toLowerCase()) {
      case 'meta':
        return renderMetaMockup();
      case 'google':
        return renderGoogleMockup();
      case 'tiktok':
        return renderTikTokMockup();
      case 'instagram':
        return renderInstagramMockup();
      default:
        return renderMetaMockup();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ad Preview - {platform.charAt(0).toUpperCase() + platform.slice(1)}</DialogTitle>
          <DialogDescription>
            Preview how your ad will appear on {platform}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-gray-100 p-6 rounded-lg">
          {renderMockup()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            {previewOnly ? 'Close' : 'Cancel'}
          </Button>
          {!previewOnly && (
            <Button
              onClick={handleSaveCampaign}
              disabled={isSaving}
              className="bg-smart-blue-500 hover:bg-smart-blue-600"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Campaign
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
