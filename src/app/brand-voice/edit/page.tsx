'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import type { BusinessProfileResponse, InterviewPrompt } from '@/types/business-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface QuestionWithAnswer {
  prompt: InterviewPrompt;
  response: BusinessProfileResponse | null;
  isEditing: boolean;
  editedText: string;
  isSaving: boolean;
  isExpanded: boolean;
}

export default function EditAnswersPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showFinalResetConfirm, setShowFinalResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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
        logger.error('Failed to fetch shop:', e as Error, { component: 'edit' });
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

        // Get prompts - if endpoint doesn't exist, use responses to infer
        let prompts: InterviewPrompt[] = [];
        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          prompts = promptsData.data?.prompts || [];
        }

        // If no prompts endpoint, create from responses
        if (prompts.length === 0 && responses.length > 0) {
          // Fetch all prompts from the interview_prompts table via a simple query
          const allPromptsRes = await fetch('/api/business-profile/all-prompts', {
            headers: { 'Authorization': `Bearer ${shopDomain}` },
          });
          if (allPromptsRes.ok) {
            const allPromptsData = await allPromptsRes.json();
            prompts = allPromptsData.data?.prompts || [];
          }
        }

        // Match responses to prompts
        const questionsWithAnswers: QuestionWithAnswer[] = prompts.map((prompt) => {
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

        // Sort by question number
        questionsWithAnswers.sort((a, b) => a.prompt.question_number - b.prompt.question_number);

        setQuestions(questionsWithAnswers);
      } catch (err) {
        logger.error('Error loading data:', err as Error, { component: 'edit' });
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
        setSuccessMessage(`Answer ${question.prompt.question_number} saved successfully`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to save answer');
      }
    } catch (err) {
      logger.error('Error saving answer:', err as Error, { component: 'edit' });
      setError('Failed to save answer');
    } finally {
      setQuestions((prev) =>
        prev.map((q, i) => (i === index ? { ...q, isSaving: false } : q))
      );
    }
  };

  const handleFirstResetConfirm = () => {
    setShowResetConfirm(false);
    setShowFinalResetConfirm(true);
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
        setShowFinalResetConfirm(false);
        router.push('/brand-voice');
      } else {
        setError(data.error || 'Failed to reset interview');
      }
    } catch (err) {
      logger.error('Failed to reset interview:', err as Error, { component: 'edit' });
      setError('Failed to reset interview. Please try again.');
    } finally {
      setIsResetting(false);
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
      logger.error('Error regenerating profile:', err as Error, { component: 'edit' });
      setError('Failed to regenerate profile');
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Edit Answers</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
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
            <h1 className="text-3xl font-bold">Edit Your Answers</h1>
            <p className="text-muted-foreground mt-1">Review and modify your interview responses</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowResetConfirm(true)}
            >
              Start Over
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
          <AlertTriangle className="h-4 w-4" />
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
                        Question {question.prompt.question_number}
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

      {/* First Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Over?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your interview answers and your generated Business Profile.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="default" className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              You will need to complete the entire interview again from the beginning.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFirstResetConfirm}>
              Yes, I want to start over
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Reset Confirmation Dialog */}
      <Dialog open={showFinalResetConfirm} onOpenChange={setShowFinalResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>This action cannot be undone.</AlertTitle>
            <AlertDescription>
              All {questions.length} answers and your Business Profile will be permanently deleted.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Type "DELETE" below to confirm you want to erase everything and start over:
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalResetConfirm(false)}>
              No, keep my answers
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isResetting ? 'Deleting...' : 'Yes, delete everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
