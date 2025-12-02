'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { logger } from '@/lib/logger'
import {
  Plus,
  Trash2,
  Search,
  FileText,
  Play,
  Image as ImageIcon,
  Link2,
  Type,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

interface BestPractice {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  goal: string;
  quality_score?: number;
  priority_score: number;
  is_active: boolean;
  uploaded_at: string;
  metadata?: {
    tags?: string[];
    key_insights?: string[];
  };
}

interface ProcessingResult {
  success: boolean;
  best_practice_id?: string;
  metadata: {
    title: string;
    platform: string;
    category: string;
    goal: string;
    description: string;
    quality_score: number;
    priority_score: number;
    extracted_insights: string[];
    tags: string[];
    example_quotes?: string[];
  };
  warnings?: string[];
  errors?: string[];
}

const PLATFORMS = [
  { label: 'All Platforms', value: 'all' },
  { label: 'Meta', value: 'meta' },
  { label: 'Google', value: 'google' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Pinterest', value: 'pinterest' },
  { label: 'Multi-Platform', value: 'multi' },
];

const CATEGORIES = [
  { label: 'All Categories', value: 'all' },
  { label: 'Ad Copy', value: 'ad-copy' },
  { label: 'Targeting', value: 'targeting' },
  { label: 'Creative Strategy', value: 'creative-strategy' },
  { label: 'Campaign Optimization', value: 'campaign-optimization' },
  { label: 'Audience Building', value: 'audience-building' },
  { label: 'Conversion Optimization', value: 'conversion-optimization' },
  { label: 'Content Strategy', value: 'content-strategy' },
  { label: 'Analytics', value: 'analytics' },
  { label: 'Budget Management', value: 'budget-management' },
  { label: 'Testing Strategies', value: 'testing-strategies' },
];

const GOALS = [
  { label: 'Awareness', value: 'awareness' },
  { label: 'Engagement', value: 'engagement' },
  { label: 'Conversion', value: 'conversion' },
];

export default function BestPracticesPage() {
  const [practices, setPractices] = useState<BestPractice[]>([]);
  const [filteredPractices, setFilteredPractices] = useState<BestPractice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalActive, setUploadModalActive] = useState(false);

  // Upload state
  const [uploadMode, setUploadMode] = useState('file'); // 'file', 'url', 'text'
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);

  // File upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // URL upload
  const [uploadUrl, setUploadUrl] = useState('');

  // Text upload
  const [uploadText, setUploadText] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');

  // Metadata (optional)
  const [uploadPlatform, setUploadPlatform] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadGoal, setUploadGoal] = useState('');
  const [uploadSourceName, setUploadSourceName] = useState('');

  useEffect(() => {
    loadPractices();
  }, []);

  useEffect(() => {
    filterPractices();
  }, [practices, searchQuery, platformFilter, categoryFilter]);

  const loadPractices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/best-practices');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load best practices');
      }

      const data = await response.json();
      setPractices(data.practices || []);
    } catch (err) {
      logger.error('Error loading best practices:', err as Error, { component: 'best-practices' });
      setError(err instanceof Error ? err.message : 'Failed to load best practices');
    } finally {
      setLoading(false);
    }
  };

  const filterPractices = () => {
    let filtered = [...practices];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    if (platformFilter && platformFilter !== 'all') {
      filtered = filtered.filter((p) => p.platform === platformFilter);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    filtered = filtered.filter((p) => p.is_active);

    filtered.sort((a, b) => b.priority_score - a.priority_score);

    setFilteredPractices(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this best practice?')) {
      return;
    }

    try {
      const response = await fetch(`/api/best-practices/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      await loadPractices();
    } catch (err) {
      logger.error('Error deleting:', err as Error, { component: 'best-practices' });
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setProcessingStage('Preparing...');
    setProcessingProgress(10);
    setProcessingResult(null);
    setError(null);

    try {
      const formData = new FormData();

      // Determine source type and add source-specific fields
      if (uploadMode === 'file') {
        if (!uploadFile) {
          throw new Error('Please select a file');
        }
        formData.append('source_type', 'file');
        formData.append('file', uploadFile);
      } else if (uploadMode === 'url') {
        if (!uploadUrl) {
          throw new Error('Please enter a URL');
        }
        formData.append('source_type', 'url');
        formData.append('url', uploadUrl);
      } else {
        if (!uploadText) {
          throw new Error('Please enter text content');
        }
        formData.append('source_type', 'text');
        formData.append('text', uploadText);
        if (uploadTitle) formData.append('title', uploadTitle);
        if (uploadDescription) formData.append('description', uploadDescription);
      }

      // Add optional metadata
      if (uploadPlatform) formData.append('platform', uploadPlatform);
      if (uploadCategory) formData.append('category', uploadCategory);
      if (uploadGoal) formData.append('goal', uploadGoal);
      if (uploadSourceName) formData.append('source_name', uploadSourceName);

      // Simulate progress stages
      setProcessingStage('Extracting content...');
      setProcessingProgress(25);

      const response = await fetch('/api/best-practices/process', {
        method: 'POST',
        body: formData,
      });

      setProcessingStage('Analyzing content...');
      setProcessingProgress(60);

      const result: ProcessingResult = await response.json();

      setProcessingStage('Validating quality...');
      setProcessingProgress(85);

      setProcessingProgress(100);
      setProcessingStage('Complete!');
      setProcessingResult(result);

      if (result.success) {
        // Reload practices after successful upload
        setTimeout(() => {
          loadPractices();
        }, 1000);
      }
    } catch (err) {
      logger.error('Processing error:', err as Error, { component: 'best-practices' });
      setError(err instanceof Error ? err.message : 'Failed to process');
      setProcessingResult(null);
    } finally {
      setProcessing(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadUrl('');
    setUploadText('');
    setUploadTitle('');
    setUploadDescription('');
    setUploadPlatform('');
    setUploadCategory('');
    setUploadGoal('');
    setUploadSourceName('');
    setProcessingResult(null);
    setProcessingProgress(0);
    setProcessingStage('');
    setError(null);
  };

  const handleCloseModal = () => {
    setUploadModalActive(false);
    resetUploadForm();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getQualityBadgeVariant = (score: number) => {
    if (score >= 7) return 'default';
    if (score >= 5) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="w-full flex flex-col items-center" style={{ background: '#fafaf9', minHeight: '100vh', padding: '32px 24px' }}>
      <div className="w-full" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', padding: '32px', marginBottom: '24px' }}>
          <div className="w-full">
            <div className="flex items-center justify-between">
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '8px' }}>Ad Best Practices</h1>
                <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>AI-powered knowledge base for advertising insights</p>
              </div>
              <Button onClick={() => setUploadModalActive(true)} style={{ background: '#0066cc', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: 'pointer' }}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Resource
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setError(null)}
              >
                ×
              </Button>
            </Alert>
          )}

          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent style={{ padding: '24px' }}>
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[300px]">
                    <Label htmlFor="search" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Search</Label>
                    <div className="relative mt-1.5">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6b7280' }} />
                      <Input
                        id="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title, description, or category..."
                        className="pl-10"
                        style={{ width: '100%', padding: '8px 8px 8px 40px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', color: '#001429' }}
                      />
                    </div>
                  </div>
                  <div className="w-48">
                    <Label style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Platform</Label>
                    <Select value={platformFilter} onValueChange={setPlatformFilter}>
                      <SelectTrigger className="mt-1.5" style={{ fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        {PLATFORMS.map((platform) => (
                          <SelectItem key={platform.value} value={platform.value}>
                            {platform.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Label style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="mt-1.5" style={{ fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: '#0066cc' }} />
                    <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Loading resources...</p>
                  </div>
                ) : filteredPractices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-64 h-64 mb-6 opacity-50">
                      <img
                        src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        alt="No resources"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '8px' }}>
                      {searchQuery ? 'No resources found' : 'No resources yet'}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '24px' }}>
                      {searchQuery
                        ? 'Try adjusting your filters or search terms'
                        : 'Upload training materials, articles, or audio to build your knowledge base'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setUploadModalActive(true)} style={{ background: '#0066cc', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: 'pointer' }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Resource
                      </Button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '16px' }}>
                      Showing {filteredPractices.length} of {practices.length} resources
                    </p>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <Table>
                        <TableHeader>
                          <TableRow style={{ background: '#f9fafb' }}>
                            <TableHead style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Title</TableHead>
                            <TableHead style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Platform</TableHead>
                            <TableHead style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Category</TableHead>
                            <TableHead style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Goal</TableHead>
                            <TableHead style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Quality</TableHead>
                            <TableHead style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Priority</TableHead>
                            <TableHead style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Created</TableHead>
                            <TableHead style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPractices.map((practice) => (
                            <TableRow key={practice.id}>
                              <TableCell style={{ fontSize: '14px', fontWeight: 500, color: '#001429', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{practice.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" style={{ border: '1px solid #0066cc', color: '#0066cc', fontSize: '12px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '2px 8px', borderRadius: '4px' }}>
                                  {practice.platform || 'multi'}
                                </Badge>
                              </TableCell>
                              <TableCell style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{practice.category || 'general'}</TableCell>
                              <TableCell style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{practice.goal || '-'}</TableCell>
                              <TableCell>
                                {practice.quality_score ? (
                                  <Badge variant={getQualityBadgeVariant(practice.quality_score)} style={{ fontSize: '12px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '2px 8px', borderRadius: '4px' }}>
                                    {practice.quality_score.toFixed(1)}/10
                                  </Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={practice.priority_score >= 7 ? 'default' : 'secondary'}
                                  style={{ background: practice.priority_score >= 7 ? '#0066cc' : undefined, color: practice.priority_score >= 7 ? '#ffffff' : undefined, fontSize: '12px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '2px 8px', borderRadius: '4px' }}
                                >
                                  {practice.priority_score}/10
                                </Badge>
                              </TableCell>
                              <TableCell style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{formatDate(practice.uploaded_at)}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(practice.id)}
                                  style={{ background: '#cc0066', color: '#ffffff', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: 'pointer' }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Modal */}
        <Dialog open={uploadModalActive} onOpenChange={setUploadModalActive}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '32px' }}>
            <DialogHeader>
              <DialogTitle style={{ fontSize: '24px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Process Best Practice with AI</DialogTitle>
              <DialogDescription style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginTop: '8px' }}>
                Upload files, URLs, or text to extract advertising insights
              </DialogDescription>
            </DialogHeader>

            {!processingResult ? (
              <div className="space-y-6">
                <Tabs value={uploadMode} onValueChange={setUploadMode}>
                  <TabsList className="grid w-full grid-cols-3" style={{ background: '#f9fafb', padding: '4px', borderRadius: '8px' }}>
                    <TabsTrigger value="file" className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '8px 16px', borderRadius: '6px' }}>
                      <FileText className="h-4 w-4" />
                      File
                    </TabsTrigger>
                    <TabsTrigger value="url" className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '8px 16px', borderRadius: '6px' }}>
                      <Link2 className="h-4 w-4" />
                      URL
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '8px 16px', borderRadius: '6px' }}>
                      <Type className="h-4 w-4" />
                      Text
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="file" className="mt-4">
                    <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      <CardHeader style={{ padding: '24px' }}>
                        <CardTitle style={{ fontSize: '18px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Upload Audio, PDF, or Image</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4" style={{ padding: '0 24px 24px 24px' }}>
                        <div>
                          <Input
                            type="file"
                            accept=".pdf,.mp3,.wav,.m4a,.jpeg,.jpg,.png,.webp,.txt,.md"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            disabled={processing}
                            style={{ width: '100%', padding: '8px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', cursor: 'pointer' }}
                          />
                          {uploadFile && (
                            <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginTop: '8px' }}>
                              Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          )}
                        </div>
                        <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Supported: Audio (MP3, WAV, M4A), Documents (PDF, TXT, MD), Images (JPEG, PNG, WebP)
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="url" className="mt-4">
                    <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      <CardHeader style={{ padding: '24px' }}>
                        <CardTitle style={{ fontSize: '18px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Process from URL</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4" style={{ padding: '0 24px 24px 24px' }}>
                        <div>
                          <Label htmlFor="url" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>URL</Label>
                          <Input
                            id="url"
                            value={uploadUrl}
                            onChange={(e) => setUploadUrl(e.target.value)}
                            placeholder="https://example.com/best-practices-article"
                            disabled={processing}
                            className="mt-1.5"
                            style={{ width: '100%', padding: '8px 12px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', color: '#001429' }}
                          />
                        </div>
                        <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Supports blog posts, documentation, and web articles
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="text" className="mt-4">
                    <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      <CardHeader style={{ padding: '24px' }}>
                        <CardTitle style={{ fontSize: '18px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Process Raw Text</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4" style={{ padding: '0 24px 24px 24px' }}>
                        <div>
                          <Label htmlFor="title" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Title (optional)</Label>
                          <Input
                            id="title"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            placeholder="e.g., Meta Carousel Ad Best Practices"
                            disabled={processing}
                            className="mt-1.5"
                            style={{ width: '100%', padding: '8px 12px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', color: '#001429' }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="description" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Description (optional)</Label>
                          <Textarea
                            id="description"
                            value={uploadDescription}
                            onChange={(e) => setUploadDescription(e.target.value)}
                            placeholder="Brief summary..."
                            disabled={processing}
                            rows={2}
                            className="mt-1.5"
                            style={{ width: '100%', padding: '12px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', color: '#001429', lineHeight: 1.5 }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="content" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Content</Label>
                          <Textarea
                            id="content"
                            value={uploadText}
                            onChange={(e) => setUploadText(e.target.value)}
                            placeholder="Paste your best practice content here..."
                            disabled={processing}
                            rows={8}
                            className="mt-1.5"
                            style={{ width: '100%', padding: '12px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', color: '#001429', lineHeight: 1.5 }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div className="border-t pt-6" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                  <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                    <CardHeader style={{ padding: '24px' }}>
                      <CardTitle style={{ fontSize: '18px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Optional Metadata</CardTitle>
                      <CardDescription style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginTop: '4px' }}>AI will auto-detect if not provided</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4" style={{ padding: '0 24px 24px 24px' }}>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Platform</Label>
                          <Select value={uploadPlatform} onValueChange={setUploadPlatform} disabled={processing}>
                            <SelectTrigger className="mt-1.5" style={{ fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff' }}>
                              <SelectValue placeholder="Auto-detect" />
                            </SelectTrigger>
                            <SelectContent style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                              <SelectItem value="">Auto-detect</SelectItem>
                              {PLATFORMS.filter((p) => p.value !== '').map((platform) => (
                                <SelectItem key={platform.value} value={platform.value}>
                                  {platform.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Category</Label>
                          <Select value={uploadCategory} onValueChange={setUploadCategory} disabled={processing}>
                            <SelectTrigger className="mt-1.5" style={{ fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff' }}>
                              <SelectValue placeholder="Auto-detect" />
                            </SelectTrigger>
                            <SelectContent style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                              <SelectItem value="">Auto-detect</SelectItem>
                              {CATEGORIES.filter((c) => c.value !== '').map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Goal</Label>
                          <Select value={uploadGoal} onValueChange={setUploadGoal} disabled={processing}>
                            <SelectTrigger className="mt-1.5" style={{ fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff' }}>
                              <SelectValue placeholder="Auto-detect" />
                            </SelectTrigger>
                            <SelectContent style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                              <SelectItem value="">Auto-detect</SelectItem>
                              {GOALS.map((goal) => (
                                <SelectItem key={goal.value} value={goal.value}>
                                  {goal.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="source" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Source Name (e.g., Boutique Hub, Meta Blueprint)</Label>
                        <Input
                          id="source"
                          value={uploadSourceName}
                          onChange={(e) => setUploadSourceName(e.target.value)}
                          placeholder="Optional"
                          disabled={processing}
                          className="mt-1.5"
                          style={{ width: '100%', padding: '8px 12px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', color: '#001429' }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {processing && (
                  <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                    <CardContent className="pt-6" style={{ padding: '24px' }}>
                      <div className="space-y-3">
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Processing with AI Agents...</h3>
                        <Progress value={processingProgress} className="h-2" style={{ height: '8px' }} />
                        <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{processingStage}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {processingResult.success ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Successfully Processed!</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Your best practice has been analyzed and added to the knowledge base.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Processing Failed</AlertTitle>
                    <AlertDescription>
                      {processingResult.errors?.join(', ') || 'Quality score too low or other issues detected'}
                    </AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-oxford-900">{processingResult.metadata.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="border-dodger-500 text-dodger-700">
                        {processingResult.metadata.platform}
                      </Badge>
                      <Badge variant="secondary">{processingResult.metadata.category}</Badge>
                      <Badge variant="secondary">{processingResult.metadata.goal}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-gray-700">{processingResult.metadata.description}</p>

                    <div className="border-t pt-4">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Quality Score</p>
                          <Badge
                            variant={getQualityBadgeVariant(processingResult.metadata.quality_score)}
                            className="text-base"
                          >
                            {processingResult.metadata.quality_score.toFixed(1)}/10
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Priority Score</p>
                          <Badge variant="outline" className="text-base border-dodger-500 text-dodger-700">
                            {processingResult.metadata.priority_score}/10
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {processingResult.metadata.extracted_insights.length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-oxford-900 mb-3">
                          Key Insights ({processingResult.metadata.extracted_insights.length})
                        </h3>
                        <ul className="list-disc list-inside space-y-2">
                          {processingResult.metadata.extracted_insights.map((insight, i) => (
                            <li key={i} className="text-gray-700">{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {processingResult.metadata.tags.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Tags ({processingResult.metadata.tags.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {processingResult.metadata.tags.slice(0, 10).map((tag, i) => (
                            <Badge key={i} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {processingResult.metadata.example_quotes && processingResult.metadata.example_quotes.length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-oxford-900 mb-3">Example Quotes</h3>
                        <div className="space-y-3">
                          {processingResult.metadata.example_quotes.map((quote, i) => (
                            <div key={i} className="bg-gray-50 p-4 rounded-lg border">
                              <p className="text-gray-700 italic">"{quote}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {processingResult.warnings && processingResult.warnings.length > 0 && (
                      <div className="border-t pt-4">
                        <Alert className="border-amber-200 bg-amber-50">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800">Warnings</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {processingResult.warnings.map((warning, i) => (
                                <li key={i} className="text-amber-700">{warning}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter className="mt-6" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              {processingResult ? (
                <Button onClick={resetUploadForm} style={{ background: '#0066cc', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: 'pointer' }}>
                  Upload Another
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCloseModal} disabled={processing} style={{ background: '#ffffff', color: '#003366', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', cursor: 'pointer' }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleProcess}
                    disabled={processing}
                    style={{ background: '#0066cc', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: 'pointer' }}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Process with AI'
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
