'use client';

/**
 * QuestionCard Component
 *
 * Displays a single questionnaire question with clickable option buttons.
 * Used in the image generation chat flow to collect user preferences.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SkipForward, Pencil, Loader2 } from 'lucide-react';
import { colors } from '@/lib/design-system/colors';
import type { Question } from '@/types/image-generation';

interface QuestionCardProps {
  /** Question definition */
  question: Question;
  /** Current question number (1-based) */
  questionNumber: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Callback when user selects an answer - includes questionId for handling answer changes */
  onAnswer: (answerValue: string, answerLabel: string, isCustom: boolean, questionId: string) => void;
  /** Callback when user skips questionnaire */
  onSkip?: () => void;
  /** Whether to show skip button (first question only) */
  showSkip: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Whether options are currently loading (for dynamic questions) */
  isLoading?: boolean;
  /** The previously selected answer value for this question (to show selection state) */
  selectedAnswer?: string;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onSkip,
  showSkip,
  disabled = false,
  isLoading = false,
  selectedAnswer,
}: QuestionCardProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleOptionClick = (option: { value: string; label: string }) => {
    if (disabled) return;
    // Pass the question ID so the handler knows which question is being answered
    onAnswer(option.value, option.label, false, question.id);
  };

  const handleCustomSubmit = () => {
    if (disabled || !customValue.trim()) return;
    onAnswer(customValue.trim(), customValue.trim(), true, question.id);
    setCustomValue('');
    setShowCustomInput(false);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomValue('');
    }
  };

  return (
    <div className="space-y-3">
      {/* Progress indicator only - question text is shown in chat message */}
      <div className="flex items-center justify-end">
        <span
          className="text-xs"
          style={{ color: colors.grayText }}
        >
          {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Option buttons */}
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: colors.grayText }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading options...
            </div>
          ) : question.options.length === 0 ? (
            <div className="text-sm" style={{ color: colors.grayText }}>
              No preset options. Type your answer below.
            </div>
          ) : (
            question.options.map((option) => {
              const isSelected = selectedAnswer === option.value;
              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => handleOptionClick(option)}
                      className="h-auto py-2 px-3 transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        borderColor: isSelected ? colors.smartBlue : colors.border,
                        backgroundColor: isSelected ? `${colors.smartBlue}10` : colors.white,
                        borderWidth: isSelected ? '2px' : '1px',
                      }}
                    >
                      {option.icon && (
                        <span className="mr-1.5">{option.icon}</span>
                      )}
                      <span
                        className="text-xs font-medium"
                        style={{ color: isSelected ? colors.smartBlue : colors.oxfordNavy }}
                      >
                        {option.label}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  {option.description && (
                    <TooltipContent side="top" className="max-w-xs">
                      <p>{option.description}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })
          )}

          {/* Custom answer toggle button */}
          {question.allowCustom && !showCustomInput && (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setShowCustomInput(true)}
              className="h-auto py-2 px-3"
            >
              <Pencil className="w-3 h-3 mr-1.5" style={{ color: colors.grayText }} />
              <span
                className="text-xs"
                style={{ color: colors.grayText }}
              >
                Other...
              </span>
            </Button>
          )}
        </div>
      </TooltipProvider>

      {/* Custom input field */}
      {showCustomInput && (
        <div className="flex gap-2">
          <Input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder="Type your answer..."
            className="text-sm h-9"
            autoFocus
            disabled={disabled}
          />
          <Button
            size="sm"
            onClick={handleCustomSubmit}
            disabled={disabled || !customValue.trim()}
            style={{
              backgroundColor: colors.smartBlue,
              color: colors.white,
            }}
          >
            Done
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustomInput(false);
              setCustomValue('');
            }}
            disabled={disabled}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Skip option */}
      {showSkip && onSkip && (
        <div className="flex items-center pt-1">
          <button
            onClick={onSkip}
            disabled={disabled}
            className="text-xs flex items-center gap-1.5 hover:underline transition-opacity"
            style={{ color: colors.grayText }}
          >
            <SkipForward className="w-3 h-3" />
            Skip questions (answering helps get better results)
          </button>
        </div>
      )}
    </div>
  );
}
