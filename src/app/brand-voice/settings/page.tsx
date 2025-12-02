'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/lib/logger'
import {
  Trash2,
  Loader2,
  FileText,
  AlertCircle,
  Upload,
  X,
  ArrowLeft,
} from 'lucide-react';

interface ToneSliders {
  playfulSerious: number;
  casualElevated: number;
  trendyClassic: number;
  friendlyProfessional: number;
  simpleDetailed: number;
  boldSoft: number;
}

interface VoiceVocabulary {
  preferred: string[];
  avoided: string[];
}

interface BrandVoiceSettings {
  voiceTone: string;
  voiceStyle: string;
  voicePersonality: string;
  voiceVocabulary: VoiceVocabulary;
  toneSliders: ToneSliders;
  customerTerm: string;
  signatureSentence: string;
  valuePillars: string[];
  audienceDescription: string;
  writingSamples: string;
}

interface WritingSample {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

const defaultSettings: BrandVoiceSettings = {
  voiceTone: '',
  voiceStyle: '',
  voicePersonality: '',
  voiceVocabulary: { preferred: [], avoided: [] },
  toneSliders: {
    playfulSerious: 3,
    casualElevated: 3,
    trendyClassic: 3,
    friendlyProfessional: 3,
    simpleDetailed: 3,
    boldSoft: 3,
  },
  customerTerm: '',
  signatureSentence: '',
  valuePillars: [],
  audienceDescription: '',
  writingSamples: '',
};

export default function BrandVoiceSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<BrandVoiceSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<BrandVoiceSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [newPreferredWord, setNewPreferredWord] = useState('');
  const [newAvoidedWord, setNewAvoidedWord] = useState('');
  const [newValuePillar, setNewValuePillar] = useState('');

