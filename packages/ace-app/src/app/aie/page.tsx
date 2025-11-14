/**
 * AIE Ad Generator Page
 * Main UI for generating AI-powered ad copy
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  Text,
  Badge,
  Divider,
  BlockStack,
  InlineStack,
  Thumbnail,
  Icon,
  Spinner,
  Modal,
  ProgressBar,
} from '@shopify/polaris';
import { SearchIcon, ProductIcon } from '@shopify/polaris-icons';
import { authenticatedFetch } from '@/lib/shopify/api-client';

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
    <Modal
      open={isOpen}
      onClose={handleCancel}
      title={`Select Images from ${product.title}`}
      primaryAction={{
        content: tempSelectedImages.length > 0
          ? `Add ${tempSelectedImages.length} Image${tempSelectedImages.length !== 1 ? 's' : ''}`
          : 'Add All Images',
        onAction: handleDone,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: handleCancel,
        },
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="info">
            <Text as="p" variant="bodySm">
              Select specific images from this product, or click "Add All Images" to include all {product.images.length} images.
            </Text>
          </Banner>

          {product.images.length === 0 ? (
            <Banner tone="warning">
              <Text as="p" variant="bodySm">
                This product has no images. You can still add it, but consider adding images to your product first.
              </Text>
            </Banner>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
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
                      border: isSelected ? '3px solid #008060' : '2px solid #e1e3e5',
                      borderRadius: '12px',
                      padding: '8px',
                      background: isSelected ? '#f0fff4' : 'white',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Thumbnail
                      source={image.url}
                      alt={image.altText || `${product.title} - Image ${idx + 1}`}
                      size="large"
                    />
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: '#008060',
                          color: 'white',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tempSelectedImages.length > 0 && (
            <Banner tone="success">
              <Text as="p" variant="bodySm" fontWeight="semibold">
                {tempSelectedImages.length} of {product.images.length} images selected
              </Text>
            </Banner>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
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
      console.error('Error fetching products:', err);
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
      console.error('Generation error:', err);
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
        console.log('✅ Ad saved to library successfully!');
      } else {
        throw new Error(data.error?.message || 'Failed to save ad');
      }
    } catch (err) {
      console.error('Error saving ad to library:', err);
      setError(err instanceof Error ? err.message : 'Failed to save ad to library');
    }
  };

  const formatScore = (score: number) => {
    const percentage = (score * 100).toFixed(0);
    if (score >= 0.8) return { text: `${percentage}% - Excellent`, status: 'success' as const };
    if (score >= 0.6) return { text: `${percentage}% - Good`, status: 'info' as const };
    return { text: `${percentage}% - Needs Improvement`, status: 'warning' as const };
  };

  return (
    <Page
      title="AI Ad Generator"
      subtitle="Generate high-converting ad copy powered by RAG & best practices"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Ad Generation Settings
              </Text>

              <FormLayout>
                <Select
                  label="Platform"
                  options={platformOptions}
                  value={platform}
                  onChange={setPlatform}
                />

                <Select
                  label="Campaign Goal"
                  options={goalOptions}
                  value={goal}
                  onChange={setGoal}
                />

                {/* Product/Image Selection Buttons */}
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Products & Images
                  </Text>
                  <InlineStack gap="300" wrap>
                    <Button
                      icon={ProductIcon}
                      onClick={() => setProductModalOpen(true)}
                    >
                      Add Product
                    </Button>
                    <Button
                      onClick={() => setImageUrlModalOpen(true)}
                    >
                      Add Custom Image URL
                    </Button>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Select a product and choose images, or add custom image URLs
                  </Text>
                </BlockStack>

                {/* Selected Products */}
                {selectedProducts.length > 0 && (
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="headingSm">
                          Selected Products ({selectedProducts.length})
                        </Text>
                        <Button size="slim" onClick={handleClearAll}>
                          Clear All
                        </Button>
                      </InlineStack>

                      <BlockStack gap="200">
                        {selectedProducts.map((product) => (
                          <div key={product.id}>
                            <InlineStack gap="300" blockAlign="center" wrap={false}>
                              {product.images[0]?.url && (
                                <Thumbnail
                                  source={product.images[0].url}
                                  alt={product.title}
                                  size="small"
                                />
                              )}
                              <BlockStack gap="050">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {product.title}
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {product.images.length} image{product.images.length !== 1 ? 's' : ''}
                                </Text>
                              </BlockStack>
                              <div style={{ marginLeft: 'auto' }}>
                                <Button
                                  size="slim"
                                  onClick={() => handleRemoveProduct(product.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </InlineStack>
                            <Divider />
                          </div>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  </Card>
                )}

                {/* Selected Images */}
                {selectedImageUrls.length > 0 && (
                  <Card>
                    <BlockStack gap="300">
                      <Text as="p" variant="headingSm">
                        Selected Images ({selectedImageUrls.length})
                      </Text>
                      <InlineStack gap="200" wrap>
                        {selectedImageUrls.map((url, idx) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <Thumbnail source={url} alt={`Image ${idx + 1}`} size="medium" />
                            <div
                              style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'white',
                                borderRadius: '50%',
                                padding: '2px',
                              }}
                            >
                              <Button
                                size="slim"
                                onClick={() => {
                                  setSelectedImageUrls(selectedImageUrls.filter((_, i) => i !== idx));
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                )}

                <TextField
                  label="Product/Service Description"
                  value={description}
                  onChange={setDescription}
                  multiline={4}
                  autoComplete="off"
                  placeholder="Describe your product or service. Include key benefits, features, and what makes it unique..."
                  helpText="Be specific - this helps the AI understand your offering"
                  maxLength={1000}
                  showCharacterCount
                />

                <TextField
                  label="Target Audience (Optional)"
                  value={targetAudience}
                  onChange={setTargetAudience}
                  autoComplete="off"
                  placeholder="e.g., Busy moms aged 25-40, Tech professionals, Fitness enthusiasts"
                  helpText="Helps personalize the ad copy"
                />

                <Button
                  variant="primary"
                  loading={loading}
                  onClick={handleGenerate}
                  disabled={!description.trim()}
                >
                  {loading ? loadingStep || 'Generating...' : 'Generate Ad Variants'}
                </Button>
              </FormLayout>

            </BlockStack>
          </Card>
        </Layout.Section>

        {error && (
          <Layout.Section>
            <Banner tone="critical" title="Generation Failed">
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}
      </Layout>

      {/* Progress Modal - Shows during generation */}
      {mounted && (
        <Modal
          open={loading}
          onClose={() => {}}
          title="Generating Ad Variants"
          primaryAction={undefined}
          secondaryActions={undefined}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                {loadingStep}
              </Text>
              <ProgressBar progress={loadingProgress} size="small" tone="primary" />
              <Text as="p" variant="bodySm" tone="subdued">
                This typically takes 10-15 seconds. We're analyzing best practices from our database and generating 3 unique ad variants optimized for your platform and goal.
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Results Modal - Shows generated ad variants */}
      {mounted && resultsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '80%',
            maxWidth: '1400px',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e1e3e5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text as="h2" variant="headingLg">
                Ad Variants Generated
              </Text>
              <button
                onClick={() => setResultsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: '#6d7175'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1
            }}>
              <BlockStack gap="400">
                {result && (
                  <Banner tone="success">
                    <Text as="p" variant="bodySm">
                      Generated {result.variants.length} variants in{' '}
                      {(result.metadata.generationTimeMs / 1000).toFixed(2)}s
                      {' • '}
                      AI Cost: ${result.metadata.aiCost.toFixed(4)}
                    </Text>
                  </Banner>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '16px'
                }}>
                {editableVariants.map((variant) => {
                  const scoreInfo = formatScore(variant.predictedScore);

                  return (
                    <Card key={variant.id}>
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h3" variant="headingSm">
                            Variant {variant.variantNumber}
                          </Text>
                          <Badge tone={scoreInfo.status} size="small">
                            {scoreInfo.text}
                          </Badge>
                        </InlineStack>

                        <Badge>{variant.variantType}</Badge>

                        <Divider />

                        {/* Media Section */}
                        {selectedProducts.length > 0 && (
                          <>
                            <div>
                              <Text as="p" variant="bodySm" fontWeight="semibold">
                                Media ({selectedProducts.flatMap(p => p.images).length} {selectedProducts.flatMap(p => p.images).length === 1 ? 'image' : 'images'})
                              </Text>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: selectedProducts.flatMap(p => p.images).length === 1 ? '1fr' : 'repeat(auto-fill, minmax(80px, 1fr))',
                                gap: '8px',
                                marginTop: '8px'
                              }}>
                                {selectedProducts.flatMap(p => p.images).slice(0, 4).map((img, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      position: 'relative',
                                      paddingBottom: '100%',
                                      backgroundColor: '#f6f6f7',
                                      borderRadius: '8px',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    <img
                                      src={img.url}
                                      alt={img.altText || `Product image ${idx + 1}`}
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                      }}
                                    />
                                  </div>
                                ))}
                                {selectedProducts.flatMap(p => p.images).length > 4 && (
                                  <div
                                    style={{
                                      position: 'relative',
                                      paddingBottom: '100%',
                                      backgroundColor: '#f6f6f7',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Text as="p" variant="bodySm" tone="subdued" fontWeight="semibold">
                                      +{selectedProducts.flatMap(p => p.images).length - 4}
                                    </Text>
                                  </div>
                                )}
                              </div>
                              {selectedProducts.flatMap(p => p.images).length > 1 && (
                                <Text as="p" variant="bodyXs" tone="subdued" alignment="center">
                                  Carousel
                                </Text>
                              )}
                            </div>
                            <Divider />
                          </>
                        )}

                        <TextField
                          label="Headline"
                          value={variant.editedHeadline || ''}
                          onChange={(value) => handleVariantEdit(variant.id, 'headline', value)}
                          autoComplete="off"
                          multiline={2}
                        />

                        <TextField
                          label="Primary Text"
                          value={variant.editedPrimaryText || ''}
                          onChange={(value) => handleVariantEdit(variant.id, 'primaryText', value)}
                          autoComplete="off"
                          multiline={3}
                        />

                        {variant.description && (
                          <TextField
                            label="Description"
                            value={variant.editedDescription || ''}
                            onChange={(value) => handleVariantEdit(variant.id, 'description', value)}
                            autoComplete="off"
                            multiline={2}
                          />
                        )}

                        <div>
                          <Text as="p" variant="bodySm" fontWeight="semibold">
                            Call-to-Action
                          </Text>
                          <Badge>{variant.cta}</Badge>
                        </div>

                        <Divider />

                        <div>
                          <Text as="p" variant="bodySm" fontWeight="semibold">
                            Quality Scores
                          </Text>
                          <InlineStack gap="100" wrap>
                            <Badge tone="info">{`Hook: ${(variant.scoreBreakdown.hook_strength * 100).toFixed(0)}%`}</Badge>
                            <Badge tone="info">{`CTA: ${(variant.scoreBreakdown.cta_clarity * 100).toFixed(0)}%`}</Badge>
                            <Badge tone="info">{`Platform: ${(variant.scoreBreakdown.platform_compliance * 100).toFixed(0)}%`}</Badge>
                          </InlineStack>
                        </div>

                        {variant.headlineAlternatives.length > 0 && (
                          <>
                            <Divider />
                            <div>
                              <Text as="p" variant="bodySm" fontWeight="semibold">
                                Alternative Headlines
                              </Text>
                              <BlockStack gap="050">
                                {variant.headlineAlternatives.slice(0, 2).map((alt, idx) => (
                                  <Text key={idx} as="p" variant="bodyXs" tone="subdued">
                                    • {alt}
                                  </Text>
                                ))}
                              </BlockStack>
                            </div>
                          </>
                        )}

                        <Divider />

                        <Button
                          variant="primary"
                          fullWidth
                          onClick={() => handleSelectVariant(variant)}
                        >
                          Select This Variant
                        </Button>
                      </BlockStack>
                    </Card>
                  );
                })}
                </div>
              </BlockStack>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection Modal - Only render after mount to prevent hydration mismatch */}
      {mounted && (
        <Modal
          open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setSearchQuery('');
        }}
        title="Add Products"
        primaryAction={{
          content: 'Done',
          onAction: () => {
            setProductModalOpen(false);
            setSearchQuery('');
          },
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setProductModalOpen(false);
              setSearchQuery('');
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner>
              <Text as="p" variant="bodySm">
                Select multiple products for a collection ad. Click products to add them.
              </Text>
            </Banner>

            <TextField
              label="Search Products"
              value={searchQuery}
              onChange={handleSearchChange}
              autoComplete="off"
              placeholder="Start typing to search..."
              prefix={<Icon source={SearchIcon} />}
              autoFocus
            />

            {selectedProducts.length > 0 && (
              <Banner tone="info">
                <Text as="p" variant="bodySm">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </Text>
              </Banner>
            )}

            {loadingProducts && (
              <InlineStack align="center" blockAlign="center">
                <Spinner size="small" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Loading products...
                </Text>
              </InlineStack>
            )}

            {!loadingProducts && products.length === 0 && (
              <Text as="p" variant="bodySm" tone="subdued">
                {searchQuery ? 'No products found' : 'Start typing to search products'}
              </Text>
            )}

            {!loadingProducts && products.length > 0 && (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <BlockStack gap="200">
                  {products.map((product) => {
                    const isSelected = selectedProducts.find(p => p.id === product.id);
                    return (
                      <Card key={product.id}>
                        <div
                          onClick={() => handleProductSelect(product)}
                          style={{
                            cursor: 'pointer',
                            opacity: isSelected ? 0.6 : 1,
                            position: 'relative',
                          }}
                        >
                          <InlineStack gap="300" blockAlign="center">
                            {product.images[0]?.url && (
                              <Thumbnail
                                source={product.images[0].url}
                                alt={product.title}
                                size="medium"
                              />
                            )}
                            <BlockStack gap="100">
                              <InlineStack gap="200" blockAlign="center">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {product.title}
                                </Text>
                                {isSelected && (
                                  <Badge tone="success">Added</Badge>
                                )}
                              </InlineStack>
                              {product.description && (
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {product.description.substring(0, 100)}
                                  {product.description.length > 100 && '...'}
                                </Text>
                              )}
                            </BlockStack>
                          </InlineStack>
                        </div>
                      </Card>
                    );
                  })}
                </BlockStack>
              </div>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
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
        <Modal
          open={imageUrlModalOpen}
        onClose={() => {
          setImageUrlModalOpen(false);
          setTempImageUrl('');
        }}
        title="Add Product Image URL"
        primaryAction={{
          content: 'Add Image',
          onAction: handleImageUrlSubmit,
          disabled: !tempImageUrl.trim(),
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setImageUrlModalOpen(false);
              setTempImageUrl('');
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Image URL"
              value={tempImageUrl}
              onChange={setTempImageUrl}
              autoComplete="off"
              placeholder="https://example.com/product-image.jpg"
              helpText="Enter a direct URL to your product image"
              autoFocus
            />

            {tempImageUrl && (
              <div>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  Preview
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Thumbnail source={tempImageUrl} alt="Preview" size="large" />
                </div>
              </div>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
      )}
    </Page>
  );
}
