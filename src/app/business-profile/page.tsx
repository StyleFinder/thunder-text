'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type {
  ChatMessage,
  InterviewPrompt,
  BusinessProfile,
  InterviewStatus,
} from '@/types/business-profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import styles from './page.module.css';
import { logger } from '@/lib/logger'

export default function BrandVoicePage() {
  const router = useRouter();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState<InterviewPrompt | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>('not_started');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedProfile = useRef(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Get shop domain from URL params or API (for embedded app)
  useEffect(() => {
    const initShop = async () => {
      // First, try URL params
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const shop = params.get('shop');

        if (shop) {
          setShopDomain(shop);
          setIsAuthenticated(true);
          setAuthLoading(false);
          return;
        }
      }

      // Fallback: fetch from API (uses cookie set by middleware)
      try {
        const res = await fetch('/api/shop/me');
        if (res.ok) {
          const data = await res.json();
          if (data.domain) {
            setShopDomain(data.domain);
            setIsAuthenticated(true);
          }
        }
      } catch (e) {
        logger.error('Failed to fetch shop:', e as Error, { component: 'business-profile' });
      }

      setAuthLoading(false);
    };

    initShop();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showCompletionState = () => {
    setMessages([]);
    setInterviewStatus('completed');
  };

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/business-profile', {
        headers: {
          'Authorization': `Bearer ${shopDomain}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
          setInterviewStatus(data.data.profile.interview_status);
          setProgress(data.data.progress.percentage_complete);

          if (data.data.progress.next_prompt) {
            setCurrentPrompt(data.data.progress.next_prompt);
          }

          // If interview is completed with generated profile, show completion
          if (
            data.data.profile.interview_status === 'completed' &&
            data.data.profile.master_profile_text
          ) {
            showCompletionState();
          }
          // If all questions answered but profile not yet generated, trigger generation
          else if (
            data.data.progress.percentage_complete >= 100 &&
            data.data.profile.interview_status === 'in_progress' &&
            !data.data.profile.master_profile_text
          ) {
            console.log('[BusinessProfile] All questions answered, triggering profile generation...');
            setInterviewStatus('in_progress');
            addAIMessage("All questions completed! Now generating your Business Profile...");
            setTimeout(() => generateProfile(), 1000);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load profile:', error as Error, { component: 'business-profile' });
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (shopDomain && isAuthenticated && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      loadProfile();
    }
  }, [shopDomain, isAuthenticated]);

  // If not authenticated, set profileLoading to false
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !shopDomain)) {
      setProfileLoading(false);
    }
  }, [authLoading, isAuthenticated, shopDomain]);

  // Profile completed - redirect to settings page
  useEffect(() => {
    if (interviewStatus === 'completed' && profile?.master_profile_text) {
      router.replace('/brand-voice/settings');
    }
  }, [interviewStatus, profile, router]);

  // Track interview mode and total questions
  const [interviewMode, setInterviewMode] = useState<'full' | 'quick_start'>('full');
  const [totalQuestions, setTotalQuestions] = useState(19);

  const startInterview = async (mode: 'full' | 'quick_start' = 'full') => {

    if (!shopDomain) {
      setError('Shop domain not found. Please reload the page from Shopify Admin.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setInterviewMode(mode);

    try {
      const response = await fetch('/api/business-profile/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${shopDomain}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.data.profile);
        setCurrentPrompt(data.data.first_prompt);
        setInterviewStatus('in_progress');
        setTotalQuestions(data.data.total_questions || (mode === 'quick_start' ? 7 : 19));

        const timeEstimate = mode === 'quick_start' ? '5-7 minutes' : '15-20 minutes';
        addAIMessage(
          `Hi! I'm here to learn about your business so we can create content that truly represents your brand. This ${mode === 'quick_start' ? 'quick' : ''} conversation will take about ${timeEstimate}. Ready to get started?`
        );

        setTimeout(() => {
          addAIMessage(
            data.data.first_prompt.question_text,
            data.data.first_prompt.prompt_key
          );
        }, 1500);
      } else {
        setError(data.error || 'Failed to start interview');
      }
    } catch (error) {
      logger.error('Failed to start interview:', error as Error, { component: 'business-profile' });
      setError('Failed to start interview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentInput.trim() || !currentPrompt) return;

    const wordCount = currentInput.trim().split(/\s+/).length;
    if (currentPrompt.min_words && wordCount < currentPrompt.min_words) {
      setError(
        `Please provide at least ${currentPrompt.min_words} words (current: ${wordCount})`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    addUserMessage(currentInput);
    const userAnswer = currentInput;
    setCurrentInput('');

    try {
      const response = await fetch('/api/business-profile/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shopDomain}`,
        },
        body: JSON.stringify({
          prompt_key: currentPrompt.prompt_key,
          question_number: currentPrompt.question_number,
          response_text: userAnswer,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProgress(data.data.progress.percentage_complete);

        if (data.data.interview_complete) {
          setTimeout(() => {
            addAIMessage("Excellent! You've completed all questions. 🎉");
          }, 800);

          setTimeout(() => {
            addAIMessage(
              "Now I'll analyze your responses to create your comprehensive Business Profile. This will take about 30-60 seconds..."
            );
          }, 2000);

          setTimeout(() => {
            generateProfile();
          }, 3000);
        } else if (data.data.next_prompt) {
          setCurrentPrompt(data.data.next_prompt);

          setTimeout(() => {
            addAIMessage(
              data.data.next_prompt.question_text,
              data.data.next_prompt.prompt_key
            );
          }, 1000);
        }
      } else {
        setError(data.error || 'Failed to submit answer');
      }
    } catch (error) {
      logger.error('Failed to submit answer:', error as Error, { component: 'business-profile' });
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateProfile = async () => {
    setIsGeneratingProfile(true);

    try {
      const response = await fetch('/api/business-profile/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${shopDomain}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.data.profile);
        setInterviewStatus('completed');

        setTimeout(() => {
          addAIMessage('Your Business Profile is complete! 🎊');
        }, 500);

        setTimeout(() => {
          addAIMessage(
            'This profile will now guide all AI-generated content to match your unique business identity, voice, and messaging.'
          );
        }, 1500);

        setTimeout(() => {
          showCompletionState();
        }, 3000);
      } else {
        setError(data.error || 'Failed to generate profile');
        addAIMessage(
          "I encountered an issue generating your profile. Let me try again..."
        );
      }
    } catch (error) {
      logger.error('Failed to generate profile:', error as Error, { component: 'business-profile' });
      setError('Failed to generate profile. Please try again.');
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const addAIMessage = (content: string, promptKey?: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      type: 'ai',
      content,
      timestamp: new Date(),
      prompt_key: promptKey,
    };
    setMessages((prev) => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleReset = async () => {
    setIsResetting(true);
    setError(null);

    try {
      const response = await fetch('/api/business-profile/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${shopDomain}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessages([]);
        setInterviewStatus('not_started');
        setProgress(0);
        setCurrentPrompt(null);
        setProfile(null);
        setCurrentInput('');
        setShowResetConfirm(false);

        hasLoadedProfile.current = false;
        await loadProfile();
      } else {
        setError(data.error || 'Failed to reset interview');
      }
    } catch (error) {
      logger.error('Failed to reset interview:', error as Error, { component: 'business-profile' });
      setError('Failed to reset interview. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const wordCount = currentInput
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  // Loading state - wait for both auth and profile to load
  if (authLoading || profileLoading) {
    return (
      <div className="w-full flex flex-col items-center" style={{ padding: '32px', background: '#fafaf9', minHeight: '100vh' }}>
        <div className="w-full" style={{ maxWidth: '800px' }}>
          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent className="flex items-center justify-center" style={{ padding: '80px' }}>
              <div className="flex flex-col items-center" style={{ gap: '16px' }}>
                <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#0066cc' }} />
                <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !shopDomain) {
    return (
      <div className="w-full flex flex-col items-center" style={{ padding: '32px', background: '#fafaf9', minHeight: '100vh' }}>
        <div className="w-full" style={{ maxWidth: '800px' }}>
          <Alert variant="destructive" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
            <AlertCircle className="h-4 w-4" style={{ color: '#cc0066' }} />
            <AlertTitle style={{ fontSize: '16px', fontWeight: 600, color: '#991b1b', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '4px' }}>Authentication Required</AlertTitle>
            <AlertDescription style={{ fontSize: '14px', color: '#991b1b', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
              Please access this page from your Shopify admin.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show loading while redirecting completed users
  if (interviewStatus === 'completed' && profile?.master_profile_text) {
    return (
      <div className="w-full flex flex-col items-center" style={{ padding: '32px', background: '#fafaf9', minHeight: '100vh' }}>
        <div className="w-full" style={{ maxWidth: '800px' }}>
          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent className="flex items-center justify-center" style={{ padding: '80px' }}>
              <div className="flex flex-col items-center" style={{ gap: '16px' }}>
                <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#0066cc' }} />
                <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Redirecting to settings...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Welcome screen
  if (messages.length === 0 && interviewStatus !== 'completed') {
    return (
      <div className="w-full flex flex-col items-center" style={{ padding: '32px', background: '#fafaf9', minHeight: '100vh' }}>
        <div className="w-full" style={{ maxWidth: '1000px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Business Profile</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Build your comprehensive business foundation</p>
          </div>

          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardHeader style={{ padding: '32px' }}>
              <div className="flex items-center" style={{ gap: '12px', marginBottom: '8px' }}>
                <CheckCircle className="h-5 w-5" style={{ color: '#0066cc' }} />
                <CardTitle style={{ fontSize: '24px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Welcome to Your Business Profile Interview</CardTitle>
              </div>
              <CardDescription style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '16px' }}>
                Choose how you'd like to build your business profile
              </CardDescription>

              <Alert style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <AlertCircle className="h-4 w-4" style={{ color: '#0066cc' }} />
                <AlertTitle style={{ fontSize: '16px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '4px' }}>How It Works</AlertTitle>
                <AlertDescription style={{ fontSize: '14px', color: '#001429', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: 1.5 }}>
                  I'll ask you questions about your business, customers, and goals.
                  Answer naturally - there are no wrong answers. The AI will synthesize your responses into a
                  comprehensive profile for ad generation.
                </AlertDescription>
              </Alert>

              <div style={{ background: 'rgba(243, 244, 246, 0.5)', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: 1.5 }}>
                  "Answer naturally and conversationally. Don't worry about being perfect - the goal is to capture
                  your authentic thoughts and business reality."
                </p>
              </div>
            </CardHeader>
            <CardContent style={{ padding: '32px', paddingTop: '0' }}>
              {/* Two column layout for options */}
              <div className="grid md:grid-cols-2" style={{ gap: '24px', marginBottom: '24px' }}>
                {/* Quick Start Option */}
                <Card className="relative" style={{ border: '2px solid #0066cc', background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.05) 0%, #ffffff 100%)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                  <div className="absolute" style={{ top: '-12px', right: '16px', background: '#0066cc', color: '#ffffff', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    RECOMMENDED
                  </div>
                  <CardHeader style={{ padding: '24px' }}>
                    <CardTitle style={{ fontSize: '20px', fontWeight: 700, color: '#0066cc', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '4px' }}>Quick Start</CardTitle>
                    <CardDescription style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>7 essential questions in ~5-7 minutes</CardDescription>
                  </CardHeader>
                  <CardContent style={{ padding: '0 24px 24px 24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      {[
                        'Perfect for running ads quickly',
                        'Captures core brand voice & customer insights',
                        'Can expand to full profile later',
                      ].map((item, i) => (
                        <div key={i} className="flex items-start" style={{ gap: '8px', marginBottom: '8px' }}>
                          <CheckCircle className="flex-shrink-0" style={{ width: '16px', height: '16px', color: '#0066cc', marginTop: '2px' }} />
                          <span style={{ fontSize: '14px', color: '#001429', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => startInterview('quick_start')}
                      disabled={isSubmitting}
                      style={{ background: '#0066cc', color: '#ffffff', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: 'pointer' }}
                    >
                      {isSubmitting ? 'Starting...' : 'Start Quick Interview'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Full Interview Option */}
                <Card style={{ border: '2px solid #e5e7eb', background: '#ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                  <CardHeader style={{ padding: '24px' }}>
                    <CardTitle style={{ fontSize: '20px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '4px' }}>Full Interview</CardTitle>
                    <CardDescription style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>19 comprehensive questions in ~15-20 minutes</CardDescription>
                  </CardHeader>
                  <CardContent style={{ padding: '0 24px 24px 24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#003366', marginBottom: '12px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>What You'll Create:</p>
                      {[
                        'Comprehensive Business Profile - Your complete story, positioning, and unique value',
                        'Ideal Customer Insights - Deep understanding of who you serve and their needs',
                        'Brand Voice Guidelines - How to communicate authentically across all channels',
                        'Strategic Foundation - Clear vision and messaging framework',
                      ].map((item, i) => (
                        <div key={i} className="flex items-start" style={{ gap: '8px', marginBottom: '8px' }}>
                          <CheckCircle className="flex-shrink-0" style={{ width: '16px', height: '16px', color: '#6b7280', marginTop: '2px' }} />
                          <span style={{ fontSize: '14px', color: '#001429', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => startInterview('full')}
                      disabled={isSubmitting}
                      style={{ background: '#ffffff', color: '#0066cc', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '2px solid #0066cc', cursor: 'pointer' }}
                    >
                      {isSubmitting ? 'Starting...' : 'Start Full Interview'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Interview in progress
  return (
    <div className="w-full flex flex-col items-center" style={{ padding: '32px', background: '#fafaf9', minHeight: '100vh' }}>
      <div className="w-full" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Brand Voice Interview</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent style={{ padding: '24px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <Badge variant="secondary" style={{ background: '#f3f4f6', color: '#003366', padding: '4px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  Question {currentPrompt?.question_number || 0} of {totalQuestions}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResetting}
                  style={{ background: '#ffffff', color: '#0066cc', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '2px solid #e5e7eb', cursor: 'pointer' }}
                >
                  {isResetting ? 'Resetting...' : 'Start Over'}
                </Button>
              </div>
              <Progress value={progress} style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{Math.round(progress)}% Complete</p>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
              <AlertCircle className="h-4 w-4" style={{ color: '#cc0066' }} />
              <AlertTitle style={{ fontSize: '16px', fontWeight: 600, color: '#991b1b', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '4px' }}>Error</AlertTitle>
              <AlertDescription style={{ fontSize: '14px', color: '#991b1b', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{error}</AlertDescription>
            </Alert>
          )}

          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ minHeight: '400px', maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex"
                    style={{ justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        background: msg.type === 'user' ? '#0066cc' : '#f3f4f6',
                        color: msg.type === 'user' ? '#ffffff' : '#001429',
                      }}
                    >
                      <p style={{ fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: 1.5 }}>{msg.content}</p>
                      <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isGeneratingProfile && (
                  <div className="flex" style={{ justifyContent: 'flex-start' }}>
                    <div className="flex items-center" style={{ background: '#f3f4f6', borderRadius: '8px', padding: '12px 16px', gap: '12px' }}>
                      <RefreshCw className="h-4 w-4 animate-spin" style={{ color: '#0066cc' }} />
                      <p style={{ fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#001429' }}>Generating your Business Profile...</p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {!isGeneratingProfile && currentPrompt && (
            <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <CardContent style={{ padding: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Label htmlFor="answer" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'block', marginBottom: '8px' }}>Your Answer</Label>
                  <Textarea
                    id="answer"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={5}
                    disabled={isSubmitting}
                    style={{ width: '100%', padding: '12px', fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', color: '#001429', lineHeight: 1.5 }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <span
                      style={{
                        color: wordCount < (currentPrompt.min_words || 0) ? '#cc0066' : '#6b7280',
                        fontWeight: wordCount < (currentPrompt.min_words || 0) ? 600 : 400
                      }}
                    >
                      {wordCount} words
                    </span>
                    {currentPrompt.min_words && (
                      <span style={{ marginLeft: '4px' }}>(minimum {currentPrompt.min_words})</span>
                    )}
                  </p>
                  <Button
                    onClick={submitAnswer}
                    disabled={isSubmitting || !currentInput.trim()}
                    style={{ background: isSubmitting || !currentInput.trim() ? '#e5e7eb' : '#0066cc', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: isSubmitting || !currentInput.trim() ? 'not-allowed' : 'pointer' }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Continue'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <DialogContent style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', padding: '32px' }}>
            <DialogHeader style={{ marginBottom: '24px' }}>
              <DialogTitle style={{ fontSize: '24px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '8px' }}>Reset Interview?</DialogTitle>
              <DialogDescription style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: 1.5 }}>
                This will delete all your current responses and restart the interview. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <Alert variant="destructive" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <AlertCircle className="h-4 w-4" style={{ color: '#cc0066' }} />
              <AlertTitle style={{ fontSize: '16px', fontWeight: 600, color: '#991b1b', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '4px' }}>Warning</AlertTitle>
              <AlertDescription style={{ fontSize: '14px', color: '#991b1b', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                You will lose all progress ({currentPrompt?.question_number || 0} questions completed). Are you sure?
              </AlertDescription>
            </Alert>
            <DialogFooter style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
                style={{ background: '#ffffff', color: '#0066cc', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '2px solid #e5e7eb', cursor: 'pointer' }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={isResetting}
                style={{ background: isResetting ? '#e5e7eb' : '#cc0066', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: isResetting ? 'not-allowed' : 'pointer' }}
              >
                {isResetting ? 'Resetting...' : 'Yes, Start Over'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
