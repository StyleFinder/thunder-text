"use client";

import { useState, useEffect } from 'react';
import { ContentTypeSelector } from '@/components/content-center/ContentTypeSelector';
import { GenerationControls, GenerationParams } from '@/components/content-center/GenerationControls';
import { GenerationResultView } from '@/components/content-center/GenerationResultView';
import { ContentLoader } from '@/components/ui/loading/ContentLoader';
import { ArrowLeft, FileText, Clock, ChevronRight, TrendingUp, User } from 'lucide-react';
import { ContentType, GeneratedContent } from '@/types/content-center';
import { useShop } from '@/hooks/useShop';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type GenerationStep = 'select-type' | 'configure' | 'result';

export default function ContentCenterPage() {
  const { shopId, shopDomain, shop, isLoading: shopLoading, hasShop } = useShop();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState<GenerationStep>('select-type');
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    content: GeneratedContent;
    generationTimeMs: number;
    costEstimate: number;
  } | null>(null);
  const [recentContent, setRecentContent] = useState<GeneratedContent[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [stats, setStats] = useState({
    totalContent: 0,
    thisMonth: 0,
    savedDrafts: 0,
    hasVoiceProfile: false,
  });

  // Fetch recent content and stats on mount
  useEffect(() => {
    const fetchContentData = async () => {
      if (!hasShop) return;

      setIsLoadingRecent(true);
      try {
        const baseParams = new URLSearchParams();
        if (shopId) {
          baseParams.append('shopId', shopId);
        }

        // Fetch recent content
        const recentParams = new URLSearchParams(baseParams);
        recentParams.append('page', '1');
        recentParams.append('page_size', '5');
        recentParams.append('sort_by', 'created_at');
        recentParams.append('sort_order', 'desc');

        // Fetch all content for total count
        const allParams = new URLSearchParams(baseParams);
        allParams.append('page', '1');
        allParams.append('page_size', '1');

        // Fetch this month's content
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);
        const monthParams = new URLSearchParams(baseParams);
        monthParams.append('page', '1');
        monthParams.append('page_size', '1');
        monthParams.append('date_from', thisMonthStart.toISOString());

        // Fetch saved drafts
        const savedParams = new URLSearchParams(baseParams);
        savedParams.append('page', '1');
        savedParams.append('page_size', '1');
        savedParams.append('is_saved', 'true');

        const [recentRes, allRes, monthRes, savedRes] = await Promise.all([
          fetch(`/api/content-center/content?${recentParams.toString()}`, {
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`/api/content-center/content?${allParams.toString()}`, {
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`/api/content-center/content?${monthParams.toString()}`, {
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`/api/content-center/content?${savedParams.toString()}`, {
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);

        if (recentRes.ok) {
          const data = await recentRes.json();
          if (data.success && data.data?.content) {
            setRecentContent(data.data.content);
          }
        }

        // Update stats
        const newStats = { ...stats };

        if (allRes.ok) {
          const data = await allRes.json();
          if (data.success) {
            newStats.totalContent = data.data?.total_count || 0;
          }
        }

        if (monthRes.ok) {
          const data = await monthRes.json();
          if (data.success) {
            newStats.thisMonth = data.data?.total_count || 0;
          }
        }

        if (savedRes.ok) {
          const data = await savedRes.json();
          if (data.success) {
            newStats.savedDrafts = data.data?.total_count || 0;
          }
        }

        // Check for voice profile
        try {
          const voiceParams = new URLSearchParams();
          if (shopId) {
            voiceParams.append('shopId', shopId);
          }
          const voiceRes = await fetch(`/api/content-center/voice?${voiceParams.toString()}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (voiceRes.ok) {
            const voiceData = await voiceRes.json();
            newStats.hasVoiceProfile = voiceData.success && voiceData.data?.voice_profile;
          }
        } catch {
          // Voice profile check failed, leave as false
        }

        setStats(newStats);
      } catch (error) {
        logger.error('Error fetching content data:', error as Error, { component: 'content-center' });
      } finally {
        setIsLoadingRecent(false);
      }
    };

    fetchContentData();
  }, [hasShop, shopId]);

  const handleSelectType = (type: ContentType) => {
    setSelectedType(type);
    setCurrentStep('configure');
  };

  const handleGenerate = async (params: GenerationParams) => {
    if (!selectedType) return;

    if (!hasShop) {
      alert('Shop authentication required. Please ensure you are logged in.');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/content-center/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_type: selectedType,
          topic: params.topic,
          word_count: params.wordCount,
          tone_intensity: params.toneIntensity,
          cta_type: params.ctaType,
          custom_cta: params.customCTA,
          additional_context: params.additionalContext,
          save: false,
          // Include both shopId and shopDomain for API flexibility
          shopId,
          shopDomain: shopDomain || shop,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();

      if (data.success) {
        setGenerationResult({
          content: data.data.content,
          generationTimeMs: data.data.generation_time_ms,
          costEstimate: data.data.cost_estimate,
        });
        setCurrentStep('result');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      logger.error('Error generating content:', error as Error, { component: 'content-center' });
      alert(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (content: GeneratedContent) => {
    if (!hasShop) {
      alert('Shop authentication required.');
      return;
    }

    try {
      const response = await fetch(`/api/content-center/content/${content.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generated_text: content.generated_text,
          is_saved: true,
          shopId,
          shopDomain: shopDomain || shop,
        }),
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      alert('Content saved successfully!');
    } catch (error) {
      logger.error('Error saving content:', error as Error, { component: 'content-center' });
      alert('Failed to save content. Please try again.');
    }
  };

  const handleRegenerate = () => {
    setCurrentStep('configure');
    setGenerationResult(null);
  };

  const handleExport = (format: 'txt' | 'html' | 'md') => {
    if (!generationResult) return;

    const content = generationResult.content.generated_text;
    let blob: Blob;
    let filename: string;

    switch (format) {
      case 'txt':
        // Strip HTML tags for plain text
        const text = content.replace(/<[^>]*>/g, '');
        blob = new Blob([text], { type: 'text/plain' });
        filename = `content-${generationResult.content.id}.txt`;
        break;
      case 'html':
        blob = new Blob([content], { type: 'text/html' });
        filename = `content-${generationResult.content.id}.html`;
        break;
      case 'md':
        // Simple HTML to Markdown conversion
        const markdown = content
          .replace(/<h1>/g, '# ')
          .replace(/<h2>/g, '## ')
          .replace(/<h3>/g, '### ')
          .replace(/<\/h[1-6]>/g, '\n\n')
          .replace(/<strong>/g, '**')
          .replace(/<\/strong>/g, '**')
          .replace(/<em>/g, '*')
          .replace(/<\/em>/g, '*')
          .replace(/<p>/g, '')
          .replace(/<\/p>/g, '\n\n')
          .replace(/<br\s*\/?>/g, '\n');
        blob = new Blob([markdown], { type: 'text/markdown' });
        filename = `content-${generationResult.content.id}.md`;
        break;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackToTypeSelection = () => {
    setCurrentStep('select-type');
    setSelectedType(null);
    setGenerationResult(null);
  };

  // Helper function to format content type labels
  const formatContentType = (type: ContentType): string => {
    const labels: Record<ContentType, string> = {
      blog: 'Blog Post',
      ad: 'Ad Copy',
      store_copy: 'Store Copy',
      social_facebook: 'Facebook',
      social_instagram: 'Instagram',
      social_tiktok: 'TikTok',
    };
    return labels[type] || type;
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Build the library URL based on current path
  const getLibraryUrl = () => {
    // If we're on a shop-scoped route, use it
    if (pathname?.includes('/stores/') && shopId) {
      return `/stores/${shopId}/content-center/library`;
    }
    return '/content-center/library';
  };

  // Build the voice profile URL based on current path
  const getVoiceUrl = () => {
    // If we're on a shop-scoped route, use it
    if (pathname?.includes('/stores/') && shopId) {
      return `/stores/${shopId}/content-center/voice`;
    }
    return '/content-center/voice';
  };

  // Show loading state while shop is initializing
  if (shopLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', gap: '24px' }}>
          <ContentLoader
            message="Loading..."
            size="lg"
            variant="pulse"
          />
        </div>
      </div>
    );
  }

  // Show error if no shop context
  if (!hasShop) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#003366', marginBottom: '8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
              Authentication Required
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
              Please log in to access the Content Center.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        {currentStep !== 'select-type' && (
          <button
            onClick={
              currentStep === 'configure'
                ? handleBackToTypeSelection
                : handleRegenerate
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'transparent',
              color: '#0066cc',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f7ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mb-8">
        {currentStep === 'select-type' && (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {/* Total Content Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  padding: '20px',
                }}
              >
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  Total Content
                </p>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#003366', margin: '0 0 8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  {stats.totalContent}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                  <TrendingUp style={{ width: '14px', height: '14px', color: '#22c55e' }} />
                  <span style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>All time</span>
                </div>
              </div>

              {/* This Month Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  padding: '20px',
                }}
              >
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  This Month
                </p>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#003366', margin: '0 0 8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  {stats.thisMonth}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                  <Clock style={{ width: '14px', height: '14px' }} />
                  <span style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Last 30 days</span>
                </div>
              </div>

              {/* Saved Drafts Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  padding: '20px',
                }}
              >
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  Saved Drafts
                </p>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#003366', margin: '0 0 8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  {stats.savedDrafts}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                  <FileText style={{ width: '14px', height: '14px' }} />
                  <span style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Ready to edit</span>
                </div>
              </div>

              {/* Voice Profile Card */}
              <Link
                href={getVoiceUrl()}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.15)';
                    e.currentTarget.style.borderColor = '#0066cc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    Voice Profile
                  </p>
                  <div style={{ margin: '8px 0 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background: stats.hasVoiceProfile ? '#dcfce7' : '#fef3c7',
                        color: stats.hasVoiceProfile ? '#166534' : '#92400e',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      {stats.hasVoiceProfile ? 'Active' : 'Not Set'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                    <User style={{ width: '14px', height: '14px' }} />
                    <span style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      {stats.hasVoiceProfile ? 'Brand voice ready' : 'Set up your voice'}
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Progress Indicator */}
            <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div className="flex items-center gap-2">
                <div
                  style={{
                    height: '8px',
                    width: '8px',
                    borderRadius: '50%',
                    background: currentStep === 'select-type' ? '#0066cc' : '#e5e7eb',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: currentStep === 'select-type' ? 600 : 400,
                    color: currentStep === 'select-type' ? '#003366' : '#6b7280',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Select Type
                </span>
              </div>

              <div style={{ height: '1px', width: '48px', background: '#e5e7eb' }} />

              <div className="flex items-center gap-2">
                <div
                  style={{
                    height: '8px',
                    width: '8px',
                    borderRadius: '50%',
                    background: currentStep === 'configure' ? '#0066cc' : '#e5e7eb',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: currentStep === 'configure' ? 600 : 400,
                    color: currentStep === 'configure' ? '#003366' : '#6b7280',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Configure
                </span>
              </div>

              <div style={{ height: '1px', width: '48px', background: '#e5e7eb' }} />

              <div className="flex items-center gap-2">
                <div
                  style={{
                    height: '8px',
                    width: '8px',
                    borderRadius: '50%',
                    background: currentStep === 'result' ? '#0066cc' : '#e5e7eb',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: currentStep === 'result' ? 600 : 400,
                    color: currentStep === 'result' ? '#003366' : '#6b7280',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Review
                </span>
              </div>
            </div>

            <ContentTypeSelector
              selectedType={selectedType}
              onSelectType={handleSelectType}
            />

            {/* Recent Content Section */}
            <div style={{ marginTop: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  Recent Content
                </h2>
                <Link
                  href={getLibraryUrl()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#0066cc',
                    fontSize: '14px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden',
                }}
              >
                {isLoadingRecent ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <ContentLoader
                      message="Loading recent content..."
                      size="sm"
                      variant="pulse"
                    />
                  </div>
                ) : recentContent.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <FileText style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '16px', fontWeight: 500, color: '#6b7280', margin: '0 0 4px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      No content yet
                    </p>
                    <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      Select a content type above to start creating
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {recentContent.map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          borderBottom: index < recentContent.length - 1 ? '1px solid #f3f4f6' : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: '#f0f7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileText style={{ width: '20px', height: '20px', color: '#0066cc' }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#003366',
                            margin: '0 0 4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}>
                            {item.topic || 'Untitled Content'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                background: '#f3f4f6',
                                color: '#6b7280',
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              }}
                            >
                              {formatContentType(item.content_type)}
                            </span>
                            <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                              {item.word_count} words
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', flexShrink: 0 }}>
                          <Clock style={{ width: '14px', height: '14px' }} />
                          <span style={{ fontSize: '12px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {currentStep === 'configure' && selectedType && !isGenerating && (
          <GenerationControls
            contentType={selectedType}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', gap: '24px' }}>
            <ContentLoader
              message="Generating your content..."
              size="lg"
              variant="pulse"
            />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: 600, color: '#003366', marginBottom: '8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                Creating amazing content
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                This usually takes 15-30 seconds
              </p>
            </div>
          </div>
        )}

        {currentStep === 'result' && generationResult && (
          <GenerationResultView
            result={generationResult.content}
            generationTimeMs={generationResult.generationTimeMs}
            costEstimate={generationResult.costEstimate}
            onSave={handleSave}
            onRegenerate={handleRegenerate}
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  );
}
