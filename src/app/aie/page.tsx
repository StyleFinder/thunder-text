/**
 * AIE Ad Generator Page
 * Main UI for generating AI-powered ad copy
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Package, Loader2, X, Check } from 'lucide-react';
import { authenticatedFetch } from '@/lib/shopify/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { logger } from '@/lib/logger'

interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  images: Array<{ url: string; altText?: string }>;
  handle: string;
}

interface ImageSelectionModalProps {
  product: ShopifyProduct;
  onComplete: (selectedImages: string[]) => void;
  onCancel: () => void;
  isOpen: boolean;
}

function ImageSelectionModal({ product, onComplete, onCancel, isOpen }: ImageSelectionModalProps) {
  const [tempSelectedImages, setTempSelectedImages] = useState<string[]>([]);

  const toggleImage = (imageUrl: string) => {
    if (tempSelectedImages.includes(imageUrl)) {
      setTempSelectedImages(tempSelectedImages.filter(url => url !== imageUrl));
    } else {
      setTempSelectedImages([...tempSelectedImages, imageUrl]);
    }
  };

  const handleDone = () => {
    if (tempSelectedImages.length === 0) {
      // If no images selected, select all by default
      const allImages = product.images.map(img => img.url);
      onComplete(allImages);
    } else {
      onComplete(tempSelectedImages);
    }
    setTempSelectedImages([]);
  };

  const handleCancel = () => {
    setTempSelectedImages([]);
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent style={{
        maxWidth: '960px',
        width: '90vw',
        maxHeight: '80vh',
        borderRadius: '12px',
        padding: 0,
        overflow: 'hidden',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #d1d5db',
        zIndex: 60
      }}>
        <DialogHeader style={{
          padding: '20px 32px 16px 32px',
          borderBottom: '1px solid #e5e7eb',
          background: 'white',
          flexShrink: 0,
          position: 'relative'
        }}>
          <button
            onClick={handleCancel}
            style={{
              position: 'absolute',
              right: '24px',
              top: '20px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
              color: '#6b7280'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6L14 14M6 14L14 6" />
            </svg>
          </button>
          <DialogTitle style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#111827',
            paddingRight: '40px'
          }}>
            Select Images from {product.title}
          </DialogTitle>
        </DialogHeader>

        <div style={{
          padding: '24px 32px 32px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
          flex: 1,
          background: '#f9fafb',
          minHeight: 0
        }}>
          {product.images.length === 0 ? (
            <Alert className="bg-amber-50 border-amber-500">
              <AlertDescription className="text-amber-500">
                This product has no images. You can still add it, but consider adding images to your product first.
              </AlertDescription>
            </Alert>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '16px'
            }}>
              {product.images.map((image, idx) => {
                const isSelected = tempSelectedImages.includes(image.url);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleImage(image.url)}
                    style={{
                      cursor: 'pointer',
                      position: 'relative',
                      border: isSelected ? '2px solid #0066cc' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                      transition: 'all 0.15s ease',
                      background: isSelected ? '#f0f9ff' : 'white'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#0066cc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.altText || `${product.title} - Image ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '160px',
                        objectFit: 'cover',
                        borderRadius: '6px'
                      }}
                    />
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: '#0066cc',
                        color: 'white',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        <Check style={{ width: '16px', height: '16px' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tempSelectedImages.length > 0 && (
            <div style={{
              background: '#dbeafe',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '12px 16px'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#1d4ed8',
                margin: 0,
                fontWeight: 500
              }}>
                {tempSelectedImages.length} of {product.images.length} images selected
              </p>
            </div>
          )}
        </div>

        <div style={{
          padding: '18px 32px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'white',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#6b7280',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDone}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'white',
                background: '#0066cc',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0052a3';
                e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0066cc';
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              {tempSelectedImages.length > 0
                ? `Add ${tempSelectedImages.length} Image${tempSelectedImages.length !== 1 ? 's' : ''}`
                : 'Add All Images'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface GeneratedVariant {
  id: string;
  variantNumber: number;
  variantType: string;
  headline: string;
  headlineAlternatives: string[];
  primaryText: string;
  description?: string;
  cta: string;
  ctaRationale?: string;
  hookTechnique: string;
  tone: string;
  predictedScore: number;
  scoreBreakdown: {
    brand_fit: number;
    context_relevance: number;
    platform_compliance: number;
    hook_strength: number;
    cta_clarity: number;
  };
  generationReasoning?: string;
}

interface EditableVariant extends GeneratedVariant {
  editedHeadline?: string;
  editedPrimaryText?: string;
  editedDescription?: string;
}

interface GenerationResult {
  adRequestId: string;
  variants: GeneratedVariant[];
  metadata: {
    generationTimeMs: number;
    aiCost: number;
  };
}

export default function AIEPage() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || 'demo-shop';

  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<string>('meta');
  const [goal, setGoal] = useState<string>('conversion');
  const [description, setDescription] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [editableVariants, setEditableVariants] = useState<EditableVariant[]>([]);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Product selection state
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ShopifyProduct[]>([]);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [imageSelectionModalOpen, setImageSelectionModalOpen] = useState(false);
  const [imageUrlModalOpen, setImageUrlModalOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [currentProductForImageSelection, setCurrentProductForImageSelection] = useState<ShopifyProduct | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const platformOptions = [
    { label: 'Meta (Facebook)', value: 'meta' },
    { label: 'Instagram', value: 'instagram' },
    { label: 'Google Ads', value: 'google' },
    { label: 'TikTok', value: 'tiktok' },
    { label: 'Pinterest', value: 'pinterest' },
  ];

  const goalOptions = [
    { label: 'Conversions', value: 'conversion' },
    { label: 'Brand Awareness', value: 'awareness' },
    { label: 'Engagement', value: 'engagement' },
    { label: 'Traffic', value: 'traffic' },
    { label: 'App Installs', value: 'app_installs' },
  ];

  // Fetch products with debounced search
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);

      const params = new URLSearchParams({
        shop,
        limit: '50',
      });

      if (debouncedSearchQuery) {
        params.append('query', debouncedSearchQuery);
      }

      const response = await authenticatedFetch(`/api/shopify/products?${params}`);
      const data = await response.json();

      if (data.success) {
        const productList = data.data?.products || data.products || [];
        const transformedProducts: ShopifyProduct[] = productList.map((p: {
          id: string;
          title: string;
          description?: string;
          images?: Array<{ url: string; altText?: string }>;
          handle: string;
        }) => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          images: p.images || [],
          handle: p.handle,
        }));
        setProducts(transformedProducts);
      }
    } catch (err) {
      logger.error('Error fetching products:', err as Error, { component: 'aie' });
    } finally {
      setLoadingProducts(false);
    }
  }, [shop, debouncedSearchQuery]);

  useEffect(() => {
    if (productModalOpen) {
      fetchProducts();
    }
  }, [productModalOpen, fetchProducts]);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (value === '') {
      setDebouncedSearchQuery('');
    } else {
      debounceTimeout.current = setTimeout(() => {
        setDebouncedSearchQuery(value);
      }, 500);
    }
  };

  const handleProductSelect = (product: ShopifyProduct) => {
    // Check if product already selected
    if (selectedProducts.find(p => p.id === product.id)) {
      return; // Don't select same product twice
    }

    // If first product, auto-populate description
    if (selectedProducts.length === 0) {
      setDescription(product.description);
    }

    // Open image selection modal for this product
    setCurrentProductForImageSelection(product);
    setImageSelectionModalOpen(true);
  };

  const handleImageSelectionComplete = (selectedImages: string[]) => {
    if (currentProductForImageSelection) {
      // Add product to selected products
      setSelectedProducts([...selectedProducts, currentProductForImageSelection]);

      // Add selected images to the list
      setSelectedImageUrls([...selectedImageUrls, ...selectedImages]);
    }

    // Close modal and reset
    setImageSelectionModalOpen(false);
    setCurrentProductForImageSelection(null);
  };

  const handleImageSelectionCancel = () => {
    // User cancelled image selection, don't add the product
    setImageSelectionModalOpen(false);
    setCurrentProductForImageSelection(null);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    // Remove images from that product
    const productToRemove = selectedProducts.find(p => p.id === productId);
    if (productToRemove) {
      const imagesToRemove = productToRemove.images.map(img => img.url);
      setSelectedImageUrls(selectedImageUrls.filter(url => !imagesToRemove.includes(url)));
    }
  };

  const handleImageUrlSubmit = () => {
    if (tempImageUrl && !selectedImageUrls.includes(tempImageUrl)) {
      setSelectedImageUrls([...selectedImageUrls, tempImageUrl]);
    }
    setImageUrlModalOpen(false);
    setTempImageUrl('');
  };

  const handleClearAll = () => {
    setSelectedProducts([]);
    setSelectedImageUrls([]);
    setDescription('');
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please provide a product/service description');
      return;
    }

    setLoading(true);
    setLoadingStep('Preparing request...');
    setLoadingProgress(10);
    setError(null);
    setResult(null);

    try {
      // Prepare product metadata for RAG context
      const productMetadata = selectedProducts.map(product => ({
        id: product.id,
        title: product.title,
        description: product.description,
        handle: product.handle,
      }));

      setLoadingStep('Retrieving best practices...');
      setLoadingProgress(30);
      const response = await fetch('/api/aie/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shop,
          // Don't send productId - it's Shopify GID format, not UUID
          // Product metadata is sent in productMetadata array instead
          platform,
          goal,
          description, // User-editable unified description
          imageUrls: selectedImageUrls, // All selected images for carousel support
          targetAudience: targetAudience || undefined,
          // Pass all product metadata for RAG context (descriptions, titles, etc.)
          productMetadata: productMetadata.length > 0 ? productMetadata : undefined,
          // Indicate if this is a collection ad (multi-product)
          isCollectionAd: selectedProducts.length > 1,
        }),
      });

      setLoadingStep('Generating ad variants...');
      setLoadingProgress(60);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to generate ads');
      }

      setLoadingStep('Finalizing results...');
      setLoadingProgress(90);
      setResult(data.data);

      // Initialize editable variants
      const variants = data.data.variants.map((v: GeneratedVariant) => ({
        ...v,
        editedHeadline: v.headline,
        editedPrimaryText: v.primaryText,
        editedDescription: v.description,
      }));
      setEditableVariants(variants);
      setLoadingProgress(100);

      // Open results modal
      setResultsModalOpen(true);
    } catch (err) {
      logger.error('Generation error:', err as Error, { component: 'aie' });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingStep('');
      setLoadingProgress(0);
    }
  };

  const handleVariantEdit = (variantId: string, field: 'headline' | 'primaryText' | 'description', value: string) => {
    setEditableVariants(prev => prev.map(v => {
      if (v.id === variantId) {
        return {
          ...v,
          [`edited${field.charAt(0).toUpperCase() + field.slice(1)}`]: value,
        };
      }
      return v;
    }));
  };

  const handleSelectVariant = async (variant: EditableVariant) => {
    try {
      // Save selected variant to ad library
      const response = await fetch('/api/aie/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shop,
          adRequestId: null, // Future: link to aie_ad_requests if tracking generation sessions
          variantId: null,   // Future: link to aie_ad_variants if storing all generated variants
          headline: variant.editedHeadline || variant.headline,
          primaryText: variant.editedPrimaryText || variant.primaryText,
          description: variant.editedDescription || variant.description,
          cta: variant.cta,
          platform,
          campaignGoal: goal,
          variantType: variant.variantType,
          imageUrls: selectedProducts.flatMap(p => p.images.map(img => img.url)),
          productMetadata: {
            products: selectedProducts.map(p => ({
              id: p.id,
              title: p.title,
              handle: p.handle,
            })),
          },
          status: 'draft',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResultsModalOpen(false);
        // Clear any existing errors and show success via console (Banner would require additional state)
        setError(null);
      } else {
        throw new Error(data.error?.message || 'Failed to save ad');
      }
    } catch (err) {
      logger.error('Error saving ad to library:', err as Error, { component: 'aie' });
      setError(err instanceof Error ? err.message : 'Failed to save ad to library');
    }
  };

  const formatScore = (score: number) => {
    const percentage = (score * 100).toFixed(0);
    if (score >= 0.8) return { text: `${percentage}% - Excellent`, variant: 'default' as const };
    if (score >= 0.6) return { text: `${percentage}% - Good`, variant: 'secondary' as const };
    return { text: `${percentage}% - Needs Improvement`, variant: 'outline' as const };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            AI Ad Generator
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Generate high-converting ad copy powered by RAG & best practices
          </p>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            border: 'none'
          }}>
            <CardHeader style={{ borderBottom: '1px solid #e5e7eb', padding: '24px' }}>
              <CardTitle style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
                Ad Generation Settings
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Label htmlFor="platform" style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Platform
                  </Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger id="platform" style={{
                      fontSize: '14px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: 'white'
                    }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Label htmlFor="goal" style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Campaign Goal
                  </Label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger id="goal" style={{
                      fontSize: '14px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: 'white'
                    }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goalOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product/Image Selection Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Label style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  Products & Images
                </Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Button
                    variant="outline"
                    onClick={() => setProductModalOpen(true)}
                    style={{
                      background: 'white',
                      color: '#0066cc',
                      border: '1px solid #0066cc',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Package className="w-4 h-4" />
                    Add Product
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setImageUrlModalOpen(true)}
                    style={{
                      background: 'white',
                      color: '#0066cc',
                      border: '1px solid #0066cc',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Add Custom Image URL
                  </Button>
                </div>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  Select a product and choose images, or add custom image URLs
                </p>
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-oxford-900">
                        Selected Products ({selectedProducts.length})
                      </h3>
                      <Button size="sm" variant="ghost" onClick={handleClearAll}>
                        Clear All
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {selectedProducts.map((product) => (
                        <div key={product.id}>
                          <div className="flex items-center gap-3">
                            {product.images[0]?.url && (
                              <img
                                src={product.images[0].url}
                                alt={product.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{product.title}</p>
                              <p className="text-xs text-gray-600">
                                {product.images.length} image{product.images.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveProduct(product.id)}
                            >
                              Remove
                            </Button>
                          </div>
                          <Separator className="mt-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Images */}
              {selectedImageUrls.length > 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-6 space-y-3">
                    <h3 className="font-semibold text-oxford-900">
                      Selected Images ({selectedImageUrls.length})
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedImageUrls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} alt={`Image ${idx + 1}`} className="w-24 h-24 object-cover rounded" />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => {
                              setSelectedImageUrls(selectedImageUrls.filter((_, i) => i !== idx));
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label htmlFor="description" style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Product/Service Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe your product or service. Include key benefits, features, and what makes it unique..."
                  maxLength={1000}
                  style={{
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    resize: 'none',
                    lineHeight: '1.5',
                    fontFamily: 'inherit'
                  }}
                />
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  Be specific - this helps the AI understand your offering ({description.length}/1000)
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label htmlFor="audience" style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Target Audience (Optional)
                </Label>
                <Input
                  id="audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Busy moms aged 25-40, Tech professionals, Fitness enthusiasts"
                  style={{
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                />
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  Helps personalize the ad copy
                </p>
              </div>

              <Button
                style={{
                  width: '100%',
                  background: !description.trim() || loading ? '#9ca3af' : '#0066cc',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: 'none',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.15s ease',
                  cursor: !description.trim() || loading ? 'not-allowed' : 'pointer'
                }}
                disabled={!description.trim() || loading}
                onClick={handleGenerate}
                onMouseEnter={(e) => {
                  if (!loading && description.trim()) {
                    e.currentTarget.style.background = '#0052a3';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && description.trim()) {
                    e.currentTarget.style.background = '#0066cc';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {loadingStep || 'Generating...'}
                  </>
                ) : (
                  'Generate Ad Variants'
                )}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Alert style={{
              background: '#fee2e2',
              border: '1px solid #dc2626',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <AlertDescription style={{ color: '#dc2626', fontSize: '14px' }}>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Progress Modal - Shows during generation */}
      {mounted && (
        <Dialog open={loading} onOpenChange={() => { }}>
          <DialogContent style={{ maxWidth: '448px', borderRadius: '12px', padding: 0 }}>
            <DialogHeader>
              <DialogTitle className="text-oxford-900">Generating Ad Variants</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">{loadingStep}</p>
              <Progress value={loadingProgress} className="w-full" />
              <p className="text-xs text-gray-600">
                This typically takes 10-15 seconds. We're analyzing best practices from our database and generating 3 unique ad variants optimized for your platform and goal.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Results Modal - Shows generated ad variants */}
      {mounted && resultsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-xl w-[80%] max-w-7xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-oxford-900">Ad Variants Generated</h2>
              <button
                onClick={() => setResultsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {result && (
                  <Alert className="bg-smart-50 border-smart-500">
                    <AlertDescription className="text-smart-700">
                      Generated {result.variants.length} variants in{' '}
                      {(result.metadata.generationTimeMs / 1000).toFixed(2)}s
                      {' • '}
                      AI Cost: ${result.metadata.aiCost.toFixed(4)}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editableVariants.map((variant) => {
                    const scoreInfo = formatScore(variant.predictedScore);

                    return (
                      <Card key={variant.id}>
                        <CardContent className="p-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-oxford-900">
                              Variant {variant.variantNumber}
                            </h3>
                            <Badge variant={scoreInfo.variant}>
                              {scoreInfo.text}
                            </Badge>
                          </div>

                          <Badge variant="outline">{variant.variantType}</Badge>

                          <Separator />

                          {/* Media Section */}
                          {selectedProducts.length > 0 && (
                            <>
                              <div>
                                <p className="text-sm font-semibold mb-2">
                                  Media ({selectedProducts.flatMap(p => p.images).length} {selectedProducts.flatMap(p => p.images).length === 1 ? 'image' : 'images'})
                                </p>
                                <div className={`grid gap-2 ${selectedProducts.flatMap(p => p.images).length === 1
                                    ? 'grid-cols-1'
                                    : 'grid-cols-[repeat(auto-fill,minmax(80px,1fr))]'
                                  }`}>
                                  {selectedProducts.flatMap(p => p.images).slice(0, 4).map((img, idx) => (
                                    <div
                                      key={idx}
                                      className="relative pb-[100%] bg-gray-100 rounded-lg overflow-hidden"
                                    >
                                      <img
                                        src={img.url}
                                        alt={img.altText || `Product image ${idx + 1}`}
                                        className="absolute inset-0 w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                  {selectedProducts.flatMap(p => p.images).length > 4 && (
                                    <div className="relative pb-[100%] bg-gray-100 rounded-lg flex items-center justify-center">
                                      <p className="text-sm text-gray-600 font-semibold">
                                        +{selectedProducts.flatMap(p => p.images).length - 4}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {selectedProducts.flatMap(p => p.images).length > 1 && (
                                  <p className="text-xs text-gray-600 text-center mt-1">
                                    Carousel
                                  </p>
                                )}
                              </div>
                              <Separator />
                            </>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor={`headline-${variant.id}`}>Headline</Label>
                            <Textarea
                              id={`headline-${variant.id}`}
                              value={variant.editedHeadline || ''}
                              onChange={(e) => handleVariantEdit(variant.id, 'headline', e.target.value)}
                              rows={2}
                              className="resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`primary-${variant.id}`}>Primary Text</Label>
                            <Textarea
                              id={`primary-${variant.id}`}
                              value={variant.editedPrimaryText || ''}
                              onChange={(e) => handleVariantEdit(variant.id, 'primaryText', e.target.value)}
                              rows={3}
                              className="resize-none"
                            />
                          </div>

                          {variant.description && (
                            <div className="space-y-2">
                              <Label htmlFor={`desc-${variant.id}`}>Description</Label>
                              <Textarea
                                id={`desc-${variant.id}`}
                                value={variant.editedDescription || ''}
                                onChange={(e) => handleVariantEdit(variant.id, 'description', e.target.value)}
                                rows={2}
                                className="resize-none"
                              />
                            </div>
                          )}

                          <div>
                            <p className="text-sm font-semibold mb-1">Call-to-Action</p>
                            <Badge>{variant.cta}</Badge>
                          </div>

                          <Separator />

                          <div>
                            <p className="text-sm font-semibold mb-2">Quality Scores</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="secondary" className="bg-dodger-50 text-dodger-700">
                                Hook: {(variant.scoreBreakdown.hook_strength * 100).toFixed(0)}%
                              </Badge>
                              <Badge variant="secondary" className="bg-dodger-50 text-dodger-700">
                                CTA: {(variant.scoreBreakdown.cta_clarity * 100).toFixed(0)}%
                              </Badge>
                              <Badge variant="secondary" className="bg-dodger-50 text-dodger-700">
                                Platform: {(variant.scoreBreakdown.platform_compliance * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>

                          {variant.headlineAlternatives.length > 0 && (
                            <>
                              <Separator />
                              <div>
                                <p className="text-sm font-semibold mb-1">Alternative Headlines</p>
                                <div className="space-y-1">
                                  {variant.headlineAlternatives.slice(0, 2).map((alt, idx) => (
                                    <p key={idx} className="text-xs text-gray-600">
                                      • {alt}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          <Separator />

                          <Button
                            className="w-full bg-smart-500 hover:bg-smart-600"
                            onClick={() => handleSelectVariant(variant)}
                          >
                            Select This Variant
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection Modal - Only render after mount to prevent hydration mismatch */}
      {mounted && (
        <Dialog
          open={productModalOpen}
          onOpenChange={(open) => {
            setProductModalOpen(open);
            if (!open) setSearchQuery('');
          }}
        >
          <DialogContent style={{
            maxWidth: '960px',
            width: '90vw',
            maxHeight: '80vh',
            borderRadius: '12px',
            padding: 0,
            overflow: 'hidden',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb'
          }}>
            <DialogHeader style={{
              padding: '20px 32px 16px 32px',
              borderBottom: '1px solid #e5e7eb',
              background: 'white',
              flexShrink: 0,
              position: 'relative'
            }}>
              <button
                onClick={() => {
                  setProductModalOpen(false);
                  setSearchQuery('');
                }}
                style={{
                  position: 'absolute',
                  right: '24px',
                  top: '20px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                  color: '#6b7280'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#111827';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6L14 14M6 14L14 6" />
                </svg>
              </button>
              <DialogTitle style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#111827',
                paddingRight: '40px'
              }}>
                Add Products
              </DialogTitle>
            </DialogHeader>

            <div style={{
              padding: '24px 32px 32px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto',
              flex: 1,
              background: '#f9fafb',
              minHeight: 0
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <Label htmlFor="product-search" style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Search Products
                </Label>
                <Input
                  id="product-search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Start typing to search..."
                  autoFocus
                  style={{
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {selectedProducts.length > 0 && (
                <div style={{
                  background: '#dbeafe',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '12px 16px'
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#1d4ed8',
                    margin: 0,
                    fontWeight: 500
                  }}>
                    {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {loadingProducts && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '32px 0' }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#6b7280' }} />
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Loading products...</p>
                </div>
              )}

              {!loadingProducts && products.length === 0 && (
                <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '32px 0', margin: 0 }}>
                  {searchQuery ? 'No products found' : 'Start typing to search products'}
                </p>
              )}

              {!loadingProducts && products.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '16px',
                  width: '100%'
                }}>
                  {products.map((product) => {
                    const isSelected = selectedProducts.find(p => p.id === product.id);
                    return (
                      <div
                        key={product.id}
                        style={{
                          background: 'white',
                          border: isSelected ? '2px solid #0066cc' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '12px',
                          cursor: 'pointer',
                          opacity: isSelected ? 0.95 : 1,
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          minWidth: 0
                        }}
                        onClick={() => handleProductSelect(product)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {product.images[0]?.url && (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            style={{
                              width: '100%',
                              height: '160px',
                              objectFit: 'cover',
                              borderRadius: '6px'
                            }}
                          />
                        )}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          flex: 1,
                          minWidth: 0
                        }}>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#111827',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {product.title}
                          </p>
                          {isSelected && (
                            <span style={{
                              background: '#0066cc',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 500,
                              alignSelf: 'flex-start'
                            }}>
                              Added
                            </span>
                          )}
                          {product.description && (
                            <p style={{
                              fontSize: '13px',
                              color: '#6b7280',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: '1.5'
                            }}>
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{
              padding: '18px 32px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'white',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProductModalOpen(false);
                    setSearchQuery('');
                  }}
                  style={{
                    background: 'white',
                    color: '#4b5563',
                    border: '1px solid #e5e7eb',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setProductModalOpen(false);
                    setSearchQuery('');
                  }}
                  style={{
                    background: '#0066cc',
                    color: 'white',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: 'none',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0052a3';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0066cc';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Selection Modal - Shows for ONE product at a time */}
      {mounted && currentProductForImageSelection && (
        <ImageSelectionModal
          product={currentProductForImageSelection}
          onComplete={handleImageSelectionComplete}
          onCancel={handleImageSelectionCancel}
          isOpen={imageSelectionModalOpen}
        />
      )}

      {/* Image URL Modal */}
      {mounted && (
        <Dialog
          open={imageUrlModalOpen}
          onOpenChange={(open) => {
            setImageUrlModalOpen(open);
            if (!open) setTempImageUrl('');
          }}
        >
          <DialogContent style={{
            maxWidth: '500px',
            borderRadius: '12px',
            padding: 0,
            background: 'white',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb'
          }}>
            <DialogHeader style={{
              padding: '20px 32px 16px 32px',
              borderBottom: '1px solid #e5e7eb',
              background: 'white'
            }}>
              <DialogTitle style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>Add Product Image URL</DialogTitle>
            </DialogHeader>

            <div style={{ padding: '24px 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f9fafb' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label htmlFor="image-url" style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Image URL
                </Label>
                <Input
                  id="image-url"
                  value={tempImageUrl}
                  onChange={(e) => setTempImageUrl(e.target.value)}
                  placeholder="https://example.com/product-image.jpg"
                  autoFocus
                  style={{
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Enter a direct URL to your product image</p>
              </div>

              {tempImageUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Preview</p>
                  <img src={tempImageUrl} alt="Preview" style={{ width: '128px', height: '128px', objectFit: 'cover', borderRadius: '8px' }} />
                </div>
              )}
            </div>

            <div style={{
              padding: '18px 32px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'white',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setImageUrlModalOpen(false);
                    setTempImageUrl('');
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#6b7280',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImageUrlSubmit}
                  disabled={!tempImageUrl.trim()}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'white',
                    background: !tempImageUrl.trim() ? '#9ca3af' : '#0066cc',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: !tempImageUrl.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (tempImageUrl.trim()) {
                      e.currentTarget.style.background = '#0052a3';
                      e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tempImageUrl.trim()) {
                      e.currentTarget.style.background = '#0066cc';
                      e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  Add Image
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
