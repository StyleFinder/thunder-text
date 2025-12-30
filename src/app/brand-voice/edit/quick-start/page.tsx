'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, ArrowLeft, Loader2 } from 'lucide-react';
import type { BusinessProfileResponse, InterviewPrompt } from '@/types/business-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Quick Start prompt keys - these are the 12 essential questions for ad generation & AI coaches
// AI Coaching questions come FIRST (1-5), then brand voice questions (6-12)
const QUICK_START_PROMPT_KEYS = [
  // AI Coaching questions (1-5)
  'discount_comfort',
  'inventory_size',
  'time_availability',
  'quarterly_goal',
  'policies_summary',
  // Brand Voice questions (6-12)
  'business_description',
  'ideal_customer',
  'customer_pain_points',
  'brand_reputation',
  'competitors_differentiation',
  'client_results',
  'communication_style',
];

interface QuestionWithAnswer {
  prompt: InterviewPrompt;
  response: BusinessProfileResponse | null;
  isEditing: boolean;
  editedText: string;
  isSaving: boolean;
  isExpanded: boolean;
}

export default function EditQuickStartAnswersPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        logger.error('Failed to fetch shop:', e as Error, { component: 'quick-start' });
      }
    };
    initShop();
  }, []);

  // Load questions and answers
  useEffect(() => {
    if (!shopDomain) return;

    const loadData = async () => {
      try {
        // Fetch prompts and responses
        const [profileRes, promptsRes] = await Promise.all([
          fetch('/api/business-profile', {
            headers: { 'Authorization': `Bearer ${shopDomain}` },
          }),
          fetch('/api/business-profile/prompts', {
            headers: { 'Authorization': `Bearer ${shopDomain}` },
          }),
        ]);

        if (!profileRes.ok) {
          setError('Failed to load profile');
          setLoading(false);
          return;
        }

        const profileData = await profileRes.json();
        const responses: BusinessProfileResponse[] = profileData.data?.responses || [];

        // Get prompts
        let prompts: InterviewPrompt[] = [];
        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          prompts = promptsData.data?.prompts || [];
        }

        // If no prompts endpoint, fetch from all-prompts
        if (prompts.length === 0 && responses.length > 0) {
          const allPromptsRes = await fetch('/api/business-profile/all-prompts', {
            headers: { 'Authorization': `Bearer ${shopDomain}` },
          });
          if (allPromptsRes.ok) {
            const allPromptsData = await allPromptsRes.json();
            prompts = allPromptsData.data?.prompts || [];
          }
        }

        // Filter to only Quick Start questions
        const quickStartPrompts = prompts.filter((p) =>
          QUICK_START_PROMPT_KEYS.includes(p.prompt_key)
        );

        // Match responses to prompts
        const questionsWithAnswers: QuestionWithAnswer[] = quickStartPrompts.map((prompt) => {
          const response = responses.find((r) => r.prompt_key === prompt.prompt_key) || null;
          return {
            prompt,
            response,
            isEditing: false,
            editedText: response?.response_text || '',
            isSaving: false,
            isExpanded: false,
          };
        });

        // Sort by quick_start_order
        questionsWithAnswers.sort((a, b) => {
          const orderA = QUICK_START_PROMPT_KEYS.indexOf(a.prompt.prompt_key);
          const orderB = QUICK_START_PROMPT_KEYS.indexOf(b.prompt.prompt_key);
          return orderA - orderB;
        });

        setQuestions(questionsWithAnswers);
      } catch (err) {
        logger.error('Error loading data:', err as Error, { component: 'quick-start' });
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [shopDomain]);

  const toggleExpand = (index: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, isExpanded: !q.isExpanded } : q))
    );
  };

  const startEditing = (index: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, isEditing: true, isExpanded: true } : q
      )
    );
  };

  const cancelEditing = (index: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, isEditing: false, editedText: q.response?.response_text || '' }
          : q
      )
    );
  };

  const updateEditedText = (index: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, editedText: text } : q))
    );
    setHasChanges(true);
  };

  const saveAnswer = async (index: number) => {
    const question = questions[index];
    if (!question || !shopDomain) return;

    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, isSaving: true } : q))
    );

    try {
      const response = await fetch('/api/business-profile/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shopDomain}`,
        },
        body: JSON.stringify({
          prompt_key: question.prompt.prompt_key,
          question_number: question.prompt.question_number,
          response_text: question.editedText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQuestions((prev) =>
          prev.map((q, i) =>
            i === index
              ? {
                  ...q,
                  response: data.data.response,
                  isEditing: false,
                  isSaving: false,
                }
              : q
          )
        );
        setSuccessMessage(`Answer saved successfully`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to save answer');
      }
    } catch (err) {
      logger.error('Error saving answer:', err as Error, { component: 'quick-start' });
      setError('Failed to save answer');
    } finally {
      setQuestions((prev) =>
        prev.map((q, i) => (i === index ? { ...q, isSaving: false } : q))
      );
    }
  };

  const regenerateProfile = async () => {
    try {
      const response = await fetch('/api/business-profile/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${shopDomain}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        router.push('/brand-voice/profile');
      } else {
        setError(data.error || 'Failed to regenerate profile');
      }
    } catch (err) {
      logger.error('Error regenerating profile:', err as Error, { component: 'quick-start' });
      setError('Failed to regenerate profile');
    }
  };

  // Get friendly name for prompt key
  const getQuestionLabel = (promptKey: string): string => {
    const labels: Record<string, string> = {
      business_description: 'What You Do',
      ideal_customer: 'Your Ideal Customer',
      customer_pain_points: 'Customer Pain Points',
      brand_reputation: 'Desired Reputation',
      competitors_differentiation: 'What Makes You Different',
      client_results: 'Results & Proof',
      communication_style: 'Your Voice & Style',
    };
    return labels[promptKey] || promptKey;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Quick Start Answers</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const answeredCount = questions.filter((q) => q.response).length;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/brand-voice')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quick Start Answers</h1>
            <p className="text-muted-foreground mt-1">The 12 essential questions for ad generation & AI coaches</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/brand-voice/edit')}
            >
              Edit All Answers
            </Button>
            {hasChanges && (
              <Button onClick={regenerateProfile}>
                Regenerate Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-900">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Progress Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Quick Start Progress</h3>
              <p className="text-sm text-muted-foreground">
                These 12 questions capture the essential information for generating effective ads and enabling AI coaches.
              </p>
            </div>
            <Badge variant={answeredCount === 12 ? 'default' : 'secondary'}>
              {answeredCount} of 12 answered
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.prompt.prompt_key}>
            <Collapsible open={question.isExpanded} onOpenChange={() => toggleExpand(index)}>
              <CardHeader className="cursor-pointer">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={question.response ? 'default' : 'secondary'}>
                        {question.response ? 'Answered' : 'Not Answered'}
                      </Badge>
                      <CardTitle className="text-lg">
                        {index + 1}. {getQuestionLabel(question.prompt.prompt_key)}
                      </CardTitle>
                    </div>
                    {question.isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Question Text */}
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm">{question.prompt.question_text}</p>
                  </div>

                  {/* Editing Mode */}
                  {question.isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`answer-${index}`}>Your Answer</Label>
                        <Textarea
                          id={`answer-${index}`}
                          value={question.editedText}
                          onChange={(e) => updateEditedText(index, e.target.value)}
                          rows={6}
                          className="mt-1"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {question.editedText.trim().split(/\s+/).filter((w) => w.length > 0).length} words
                        {question.prompt.min_words && ` (minimum ${question.prompt.min_words})`}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => saveAnswer(index)}
                          disabled={question.isSaving}
                        >
                          {question.isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => cancelEditing(index)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {question.response ? (
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm">{question.response.response_text}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No answer provided yet</p>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => startEditing(index)}
                      >
                        {question.response ? 'Edit Answer' : 'Add Answer'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}
