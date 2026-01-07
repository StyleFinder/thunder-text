/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Lightbulb,
  Sparkles,
  ChevronRight,
  Shirt,
  Home,
  PawPrint,
  Smartphone,
  Baby,
  Dumbbell,
  Gem,
  UtensilsCrossed,
  Frame,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { colors } from "@/lib/design-system/colors";
import {
  getCategories,
  getPromptsForCategory,
  type PromptTemplate,
} from "@/lib/services/prompt-library";

/**
 * Map icon names to Lucide components
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Shirt,
  Sparkles,
  Home,
  PawPrint,
  Smartphone,
  Baby,
  Dumbbell,
  Gem,
  UtensilsCrossed,
  Frame,
};

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptLibrary({
  onSelectPrompt,
  disabled = false,
}: PromptLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [availablePrompts, setAvailablePrompts] = useState<PromptTemplate[]>(
    [],
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = getCategories();

  // Update available prompts when category changes
  useEffect(() => {
    if (selectedCategory) {
      const prompts = getPromptsForCategory(selectedCategory);
      setAvailablePrompts(prompts);
      setSelectedPromptId(""); // Reset prompt selection
    } else {
      setAvailablePrompts([]);
    }
  }, [selectedCategory]);

  const handleUsePrompt = () => {
    const prompt = availablePrompts.find((p) => p.id === selectedPromptId);
    if (prompt) {
      onSelectPrompt(prompt.prompt);
      // Reset selections after use
      setSelectedCategory("");
      setSelectedPromptId("");
      setIsExpanded(false);
    }
  };

  const selectedPrompt = availablePrompts.find(
    (p) => p.id === selectedPromptId,
  );

  // Helper to render icon from name
  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = ICON_MAP[iconName];
    if (IconComponent) {
      return (
        <IconComponent
          className={className || "w-4 h-4"}
          style={{ color: colors.smartBlue }}
        />
      );
    }
    return null;
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.white,
          color: colors.grayText,
        }}
      >
        <Lightbulb className="w-4 h-4" />
        <span>Need inspiration?</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="rounded-lg border p-4 space-y-4"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.backgroundLight,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: colors.smartBlue }} />
            <span
              className="text-sm font-medium"
              style={{ color: colors.oxfordNavy }}
            >
              Prompt Library
            </span>
          </div>
          <button
            onClick={() => {
              setIsExpanded(false);
              setSelectedCategory("");
              setSelectedPromptId("");
            }}
            className="text-xs hover:underline"
            style={{ color: colors.grayText }}
          >
            Close
          </button>
        </div>

        {/* Category Selector */}
        <div className="space-y-2">
          <label
            className="text-xs font-medium"
            style={{ color: colors.grayText }}
          >
            1. Choose a category
          </label>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    {renderIcon(category.icon)}
                    <span>{category.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt Selector - only shown after category is selected */}
        {selectedCategory && (
          <div className="space-y-2">
            <label
              className="text-xs font-medium"
              style={{ color: colors.grayText }}
            >
              2. Choose a prompt template
              <span
                className="ml-2 text-[10px] font-normal"
                style={{ color: colors.grayText }}
              >
                (hover to preview)
              </span>
            </label>
            <Select
              value={selectedPromptId}
              onValueChange={setSelectedPromptId}
              disabled={disabled || availablePrompts.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a prompt..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {availablePrompts.map((prompt) => (
                  <Tooltip key={prompt.id}>
                    <TooltipTrigger asChild>
                      <div>
                        <SelectItem value={prompt.id}>
                          <span className="flex items-center gap-2">
                            <Eye className="w-3 h-3 opacity-40" />
                            <span>{prompt.label}</span>
                          </span>
                        </SelectItem>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-[350px] p-3"
                      sideOffset={5}
                    >
                      <div className="space-y-2">
                        <p
                          className="font-medium text-xs"
                          style={{ color: colors.white }}
                        >
                          {prompt.label}
                        </p>
                        <p className="text-xs leading-relaxed opacity-90">
                          {prompt.prompt}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Prompt Preview - shows when a prompt is selected */}
        {selectedPrompt && (
          <div
            className="rounded-md p-3 space-y-2"
            style={{
              backgroundColor: colors.white,
              border: `1px solid ${colors.border}`,
            }}
          >
            <p
              className="text-xs font-medium"
              style={{ color: colors.grayText }}
            >
              Selected prompt:
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: colors.oxfordNavy }}
            >
              {selectedPrompt.prompt}
            </p>
          </div>
        )}

        {/* Use Button */}
        <Button
          onClick={handleUsePrompt}
          disabled={!selectedPromptId || disabled}
          className="w-full"
          style={{
            backgroundColor: selectedPromptId ? colors.smartBlue : undefined,
            color: selectedPromptId ? colors.white : undefined,
          }}
        >
          Use This Prompt
        </Button>
      </div>
    </TooltipProvider>
  );
}