  // Writing samples state
  const [writingSamples, setWritingSamples] = useState<WritingSample[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sampleToDelete, setSampleToDelete] = useState<WritingSample | null>(null);
  const [canUpload, setCanUpload] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pastedTextName, setPastedTextName] = useState('');
  const [savingPastedText, setSavingPastedText] = useState(false);

  // Get shop domain
  useEffect(() => {
    const initShop = async () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const shop = params.get('shop');
        if (shop) {
          setShopDomain(shop);
          return;
        }
      }
      try {
        const res = await fetch('/api/shop/me');
        if (res.ok) {
          const data = await res.json();
          if (data.domain) {
            setShopDomain(data.domain);
          }
        }
      } catch (e) {
        logger.error('Failed to fetch shop:', e as Error, { component: 'settings' });
      }
    };
    initShop();
  }, []);

  // Load settings
  useEffect(() => {
    if (!shopDomain) return;

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/business-profile/settings', {
          headers: {
            'Authorization': `Bearer ${shopDomain}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.settings) {
            setSettings(data.data.settings);
            setOriginalSettings(data.data.settings);
          }
        } else {
          setError('Failed to load settings');
        }
      } catch (err) {
        logger.error('Error loading settings:', err as Error, { component: 'settings' });
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [shopDomain]);

  // Load writing samples
  const loadWritingSamples = useCallback(async () => {
    if (!shopDomain) return;
    setSamplesLoading(true);
    try {
      const response = await fetch('/api/business-profile/writing-samples', {
        headers: { 'Authorization': `Bearer ${shopDomain}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWritingSamples(data.data.samples || []);
          setCanUpload(data.data.canUpload);
        }
      }
    } catch (err) {
      logger.error('Error loading samples:', err as Error, { component: 'settings' });
    } finally {
      setSamplesLoading(false);
    }
  }, [shopDomain]);

  useEffect(() => {
    if (shopDomain) {
      loadWritingSamples();
    }
  }, [shopDomain, loadWritingSamples]);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleSave = async () => {
    if (!shopDomain) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/business-profile/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shopDomain}`,
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setOriginalSettings(settings);
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      logger.error('Error saving settings:', err as Error, { component: 'settings' });
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSliderChange = useCallback((key: keyof ToneSliders, value: number[]) => {
    setSettings(prev => ({
      ...prev,
      toneSliders: {
        ...prev.toneSliders,
        [key]: value[0],
      },
    }));
  }, []);

  const addPreferredWord = () => {
    if (newPreferredWord.trim() && !settings.voiceVocabulary.preferred.includes(newPreferredWord.trim())) {
      setSettings(prev => ({
        ...prev,
        voiceVocabulary: {
          ...prev.voiceVocabulary,
          preferred: [...prev.voiceVocabulary.preferred, newPreferredWord.trim()],
        },
      }));
      setNewPreferredWord('');
    }
  };

  const removePreferredWord = (word: string) => {
    setSettings(prev => ({
      ...prev,
      voiceVocabulary: {
        ...prev.voiceVocabulary,
        preferred: prev.voiceVocabulary.preferred.filter(w => w !== word),
      },
    }));
  };

  const addAvoidedWord = () => {
    if (newAvoidedWord.trim() && !settings.voiceVocabulary.avoided.includes(newAvoidedWord.trim())) {
      setSettings(prev => ({
        ...prev,
        voiceVocabulary: {
          ...prev.voiceVocabulary,
          avoided: [...prev.voiceVocabulary.avoided, newAvoidedWord.trim()],
        },
      }));
      setNewAvoidedWord('');
    }
  };

  const removeAvoidedWord = (word: string) => {
    setSettings(prev => ({
      ...prev,
      voiceVocabulary: {
        ...prev.voiceVocabulary,
        avoided: prev.voiceVocabulary.avoided.filter(w => w !== word),
      },
    }));
  };

  const addValuePillar = () => {
    if (newValuePillar.trim() && !settings.valuePillars.includes(newValuePillar.trim())) {
      setSettings(prev => ({
        ...prev,
        valuePillars: [...prev.valuePillars, newValuePillar.trim()],
      }));
      setNewValuePillar('');
    }
  };

  const removeValuePillar = (pillar: string) => {
    setSettings(prev => ({
      ...prev,
      valuePillars: prev.valuePillars.filter(p => p !== pillar),
    }));
  };

  // Writing samples handlers
  const handleFileUpload = async (file: File) => {
    if (!shopDomain) return;

    setSampleError(null);
    setUploadingFile(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/business-profile/writing-samples', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${shopDomain}` },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await loadWritingSamples();
        setSuccess('Writing sample uploaded successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setSampleError(data.error || 'Failed to upload file');
      }
    } catch (err) {
      logger.error('Upload error:', err as Error, { component: 'settings' });
      setSampleError('Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const confirmDeleteSample = (sample: WritingSample) => {
    setSampleToDelete(sample);
    setDeleteModalOpen(true);
  };

  const handleDeleteSample = async () => {
    if (!shopDomain || !sampleToDelete) return;

    try {
      const response = await fetch(`/api/business-profile/writing-samples/${sampleToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${shopDomain}` },
      });

      if (response.ok) {
        await loadWritingSamples();
        setSuccess('Writing sample deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setSampleError(data.error || 'Failed to delete sample');
      }
    } catch (err) {
      logger.error('Delete error:', err as Error, { component: 'settings' });
      setSampleError('Failed to delete sample');
    } finally {
      setDeleteModalOpen(false);
      setSampleToDelete(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeLabel = (mimeType: string): string => {
    const typeMap: Record<string, string> = {
      'text/plain': 'TXT',
      'text/markdown': 'MD',
      'text/csv': 'CSV',
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/rtf': 'RTF',
    };
    return typeMap[mimeType] || 'FILE';
  };

  const handleSavePastedText = async () => {
    if (!shopDomain || !pastedText.trim()) return;

    setSavingPastedText(true);
    setSampleError(null);

    // Create a text file from pasted content
    const fileName = pastedTextName.trim() || `Sample ${new Date().toLocaleDateString()}`;
    const blob = new Blob([pastedText], { type: 'text/plain' });
    const file = new File([blob], `${fileName}.txt`, { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/business-profile/writing-samples', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${shopDomain}` },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await loadWritingSamples();
        setShowPasteModal(false);
        setPastedText('');
        setPastedTextName('');
        setSuccess('Writing sample saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setSampleError(data.error || 'Failed to save text');
      }
    } catch (err) {
      logger.error('Save error:', err as Error, { component: 'settings' });
      setSampleError('Failed to save text');
    } finally {
      setSavingPastedText(false);
    }
  };

  const ToneSlider = ({
    label,
    leftLabel,
    rightLabel,
    sliderKey
  }: {
    label: string;
    leftLabel: string;
    rightLabel: string;
    sliderKey: keyof ToneSliders;
  }) => (
    <div className="space-y-3 pb-4">
      <Label className="text-base font-semibold">{label}</Label>
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <Slider
        value={[settings.toneSliders[sliderKey]]}
        min={1}
        max={5}
        step={1}
        onValueChange={(value) => handleSliderChange(sliderKey, value)}
        className="w-full"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Voice Settings</h1>
          <p className="text-muted-foreground">Quick adjustments to your brand voice without redoing the interview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/brand-voice')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" onClick={() => router.push('/brand-voice')}>
            Business Profile
          </Button>
          <Button
            variant="outline"
            onClick={() => setSettings(originalSettings)}
            disabled={!hasChanges}
          >
            Discard Changes
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Tone Sliders */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Tone</CardTitle>
          <CardDescription>
            Adjust the sliders to fine-tune how your brand communicates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToneSlider
            label="Playful vs Serious"
            leftLabel="Playful"
            rightLabel="Serious"
            sliderKey="playfulSerious"
          />
          <ToneSlider
            label="Casual vs Elevated"
            leftLabel="Casual"
            rightLabel="Elevated"
            sliderKey="casualElevated"
          />
          <ToneSlider
            label="Trendy vs Classic"
            leftLabel="Trendy"
            rightLabel="Classic"
            sliderKey="trendyClassic"
          />
          <ToneSlider
            label="Friendly vs Professional"
            leftLabel="Friendly"
            rightLabel="Professional"
            sliderKey="friendlyProfessional"
          />
          <ToneSlider
            label="Simple vs Detailed"
            leftLabel="Simple"
            rightLabel="Detailed"
            sliderKey="simpleDetailed"
          />
          <ToneSlider
            label="Bold vs Soft"
            leftLabel="Bold"
            rightLabel="Soft"
            sliderKey="boldSoft"
          />
        </CardContent>
      </Card>

      {/* Voice Description */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voiceTone">Voice Tone</Label>
            <Input
              id="voiceTone"
              value={settings.voiceTone}
              onChange={(e) => setSettings(prev => ({ ...prev, voiceTone: e.target.value }))}
              placeholder="e.g., Warm, welcoming, and confident"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voiceStyle">Voice Style</Label>
            <Input
              id="voiceStyle"
              value={settings.voiceStyle}
              onChange={(e) => setSettings(prev => ({ ...prev, voiceStyle: e.target.value }))}
              placeholder="e.g., Conversational with a touch of humor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voicePersonality">Voice Personality</Label>
            <Input
              id="voicePersonality"
              value={settings.voicePersonality}
              onChange={(e) => setSettings(prev => ({ ...prev, voicePersonality: e.target.value }))}
              placeholder="e.g., A knowledgeable friend who genuinely cares"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vocabulary */}
      <Card>
        <CardHeader>
          <CardTitle>Vocabulary Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Preferred Words</Label>
            <p className="text-sm text-muted-foreground">
              Words and phrases that should appear in your marketing
            </p>
            <div className="flex flex-wrap gap-2">
              {settings.voiceVocabulary.preferred.map((word) => (
                <Badge key={word} variant="secondary" className="px-3 py-1">
                  {word}
                  <button
                    onClick={() => removePreferredWord(word)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPreferredWord}
                onChange={(e) => setNewPreferredWord(e.target.value)}
                placeholder="Add a word or phrase"
                onKeyPress={(e) => e.key === 'Enter' && addPreferredWord()}
              />
              <Button onClick={addPreferredWord}>Add</Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base font-semibold">Words to Avoid</Label>
            <p className="text-sm text-muted-foreground">
              Words and phrases that should never appear in your marketing
            </p>
            <div className="flex flex-wrap gap-2">
              {settings.voiceVocabulary.avoided.map((word) => (
                <Badge key={word} variant="secondary" className="px-3 py-1">
                  {word}
                  <button
                    onClick={() => removeAvoidedWord(word)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAvoidedWord}
                onChange={(e) => setNewAvoidedWord(e.target.value)}
                placeholder="Add a word to avoid"
                onKeyPress={(e) => e.key === 'Enter' && addAvoidedWord()}
              />
              <Button onClick={addAvoidedWord}>Add</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="customerTerm">How do you refer to your customers?</Label>
            <Input
              id="customerTerm"
              value={settings.customerTerm}
              onChange={(e) => setSettings(prev => ({ ...prev, customerTerm: e.target.value }))}
              placeholder="e.g., community members, guests, friends"
            />
            <p className="text-sm text-muted-foreground">
              This term will be used throughout your marketing
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signatureSentence">Signature Sentence</Label>
            <Input
              id="signatureSentence"
              value={settings.signatureSentence}
              onChange={(e) => setSettings(prev => ({ ...prev, signatureSentence: e.target.value }))}
              placeholder="e.g., Elevating everyday moments"
            />
            <p className="text-sm text-muted-foreground">
              A tagline or phrase that captures your brand essence
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base font-semibold">Value Pillars</Label>
            <p className="text-sm text-muted-foreground">
              Core values that define your brand
            </p>
            <div className="flex flex-wrap gap-2">
              {settings.valuePillars.map((pillar) => (
                <Badge key={pillar} variant="secondary" className="px-3 py-1">
                  {pillar}
                  <button
                    onClick={() => removeValuePillar(pillar)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newValuePillar}
                onChange={(e) => setNewValuePillar(e.target.value)}
                placeholder="Add a value pillar"
                onKeyPress={(e) => e.key === 'Enter' && addValuePillar()}
              />
              <Button onClick={addValuePillar}>Add</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader>
          <CardTitle>Target Audience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="audienceDescription">Audience Description</Label>
          <Textarea
            id="audienceDescription"
            value={settings.audienceDescription}
            onChange={(e) => setSettings(prev => ({ ...prev, audienceDescription: e.target.value }))}
            placeholder="Describe your ideal customer..."
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            Who are your customers? What do they care about?
          </p>
        </CardContent>
      </Card>

      {/* Writing Samples */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Writing Samples</CardTitle>
              <CardDescription>
                Upload examples of copy that represent your brand voice (max 3 files)
              </CardDescription>
            </div>
            <span className="text-sm text-muted-foreground">
              {writingSamples.length}/3 samples
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sampleError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sampleError}</AlertDescription>
            </Alert>
          )}

          {/* Existing samples list */}
          {samplesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : writingSamples.length > 0 ? (
            <div className="space-y-2">
              {writingSamples.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sample.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getFileTypeLabel(sample.file_type)} • {formatFileSize(sample.file_size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmDeleteSample(sample)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 bg-muted/50 rounded-lg">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No writing samples uploaded yet</p>
            </div>
          )}

          {/* Upload area */}
          {canUpload && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button onClick={() => setShowPasteModal(true)} variant="outline">
                  Paste Text
                </Button>
                <span className="text-sm text-muted-foreground">or</span>
              </div>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.pdf,.doc,.docx,.rtf"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {uploadingFile ? 'Uploading...' : 'Upload file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drop file here (TXT, MD, PDF, DOC, DOCX)
                  </p>
                </label>
              </div>
            </div>
          )}

          {!canUpload && (
            <Alert>
              <AlertDescription>
                Maximum of 3 writing samples reached. Delete one to upload a new file.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete writing sample?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{sampleToDelete?.file_name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSample}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paste text modal */}
      <Dialog open={showPasteModal} onOpenChange={setShowPasteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste Writing Sample</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pastedTextName">Sample Name</Label>
              <Input
                id="pastedTextName"
                value={pastedTextName}
                onChange={(e) => setPastedTextName(e.target.value)}
                placeholder="e.g., Product Description Example"
              />
              <p className="text-xs text-muted-foreground">
                Optional - helps identify this sample later
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pastedText">Sample Text</Label>
              <Textarea
                id="pastedText"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your writing sample here... This could be a product description, email copy, social post, or any content that represents your brand voice."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Include headlines, product descriptions, emails, or social posts that capture your voice
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasteModal(false);
                setPastedText('');
                setPastedTextName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePastedText}
              disabled={!pastedText.trim() || savingPastedText}
            >
              {savingPastedText ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Sample'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/brand-voice/profile')}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
